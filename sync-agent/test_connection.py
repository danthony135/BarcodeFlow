"""
BarcodeFlow Sync Agent — Connection Test
=========================================
Tests ODBC connection to Pervasive SQL and HTTP connection to BarcodeFlow API.

Usage:
    python test_connection.py
"""

import sys
from pathlib import Path

from dotenv import dotenv_values

CONFIG_PATH = Path(__file__).parent / "config.env"

if not CONFIG_PATH.exists():
    print("ERROR: config.env not found.")
    print("Copy config.env.example to config.env and fill in your values.")
    sys.exit(1)

cfg = dotenv_values(CONFIG_PATH)

ODBC_DSN = cfg.get("ODBC_DSN", "RETAILvantage")
ODBC_CONNECTION_STRING = cfg.get("ODBC_CONNECTION_STRING", "")
BARCODEFLOW_URL = cfg.get("BARCODEFLOW_URL", "https://barcodeflow.up.railway.app").rstrip("/")
BARCODEFLOW_API_KEY = cfg.get("BARCODEFLOW_API_KEY", "")


def test_separator(title: str):
    print()
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)
    print()


def test_odbc():
    """Test ODBC connection to Pervasive SQL."""
    test_separator("ODBC / Pervasive SQL Connection Test")

    try:
        import pyodbc
    except ImportError:
        print("FAIL: pyodbc not installed. Run: pip install pyodbc")
        return False

    # List available ODBC drivers
    print("Available ODBC drivers:")
    drivers = pyodbc.drivers()
    if drivers:
        for d in drivers:
            marker = " <--" if "pervasive" in d.lower() else ""
            print(f"  - {d}{marker}")
    else:
        print("  (none found)")
    print()

    # List available DSNs
    print("Available DSNs:")
    dsns = pyodbc.dataSources()
    if dsns:
        for name, driver in dsns.items():
            marker = " <--" if name.lower() == ODBC_DSN.lower() else ""
            print(f"  - {name} ({driver}){marker}")
    else:
        print("  (none found)")
    print()

    # Try connecting
    conn_str = ODBC_CONNECTION_STRING if ODBC_CONNECTION_STRING else f"DSN={ODBC_DSN}"
    print(f"Connecting with: {conn_str[:60]}...")
    try:
        conn = pyodbc.connect(conn_str)
        print("OK: Connected to Pervasive SQL!")
        print()

        cursor = conn.cursor()

        # List tables
        print("Available tables:")
        tables = cursor.tables(tableType="TABLE").fetchall()
        if tables:
            for t in tables[:30]:
                print(f"  - {t.table_name}")
            if len(tables) > 30:
                print(f"  ... and {len(tables) - 30} more")
        else:
            print("  (no tables found — check database/permissions)")
        print()

        # Try a simple query on common RETAILvantage tables
        for table_name in ["ITEM", "PO", "PO_DTL", "VEND", "CUST"]:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"  {table_name}: {count} rows")
            except pyodbc.Error:
                print(f"  {table_name}: (not accessible)")

        conn.close()
        print()
        print("PASS: Pervasive SQL connection test passed.")
        return True

    except pyodbc.Error as e:
        print(f"FAIL: Could not connect to Pervasive SQL")
        print(f"  Error: {e}")
        print()
        print("Troubleshooting:")
        print("  1. Check that Pervasive ODBC driver is installed")
        print("  2. Verify the DSN name in ODBC Data Sources (64-bit)")
        print("  3. Ensure the Pervasive/Zen database engine is running")
        print("  4. Check firewall rules if connecting to a remote server")
        return False


def test_barcodeflow():
    """Test HTTP connection to BarcodeFlow API."""
    test_separator("BarcodeFlow API Connection Test")

    try:
        import httpx
    except ImportError:
        print("FAIL: httpx not installed. Run: pip install httpx")
        return False

    print(f"Target URL: {BARCODEFLOW_URL}")
    print(f"API Key:    {BARCODEFLOW_API_KEY[:8]}..." if len(BARCODEFLOW_API_KEY) > 8 else f"API Key: {BARCODEFLOW_API_KEY}")
    print()

    if not BARCODEFLOW_API_KEY or BARCODEFLOW_API_KEY == "your-api-key-here":
        print("WARNING: API key not configured. Set BARCODEFLOW_API_KEY in config.env")
        print()

    try:
        with httpx.Client(timeout=10.0) as client:
            # Test basic connectivity
            print("Testing connectivity...")
            resp = client.get(f"{BARCODEFLOW_URL}/api/sync/status", headers={
                "x-api-key": BARCODEFLOW_API_KEY,
            })

            print(f"  Status code: {resp.status_code}")

            if resp.status_code == 200:
                data = resp.json()
                print(f"  Response: {data}")
                print()
                print("PASS: BarcodeFlow API connection test passed.")
                return True
            elif resp.status_code == 401:
                print("  Authentication failed — check your API key.")
                print()
                print("FAIL: Invalid API key.")
                return False
            else:
                print(f"  Unexpected response: {resp.text[:200]}")
                print()
                print("FAIL: Unexpected status code.")
                return False

    except httpx.ConnectError as e:
        print(f"FAIL: Could not connect to BarcodeFlow API")
        print(f"  Error: {e}")
        print()
        print("Troubleshooting:")
        print("  1. Check that the URL is correct")
        print("  2. Verify internet/network connectivity")
        print("  3. If using Cloudflare Tunnel, ensure it's running")
        return False
    except Exception as e:
        print(f"FAIL: {e}")
        return False


def main():
    print("BarcodeFlow Sync Agent — Connection Test")
    print(f"Config: {CONFIG_PATH}")

    odbc_ok = test_odbc()
    api_ok = test_barcodeflow()

    test_separator("Summary")
    print(f"  Pervasive SQL:    {'PASS' if odbc_ok else 'FAIL'}")
    print(f"  BarcodeFlow API:  {'PASS' if api_ok else 'FAIL'}")
    print()

    if odbc_ok and api_ok:
        print("All tests passed! The sync agent is ready to run.")
        print("  python agent.py")
    elif odbc_ok:
        print("Pervasive SQL is working, but the BarcodeFlow API connection needs fixing.")
    elif api_ok:
        print("BarcodeFlow API is working, but the Pervasive SQL connection needs fixing.")
    else:
        print("Both connections need fixing before the sync agent can run.")

    return 0 if (odbc_ok and api_ok) else 1


if __name__ == "__main__":
    sys.exit(main())
