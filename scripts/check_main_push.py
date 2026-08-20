"""Fail the build if a commit reached `main` without going through a pull request.

Rulesets are the right tool for this, but GitHub does not enforce them on private
repositories outside a Team/Enterprise plan — the ruleset page says so directly.
So prevention is unavailable here and detection is the honest substitute: a direct
push still lands, but `main` goes red immediately and the log names the commit and
its author.

That is weaker than a ruleset and should be replaced by one the moment this
repository becomes public or moves into an organisation. It is recorded in
AGENTS.md as such rather than presented as equivalent.

    python scripts/check_main_push.py            # GitHub Actions, push to main
    python scripts/check_main_push.py --sha <s>  # locally, needs GITHUB_TOKEN
"""
from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request

API = "https://api.github.com"


def gh(path: str, token: str):
    req = urllib.request.Request(
        f"{API}{path}",
        headers={"Authorization": f"Bearer {token}",
                 "Accept": "application/vnd.github+json",
                 "User-Agent": "mealog-main-guard"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sha", default=None)
    args = ap.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    sha = args.sha or os.environ.get("GITHUB_SHA")
    if not token or not repo or not sha:
        print("no GITHUB_TOKEN/GITHUB_REPOSITORY/GITHUB_SHA — skipping (local run)")
        return 0

    try:
        pulls = gh(f"/repos/{repo}/commits/{sha}/pulls", token)
    except urllib.error.HTTPError as exc:
        # Never fail the build because the guard itself could not run; that would
        # teach everyone to ignore it.
        print(f"WARN: could not check commit {sha[:8]}: {exc.code} {exc.reason}")
        return 0

    merged = [p for p in pulls if p.get("merged_at")]
    if merged:
        numbers = ", ".join(f"#{p['number']}" for p in merged)
        print(f"OK — {sha[:8]} arrived via pull request {numbers}")
        return 0

    commit = gh(f"/repos/{repo}/commits/{sha}", token)
    author = (commit.get("author") or {}).get("login", "unknown")
    subject = (commit.get("commit", {}).get("message") or "").splitlines()[0]

    print(
        f"FAIL: {sha[:8]} was pushed straight to main.\n\n"
        f"  author:  {author}\n"
        f"  subject: {subject}\n\n"
        "AGENTS.md section 4: every change goes through a pull request, so another\n"
        "agent can see it coming and the merge gate gets a chance to run. This\n"
        "commit skipped both.\n\n"
        "Nothing is reverted automatically — decide deliberately. Either open a\n"
        "pull request that reproduces the change, or revert it. Leaving main red\n"
        "is the worst option, because the next agent will start ignoring CI."
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
