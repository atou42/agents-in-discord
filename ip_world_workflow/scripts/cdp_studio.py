#!/usr/bin/env python3
"""Drive the shared Chrome (CDP 9225) to call Studio APIs from the logged-in page context.

Usage:
  cdp_studio.py eval '<js expression returning a promise or value>'

The JS runs in the neta.art tab, so fetch() carries the owner session cookies.
"""
import json
import sys
import urllib.request

import websocket

CDP = "http://127.0.0.1:9225"


def find_neta_tab():
    tabs = json.load(urllib.request.urlopen(f"{CDP}/json/list"))
    for t in tabs:
        if t.get("type") == "page" and "neta.art" in t.get("url", ""):
            return t
    raise SystemExit("no neta.art tab found in shared Chrome")


def evaluate(expr: str, timeout: float = 60.0):
    tab = find_neta_tab()
    ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=timeout)
    try:
        ws.send(json.dumps({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": expr,
                "awaitPromise": True,
                "returnByValue": True,
            },
        }))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == 1:
                return msg
    finally:
        ws.close()


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] != "eval":
        raise SystemExit(__doc__)
    result = evaluate(sys.argv[2])
    r = result.get("result", {})
    if "exceptionDetails" in r or "exceptionDetails" in result.get("result", {}):
        print(json.dumps(result, indent=2)[:3000])
        sys.exit(1)
    print(json.dumps(r.get("result", {}).get("value"), indent=2, ensure_ascii=False))
