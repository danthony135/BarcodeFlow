"""
BarcodeFlow Sync Agent — Windows Service Installer
===================================================
Installs the sync agent as a Windows Service so it starts automatically on boot.

Usage:
    python install_service.py install    — Install the service
    python install_service.py start      — Start the service
    python install_service.py stop       — Stop the service
    python install_service.py remove     — Remove the service
    python install_service.py status     — Check service status

Requires: pywin32 (pip install pywin32)
"""

import os
import sys
import subprocess
from pathlib import Path

SERVICE_NAME = "BarcodeFlowSync"
SERVICE_DISPLAY = "BarcodeFlow Sync Agent"
SERVICE_DESCRIPTION = (
    "Syncs barcode and PO data between BarcodeFlow (cloud) and "
    "RETAILvantage (Pervasive SQL on-prem)."
)

AGENT_DIR = Path(__file__).parent.resolve()
AGENT_SCRIPT = AGENT_DIR / "agent.py"


def find_python() -> str:
    """Find the Python executable, preferring the current venv."""
    # If running in a venv, use that Python
    venv_python = AGENT_DIR / "venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        return str(venv_python)
    return sys.executable


def check_pywin32():
    """Ensure pywin32 is installed."""
    try:
        import win32serviceutil  # noqa: F401
        return True
    except ImportError:
        print("ERROR: pywin32 is required to install as a Windows Service.")
        print("Install it with: pip install pywin32")
        print("Then run: python Scripts/pywin32_postinstall.py -install")
        return False


def install_service():
    """Install the Windows Service using sc.exe."""
    python_exe = find_python()
    bin_path = f'"{python_exe}" "{AGENT_SCRIPT}"'

    print(f"Installing service '{SERVICE_NAME}'...")
    print(f"  Python:  {python_exe}")
    print(f"  Script:  {AGENT_SCRIPT}")
    print(f"  BinPath: {bin_path}")
    print()

    # Use NSSM (Non-Sucking Service Manager) approach for reliability
    # First check if nssm is available
    nssm_path = AGENT_DIR / "nssm.exe"
    if nssm_path.exists():
        _install_with_nssm(str(nssm_path), python_exe)
        return

    # Try sc.exe as fallback
    _install_with_sc(python_exe)


def _install_with_nssm(nssm: str, python_exe: str):
    """Install service using NSSM for better Python process management."""
    cmds = [
        [nssm, "install", SERVICE_NAME, python_exe, str(AGENT_SCRIPT)],
        [nssm, "set", SERVICE_NAME, "DisplayName", SERVICE_DISPLAY],
        [nssm, "set", SERVICE_NAME, "Description", SERVICE_DESCRIPTION],
        [nssm, "set", SERVICE_NAME, "AppDirectory", str(AGENT_DIR)],
        [nssm, "set", SERVICE_NAME, "Start", "SERVICE_AUTO_START"],
        [nssm, "set", SERVICE_NAME, "AppStdout", str(AGENT_DIR / "service-stdout.log")],
        [nssm, "set", SERVICE_NAME, "AppStderr", str(AGENT_DIR / "service-stderr.log")],
        [nssm, "set", SERVICE_NAME, "AppRotateFiles", "1"],
        [nssm, "set", SERVICE_NAME, "AppRotateBytes", "5242880"],  # 5 MB
    ]

    for cmd in cmds:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0 and "already exists" not in result.stderr:
            print(f"  Warning: {' '.join(cmd)}")
            print(f"    {result.stderr.strip()}")

    print(f"Service '{SERVICE_NAME}' installed via NSSM.")
    print(f"Start it with: {nssm} start {SERVICE_NAME}")
    print(f"Or run: python install_service.py start")


def _install_with_sc(python_exe: str):
    """Install service using sc.exe (requires the agent to handle service protocol or use pythonservice.exe)."""
    print("Note: For best results, download nssm.exe and place it in the sync-agent/ folder.")
    print("      https://nssm.cc/download")
    print()

    if not check_pywin32():
        return

    # Use pywin32's service framework
    try:
        import win32serviceutil
        import win32service
        import servicemanager

        # Create a minimal service wrapper
        service_wrapper = AGENT_DIR / "_service_wrapper.py"
        service_wrapper.write_text(
            f'''"""Auto-generated Windows Service wrapper for BarcodeFlow Sync Agent."""
import sys
import os
sys.path.insert(0, r"{AGENT_DIR}")
os.chdir(r"{AGENT_DIR}")

import win32serviceutil
import win32service
import win32event
import servicemanager
import agent


class BarcodeFlowSyncService(win32serviceutil.ServiceFramework):
    _svc_name_ = "{SERVICE_NAME}"
    _svc_display_name_ = "{SERVICE_DISPLAY}"
    _svc_description_ = """{SERVICE_DESCRIPTION}"""

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        agent._shutdown = True
        win32event.SetEvent(self.stop_event)

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, ""),
        )
        agent.main()


if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(BarcodeFlowSyncService)
''',
            encoding="utf-8",
        )

        print(f"Created service wrapper: {service_wrapper}")
        print()

        # Install via pywin32
        result = subprocess.run(
            [python_exe, str(service_wrapper), "install"],
            capture_output=True,
            text=True,
        )
        print(result.stdout)
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
        else:
            # Set to auto-start
            subprocess.run(
                ["sc", "config", SERVICE_NAME, "start=", "auto"],
                capture_output=True,
            )
            print(f"Service '{SERVICE_NAME}' installed and set to auto-start.")

    except Exception as e:
        print(f"Error installing service: {e}")
        print()
        print("Alternative: Run the agent manually or as a scheduled task.")
        print(f'  python "{AGENT_SCRIPT}"')


def start_service():
    """Start the service."""
    print(f"Starting service '{SERVICE_NAME}'...")
    result = subprocess.run(["sc", "start", SERVICE_NAME], capture_output=True, text=True)
    print(result.stdout or result.stderr)


def stop_service():
    """Stop the service."""
    print(f"Stopping service '{SERVICE_NAME}'...")
    result = subprocess.run(["sc", "stop", SERVICE_NAME], capture_output=True, text=True)
    print(result.stdout or result.stderr)


def remove_service():
    """Remove the service."""
    stop_service()
    print(f"Removing service '{SERVICE_NAME}'...")

    # Try NSSM first
    nssm_path = AGENT_DIR / "nssm.exe"
    if nssm_path.exists():
        result = subprocess.run(
            [str(nssm_path), "remove", SERVICE_NAME, "confirm"],
            capture_output=True,
            text=True,
        )
    else:
        result = subprocess.run(
            ["sc", "delete", SERVICE_NAME], capture_output=True, text=True
        )
    print(result.stdout or result.stderr)


def service_status():
    """Check service status."""
    result = subprocess.run(
        ["sc", "query", SERVICE_NAME], capture_output=True, text=True
    )
    print(result.stdout or result.stderr)


def main():
    if len(sys.argv) < 2:
        print("BarcodeFlow Sync Agent — Windows Service Installer")
        print()
        print("Usage:")
        print("  python install_service.py install  — Install the service")
        print("  python install_service.py start    — Start the service")
        print("  python install_service.py stop     — Stop the service")
        print("  python install_service.py remove   — Remove the service")
        print("  python install_service.py status   — Check service status")
        return

    command = sys.argv[1].lower()
    commands = {
        "install": install_service,
        "start": start_service,
        "stop": stop_service,
        "remove": remove_service,
        "status": service_status,
    }

    if command in commands:
        commands[command]()
    else:
        print(f"Unknown command: {command}")
        print("Valid commands: install, start, stop, remove, status")


if __name__ == "__main__":
    main()
