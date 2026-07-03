#!/usr/bin/env python3
import argparse
import json
import sys
import urllib.parse
import urllib.request


JINA_PREFIX = "https://r.jina.ai/http://"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def jina_api_url(wiki: str, params: dict[str, str]) -> str:
    api = f"{wiki}.fandom.com/api.php?{urllib.parse.urlencode(params)}"
    return JINA_PREFIX + api


def extract_json(raw: str) -> dict:
    marker = "Markdown Content:\n"
    text = raw.split(marker, 1)[1] if marker in raw else raw
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        fail(f"failed to decode proxied JSON: {exc}")


def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"Accept": "text/plain", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return extract_json(resp.read().decode("utf-8", errors="replace"))


def command_search(args: argparse.Namespace) -> dict:
    data = fetch(
        jina_api_url(
            args.wiki,
            {
                "action": "query",
                "list": "search",
                "srsearch": args.query,
                "srlimit": str(args.limit),
                "format": "json",
            },
        )
    )
    results = data.get("query", {}).get("search", [])
    return {
        "query": args.query,
        "count": len(results),
        "results": results,
        "continue_offset": data.get("continue", {}).get("sroffset"),
    }


def command_category(args: argparse.Namespace) -> dict:
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": f"Category:{args.name}",
        "cmlimit": str(args.limit),
        "format": "json",
    }
    if args.cmcontinue:
        params["cmcontinue"] = args.cmcontinue
    data = fetch(jina_api_url(args.wiki, params))
    members = data.get("query", {}).get("categorymembers", [])
    pages = [
        {
            "pageid": item.get("pageid"),
            "title": item.get("title"),
            "url": f"https://{args.wiki}.fandom.com/wiki/{urllib.parse.quote(item.get('title', '').replace(' ', '_'))}",
        }
        for item in members
    ]
    return {
        "category": f"Category:{args.name}",
        "count": len(pages),
        "pages": pages,
        "continue": data.get("continue", {}).get("cmcontinue"),
    }


def command_metadata(args: argparse.Namespace) -> dict:
    data = fetch(
        jina_api_url(
            args.wiki,
            {
                "action": "query",
                "prop": "categories",
                "titles": args.title,
                "format": "json",
            },
        )
    )
    pages = data.get("query", {}).get("pages", {})
    if not pages:
        fail("no pages returned")
    page = next(iter(pages.values()))
    return {
        "pageid": page.get("pageid"),
        "title": page.get("title"),
        "url": f"https://{args.wiki}.fandom.com/wiki/{urllib.parse.quote((page.get('title') or '').replace(' ', '_'))}",
        "categories": [item.get("title") for item in page.get("categories", [])],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Minimal Fandom query wrapper for Cohub using r.jina.ai as the transport.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_search = sub.add_parser("search")
    p_search.add_argument("wiki")
    p_search.add_argument("query")
    p_search.add_argument("--limit", type=int, default=10)

    p_category = sub.add_parser("category")
    p_category.add_argument("wiki")
    p_category.add_argument("name")
    p_category.add_argument("--limit", type=int, default=50)
    p_category.add_argument("--cmcontinue")

    p_metadata = sub.add_parser("metadata")
    p_metadata.add_argument("wiki")
    p_metadata.add_argument("title")

    args = parser.parse_args()
    if args.command == "search":
        out = command_search(args)
    elif args.command == "category":
        out = command_category(args)
    else:
        out = command_metadata(args)
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
