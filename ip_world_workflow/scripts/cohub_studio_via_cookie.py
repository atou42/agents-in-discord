#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def read_cookie(args: argparse.Namespace) -> str:
    if args.cookie_file:
        try:
            with open(args.cookie_file, "r", encoding="utf-8") as fh:
                return fh.read().strip()
        except FileNotFoundError:
            fail(f"missing cookie file: {args.cookie_file}")
    value = os.environ.get("STUDIO_COOKIE", "").strip()
    if not value:
        fail("cookie is required via --cookie-file or STUDIO_COOKIE")
    return value


def request_json(method: str, url: str, payload: dict | None, cookie: str) -> dict:
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": UA,
            "Cookie": cookie,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            text = resp.read().decode("utf-8", errors="replace")
            return {"status": resp.status, "data": json.loads(text)}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            data = {"raw": text[:2000]}
        return {"status": exc.code, "data": data}


def main() -> None:
    parser = argparse.ArgumentParser(description="Studio world create/provision/get via a browser-exported cookie.")
    parser.add_argument("--base-url", default="https://neta.art")
    parser.add_argument("--cookie-file")
    parser.add_argument("--world-id")
    parser.add_argument("--name")
    parser.add_argument("--prompt")
    parser.add_argument("--mode", choices=["create", "provision", "get", "create-and-provision"], required=True)
    args = parser.parse_args()

    cookie = read_cookie(args)
    base = args.base_url.rstrip("/")

    if args.mode in {"create", "create-and-provision"}:
        payload = {
            "config": {
                "genre": "starter",
                "tone": "starter",
                "era": "starter",
                "rules": [],
                "language": "en",
                "seedPrompt": args.prompt or "cohub closed loop studio bootstrap",
                "creationMode": "one-line",
            }
        }
        if args.name:
            payload["config"]["name"] = args.name
        created = request_json("POST", f"{base}/api/worlds", payload, cookie)
        if created["status"] < 200 or created["status"] >= 300:
            fail(json.dumps({"step": "create", **created}, ensure_ascii=False))
        world_id = created["data"].get("worldId")
        if not world_id:
            fail("create returned no worldId")
    else:
        if not args.world_id:
            fail("--world-id is required for get or provision")
        world_id = args.world_id

    provisioned = None
    if args.mode in {"provision", "create-and-provision"}:
        provisioned = request_json("POST", f"{base}/api/worlds/{urllib.parse.quote(world_id, safe='')}/provision", {}, cookie)
        if provisioned["status"] < 200 or provisioned["status"] >= 300:
            fail(json.dumps({"step": "provision", "worldId": world_id, **provisioned}, ensure_ascii=False))

    current = request_json("GET", f"{base}/api/worlds/{urllib.parse.quote(world_id, safe='')}", None, cookie)
    if current["status"] < 200 or current["status"] >= 300:
        fail(json.dumps({"step": "get", "worldId": world_id, **current}, ensure_ascii=False))

    out = {
        "worldId": world_id,
        "spaceId": current["data"].get("spaceId"),
        "phase": current["data"].get("phase"),
        "provisioning": current["data"].get("provisioning"),
    }
    if provisioned is not None:
        out["provisionResponse"] = provisioned["data"]
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
