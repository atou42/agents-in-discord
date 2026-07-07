#!/usr/bin/env python3
"""Drive the shared Chrome (CDP 9225) to call Studio APIs from the logged-in page context.

Commands:
  eval '<js>'              Evaluate a JS expression in the neta.art tab.
  refresh-token <worldId>  POST /cohub-runtime/env to inject fresh NETA_TOKEN into
                           the world's bound Cohub space. Prints the written keys.
                           No human interaction required — the script reuses the
                           existing logged-in Chrome session.
  screenshot <worldId> <outPath>
                           Navigate a new tab to the world's Studio page, wait for
                           the canvas to settle, take a full-page screenshot, save
                           to <outPath> (PNG), close the tab.
  create-world <name>      POST /api/worlds and open the Studio page to trigger lazy
                           space provisioning. Polls until spaceId is present.
                           Prints JSON: {worldId, spaceId, studioUrl, cohubUrl}.
"""
import base64
import json
import sys
import time
import urllib.parse
import urllib.request

import websocket

CDP = "http://127.0.0.1:9225"
STUDIO_BASE = "https://neta.art"
SETTLE_S = 8   # seconds to wait for canvas after navigation


# ── helpers ──────────────────────────────────────────────────────────────────

def _open_tab(url: str) -> dict:
    req = urllib.request.Request(
        f"{CDP}/json/new?" + urllib.parse.quote(url, safe=""), method="PUT"
    )
    return json.load(urllib.request.urlopen(req))


def _close_tab(tab_id: str):
    try:
        urllib.request.urlopen(urllib.request.Request(
            f"{CDP}/json/close/{tab_id}"
        ))
    except Exception:
        pass


def _find_neta_tab(must_exist: bool = True) -> dict | None:
    tabs = json.load(urllib.request.urlopen(f"{CDP}/json/list"))
    for t in tabs:
        if t.get("type") == "page" and "neta.art" in t.get("url", ""):
            return t
    if must_exist:
        raise SystemExit("no neta.art tab found in shared Chrome")
    return None


def _evaluate(tab: dict, expr: str, timeout: float = 90.0):
    ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=timeout)
    try:
        ws.send(json.dumps({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {"expression": expr, "awaitPromise": True, "returnByValue": True},
        }))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == 1:
                return msg
    finally:
        ws.close()


def _cdp(tab: dict, method: str, params: dict, timeout: float = 90.0):
    ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=timeout)
    try:
        ws.send(json.dumps({"id": 1, "method": method, "params": params}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == 1:
                return msg.get("result", {})
    finally:
        ws.close()


def _eval_value(tab: dict, expr: str, timeout: float = 90.0):
    result = _evaluate(tab, expr, timeout)
    r = result.get("result", {})
    if "exceptionDetails" in result or r.get("subtype") == "error":
        raise RuntimeError(json.dumps(result)[:800])
    return r.get("result", {}).get("value")


# ── commands ─────────────────────────────────────────────────────────────────

def cmd_eval(expr: str):
    tab = _find_neta_tab()
    result = _evaluate(tab, expr)
    r = result.get("result", {})
    if "exceptionDetails" in result or r.get("subtype") == "error":
        print(json.dumps(result, indent=2)[:3000])
        sys.exit(1)
    print(json.dumps(r.get("result", {}).get("value"), indent=2, ensure_ascii=False))


def cmd_refresh_token(world_id: str):
    """POST cohub-runtime/env from the owner session. No human action needed."""
    tab = _find_neta_tab()
    expr = f"""fetch('/api/worlds/{world_id}/cohub-runtime/env', {{method:'POST'}}).then(r=>r.json())"""
    val = _eval_value(tab, expr)
    if not (isinstance(val, dict) and val.get("ok")):
        raise SystemExit(f"refresh-token failed: {val}")
    print(json.dumps(val, indent=2))


def cmd_screenshot(world_id: str, out_path: str):
    """Open a new Studio tab, wait for canvas, take screenshot, close tab."""
    url = f"{STUDIO_BASE}/world/{world_id}/studio?mode=canvas"
    tab = _open_tab(url)
    tab_id = tab["id"]
    try:
        time.sleep(SETTLE_S)
        # re-fetch tab to get fresh webSocketDebuggerUrl
        tabs = json.load(urllib.request.urlopen(f"{CDP}/json/list"))
        live = next((t for t in tabs if t["id"] == tab_id), None)
        if not live:
            raise SystemExit(f"tab {tab_id} disappeared before screenshot")
        result = _cdp(live, "Page.captureScreenshot",
                      {"format": "png", "captureBeyondViewport": True})
        data = result.get("data")
        if not data:
            raise SystemExit(f"Page.captureScreenshot returned no data: {result}")
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(data))
        print(json.dumps({"saved": out_path, "worldId": world_id}))
    finally:
        _close_tab(tab_id)


def cmd_create_world(name: str):
    """Create world + trigger space provisioning. Returns {worldId, spaceId, ...}."""
    tab = _find_neta_tab()
    r = _eval_value(
        tab,
        f"fetch('/api/worlds',{{method:'POST',headers:{{'content-type':'application/json'}},body:JSON.stringify({{config:{{name:{json.dumps(name)}}},visibility:'private'}})}}).then(r=>r.json())",
    )
    world_id = r["worldId"]
    # open Studio page in a new tab to trigger lazy space provisioning
    new_tab = _open_tab(f"{STUDIO_BASE}/world/{world_id}/studio")
    new_tab_id = new_tab["id"]
    try:
        for _ in range(36):
            time.sleep(5)
            d = _eval_value(tab, f"fetch('/api/worlds/{world_id}').then(r=>r.json())")
            if d.get("spaceId"):
                out = {
                    "worldId": world_id,
                    "spaceId": d["spaceId"],
                    "studioUrl": f"{STUDIO_BASE}/world/{world_id}/studio",
                    "cohubUrl": f"https://cohub.run/spaces/{d['spaceId']}",
                }
                print(json.dumps(out, indent=2))
                return
        raise SystemExit(f"spaceId never appeared for {world_id}")
    finally:
        _close_tab(new_tab_id)


# ── dispatch ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        raise SystemExit(__doc__)
    cmd = args[0]
    if cmd == "eval":
        if len(args) < 2:
            raise SystemExit("Usage: cdp_studio.py eval '<js>'")
        cmd_eval(args[1])
    elif cmd == "refresh-token":
        if len(args) < 2:
            raise SystemExit("Usage: cdp_studio.py refresh-token <worldId>")
        cmd_refresh_token(args[1])
    elif cmd == "screenshot":
        if len(args) < 3:
            raise SystemExit("Usage: cdp_studio.py screenshot <worldId> <outPath.png>")
        cmd_screenshot(args[1], args[2])
    elif cmd == "create-world":
        if len(args) < 2:
            raise SystemExit("Usage: cdp_studio.py create-world <name>")
        cmd_create_world(args[1])
    else:
        raise SystemExit(__doc__)
