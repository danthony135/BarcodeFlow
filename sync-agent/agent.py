"""
BarcodeFlow Sync Agent
======================
Runs on the on-prem Windows server alongside RETAILvantage / Pervasive SQL.
Pulls PO data from Pervasive into BarcodeFlow cloud, and pushes generated
barcode numbers back into the ITEM table so RETAILvantage knows each item's barcode.
"""

import logging
import os
import signal
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx
import pyodbc
import schedule
from dotenv import dotenv_values

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CONFIG_PATH = Path(__file__).parent / "config.env"

if not CONFIG_PATH.exists():
    print(f"ERROR: config.env not found at {CONFIG_PATH}")
    print("Copy config.env.example to config.env and fill in your values.")
    sys.exit(1)

cfg = dotenv_values(CONFIG_PATH)

ODBC_DSN = cfg.get("ODBC_DSN", "RETAILvantage")
ODBC_CONNECTION_STRING = cfg.get("ODBC_CONNECTION_STRING", "")
BARCODEFLOW_URL = cfg.get("BARCODEFLOW_URL", "https://barcodeflow.up.railway.app").rstrip("/")
BARCODEFLOW_API_KEY = cfg.get("BARCODEFLOW_API_KEY", "")
SYNC_PULL_INTERVAL = int(cfg.get("SYNC_PULL_INTERVAL", "300"))
SYNC_PUSH_INTERVAL = int(cfg.get("SYNC_PUSH_INTERVAL", "120"))
LOG_LEVEL = cfg.get("LOG_LEVEL", "INFO").upper()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_FILE = Path(__file__).parent / "sync-agent.log"

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("BarcodeFlowSync")

# ---------------------------------------------------------------------------
# Graceful shutdown
# ---------------------------------------------------------------------------

_shutdown = False


def _handle_signal(signum, _frame):
    global _shutdown
    log.info("Received signal %s — shutting down gracefully...", signum)
    _shutdown = True


signal.signal(signal.SIGINT, _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)

# ---------------------------------------------------------------------------
# ODBC helpers
# ---------------------------------------------------------------------------

# COBOL-style field name → Python-friendly name mapping
PO_FIELD_MAP = {
    "PO-NUM": "poNumber",
    "PO-VEND-ID": "vendorId",
    "PO-VEND-NAME": "vendorName",
    "PO-STATUS": "status",
    "PO-DATE": "poDate",
    "PO-EXP-DATE": "expectedDate",
}

PO_DTL_FIELD_MAP = {
    "PO-NUM": "poNumber",
    "ITEM-NUM": "sku",
    "ITEM-DESC1": "description",
    "PO-DTL-QTY-ORD": "qtyOrdered",
    "PO-DTL-QTY-REC": "qtyReceived",
    "ITEM-COST": "itemCost",
    "ITEM-UPC": "barcode",
}

ITEM_BARCODE_FIELD = "ITEM-UPC"  # The field in ITEM table to write barcodes to


def get_odbc_connection() -> pyodbc.Connection:
    """Open an ODBC connection to Pervasive SQL."""
    if ODBC_CONNECTION_STRING:
        return pyodbc.connect(ODBC_CONNECTION_STRING)
    return pyodbc.connect(f"DSN={ODBC_DSN}")


def _rows_to_dicts(cursor, field_map: dict) -> list[dict]:
    """Convert cursor rows to list of dicts using a field mapping."""
    columns = [desc[0] for desc in cursor.description]
    results = []
    for row in cursor.fetchall():
        record = {}
        for i, col in enumerate(columns):
            mapped = field_map.get(col, col)
            value = row[i]
            # Convert dates/datetimes to ISO strings
            if isinstance(value, datetime):
                value = value.isoformat()
            # Strip trailing whitespace from COBOL fixed-width strings
            if isinstance(value, str):
                value = value.strip()
            record[mapped] = value
        results.append(record)
    return results


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------

def _api_headers() -> dict:
    return {
        "x-api-key": BARCODEFLOW_API_KEY,
        "Content-Type": "application/json",
    }


def _api_client() -> httpx.Client:
    return httpx.Client(
        base_url=BARCODEFLOW_URL,
        headers=_api_headers(),
        timeout=30.0,
    )


# ---------------------------------------------------------------------------
# Sync tasks
# ---------------------------------------------------------------------------

def pull_pos():
    """Pull PO and PO_DTL from Pervasive SQL, POST to BarcodeFlow cloud."""
    log.info("pull_pos: starting PO sync from Pervasive...")
    try:
        conn = get_odbc_connection()
        cursor = conn.cursor()

        # Fetch PO headers
        cursor.execute(
            'SELECT "PO-NUM", "PO-VEND-ID", "PO-VEND-NAME", "PO-STATUS", '
            '"PO-DATE", "PO-EXP-DATE" FROM PO '
            'WHERE "PO-STATUS" NOT IN (\'C\', \'X\') '
            "ORDER BY \"PO-NUM\" DESC"
        )
        po_headers = _rows_to_dicts(cursor, PO_FIELD_MAP)
        log.info("pull_pos: fetched %d PO headers", len(po_headers))

        # Fetch PO detail lines for open POs
        po_numbers = [po["poNumber"] for po in po_headers]
        if po_numbers:
            placeholders = ", ".join(["?"] * len(po_numbers))
            cursor.execute(
                f'SELECT "PO-NUM", "ITEM-NUM", "ITEM-DESC1", '
                f'"PO-DTL-QTY-ORD", "PO-DTL-QTY-REC", "ITEM-COST", "ITEM-UPC" '
                f"FROM PO_DTL "
                f'WHERE "PO-NUM" IN ({placeholders}) '
                f'ORDER BY "PO-NUM", "ITEM-NUM"',
                po_numbers,
            )
            po_lines = _rows_to_dicts(cursor, PO_DTL_FIELD_MAP)
            log.info("pull_pos: fetched %d PO detail lines", len(po_lines))
        else:
            po_lines = []

        conn.close()

        # POST to BarcodeFlow API
        payload = {"pos": po_headers, "lines": po_lines}
        with _api_client() as client:
            resp = client.post("/api/sync/pos", json=payload)
            resp.raise_for_status()
            result = resp.json()
            log.info(
                "pull_pos: synced %d POs, %d lines -> %s",
                len(po_headers),
                len(po_lines),
                result.get("message", "OK"),
            )

    except pyodbc.Error as e:
        log.error("pull_pos: ODBC error: %s", e)
    except httpx.HTTPError as e:
        log.error("pull_pos: HTTP error: %s", e)
    except Exception as e:
        log.exception("pull_pos: unexpected error: %s", e)


def push_scans():
    """
    GET pending scans from BarcodeFlow that have generated barcodes.
    Write the barcode number back to the ITEM record in Pervasive SQL,
    then confirm back to BarcodeFlow.
    """
    log.info("push_scans: checking for pending scan barcodes to write back...")
    try:
        with _api_client() as client:
            resp = client.get("/api/sync/scans/pending")
            resp.raise_for_status()
            data = resp.json()

        scans = data.get("scans", [])
        if not scans:
            log.info("push_scans: no pending scans")
            return

        log.info("push_scans: %d pending scans to process", len(scans))

        confirmed_ids: list[str] = []
        failed_ids: list[str] = []
        error_msg = ""

        conn = get_odbc_connection()
        cursor = conn.cursor()

        for scan in scans:
            scan_id = scan["id"]
            barcode = scan.get("barcode")
            sku = scan.get("sku")

            if not barcode or not sku:
                log.warning(
                    "push_scans: scan %s missing barcode or sku, skipping", scan_id
                )
                failed_ids.append(scan_id)
                error_msg = "Missing barcode or sku"
                continue

            try:
                cursor.execute(
                    f'UPDATE ITEM SET "{ITEM_BARCODE_FIELD}" = ? WHERE "ITEM-NUM" = ?',
                    barcode,
                    sku,
                )
                if cursor.rowcount > 0:
                    conn.commit()
                    confirmed_ids.append(scan_id)
                    log.info(
                        "push_scans: wrote barcode %s to item %s", barcode, sku
                    )
                else:
                    log.warning(
                        "push_scans: item %s not found in Pervasive, barcode %s",
                        sku,
                        barcode,
                    )
                    failed_ids.append(scan_id)
                    error_msg = f"Item {sku} not found in Pervasive"
            except pyodbc.Error as e:
                log.error("push_scans: ODBC error for scan %s: %s", scan_id, e)
                failed_ids.append(scan_id)
                error_msg = str(e)
                conn.rollback()

        conn.close()

        # Confirm successful writes back to BarcodeFlow
        with _api_client() as client:
            if confirmed_ids:
                resp = client.post(
                    "/api/sync/scans/confirm",
                    json={"scanIds": confirmed_ids, "status": "CONFIRMED"},
                )
                resp.raise_for_status()
                log.info("push_scans: confirmed %d scans", len(confirmed_ids))

            if failed_ids:
                resp = client.post(
                    "/api/sync/scans/confirm",
                    json={
                        "scanIds": failed_ids,
                        "status": "FAILED",
                        "error": error_msg,
                    },
                )
                resp.raise_for_status()
                log.info("push_scans: reported %d failed scans", len(failed_ids))

    except httpx.HTTPError as e:
        log.error("push_scans: HTTP error: %s", e)
    except Exception as e:
        log.exception("push_scans: unexpected error: %s", e)


def push_labels():
    """
    GET labels pending sync from BarcodeFlow.
    Write the generated barcode number to the ITEM record in Pervasive SQL,
    then confirm back to BarcodeFlow.
    """
    log.info("push_labels: checking for pending labels to write back...")
    try:
        with _api_client() as client:
            resp = client.get("/api/sync/labels/pending")
            resp.raise_for_status()
            data = resp.json()

        labels = data.get("labels", [])
        if not labels:
            log.info("push_labels: no pending labels")
            return

        log.info("push_labels: %d pending labels to process", len(labels))

        confirmed_ids: list[str] = []
        failed_ids: list[str] = []

        conn = get_odbc_connection()
        cursor = conn.cursor()

        for label in labels:
            label_id = label["id"]
            barcode = label.get("barcode")
            sku = label.get("sku")

            if not barcode or not sku:
                log.warning(
                    "push_labels: label %s missing barcode or sku, skipping", label_id
                )
                failed_ids.append(label_id)
                continue

            try:
                cursor.execute(
                    f'UPDATE ITEM SET "{ITEM_BARCODE_FIELD}" = ? WHERE "ITEM-NUM" = ?',
                    barcode,
                    sku,
                )
                if cursor.rowcount > 0:
                    conn.commit()
                    confirmed_ids.append(label_id)
                    log.info(
                        "push_labels: wrote barcode %s to item %s", barcode, sku
                    )
                else:
                    log.warning(
                        "push_labels: item %s not found in Pervasive", sku
                    )
                    failed_ids.append(label_id)
            except pyodbc.Error as e:
                log.error("push_labels: ODBC error for label %s: %s", label_id, e)
                failed_ids.append(label_id)
                conn.rollback()

        conn.close()

        # Confirm back to BarcodeFlow via scan confirm endpoint
        with _api_client() as client:
            if confirmed_ids:
                resp = client.post(
                    "/api/sync/scans/confirm",
                    json={"scanIds": confirmed_ids, "status": "CONFIRMED"},
                )
                resp.raise_for_status()
                log.info("push_labels: confirmed %d labels", len(confirmed_ids))

            if failed_ids:
                resp = client.post(
                    "/api/sync/scans/confirm",
                    json={
                        "scanIds": failed_ids,
                        "status": "FAILED",
                        "error": "Item not found or ODBC error",
                    },
                )
                resp.raise_for_status()
                log.info("push_labels: reported %d failed labels", len(failed_ids))

    except httpx.HTTPError as e:
        log.error("push_labels: HTTP error: %s", e)
    except Exception as e:
        log.exception("push_labels: unexpected error: %s", e)


def health_check():
    """Log a health status summary."""
    log.info(
        "health_check: agent running | pull_interval=%ds | push_interval=%ds | target=%s",
        SYNC_PULL_INTERVAL,
        SYNC_PUSH_INTERVAL,
        BARCODEFLOW_URL,
    )
    try:
        conn = get_odbc_connection()
        conn.close()
        log.info("health_check: Pervasive SQL connection OK")
    except Exception as e:
        log.error("health_check: Pervasive SQL connection FAILED: %s", e)

    try:
        with _api_client() as client:
            resp = client.get("/api/sync/status")
            if resp.status_code == 200:
                log.info("health_check: BarcodeFlow API connection OK")
            else:
                log.warning(
                    "health_check: BarcodeFlow API returned status %d", resp.status_code
                )
    except Exception as e:
        log.error("health_check: BarcodeFlow API connection FAILED: %s", e)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main():
    log.info("=" * 60)
    log.info("BarcodeFlow Sync Agent starting")
    log.info("  Target:         %s", BARCODEFLOW_URL)
    log.info("  ODBC DSN:       %s", ODBC_DSN if not ODBC_CONNECTION_STRING else "(connection string)")
    log.info("  Pull interval:  %ds", SYNC_PULL_INTERVAL)
    log.info("  Push interval:  %ds", SYNC_PUSH_INTERVAL)
    log.info("=" * 60)

    # Run initial health check
    health_check()

    # Schedule recurring tasks
    schedule.every(SYNC_PULL_INTERVAL).seconds.do(pull_pos)
    schedule.every(SYNC_PUSH_INTERVAL).seconds.do(push_scans)
    schedule.every(SYNC_PUSH_INTERVAL).seconds.do(push_labels)
    schedule.every(600).seconds.do(health_check)  # Health check every 10 min

    # Run an initial pull immediately
    pull_pos()

    log.info("Scheduler started. Press Ctrl+C to stop.")

    while not _shutdown:
        schedule.run_pending()
        time.sleep(1)

    log.info("BarcodeFlow Sync Agent stopped.")


if __name__ == "__main__":
    main()
