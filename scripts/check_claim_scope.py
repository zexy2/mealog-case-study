"""Enforce that a pull request stays inside the scope its claim issue declared.

AGENTS.md section 3 makes issues the only lock between agents. A lock nobody
checks is a convention, and conventions lose to a model in a hurry — so this
turns the declared scope into a build failure.

Runs in CI on pull_request events: reads the claim issue linked from the PR
body, parses its `## Scope` section, and fails if the PR touches anything
outside it.

    python scripts/check_claim_scope.py            # GitHub Actions
    python scripts/check_claim_scope.py --pr 12    # locally, needs GITHUB_TOKEN
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import urllib.error
import urllib.request

API = "https://api.github.com"

#: Process files every agent is expected to touch. Requiring them in each claim
#: would be noise, and forgetting them is not the failure this guards against.
# Every agent gets its own session file. The old AGENT_LOG.md is only a pointer
# and should not be silently changed outside a declared scope.
ALWAYS_ALLOWED = ("log/", "STATUS.md")

ISSUE_REF = re.compile(r"(?:closes|fixes|resolves|issue)[:\s]+#(\d+)", re.IGNORECASE)
SCOPE_BLOCK = re.compile(r"##\s*Scope.*?\n(.*?)(?=\n##\s|\Z)", re.DOTALL | re.IGNORECASE)
PATHS = re.compile(r"`([^`]+)`")


def gh(path: str, token: str) -> dict:
    req = urllib.request.Request(
        f"{API}{path}",
        headers={"Authorization": f"Bearer {token}",
                 "Accept": "application/vnd.github+json",
                 "User-Agent": "mealog-claim-scope"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def changed_files(base: str) -> list[str]:
    subprocess.run(["git", "fetch", "--quiet", "origin", base], check=False)
    out = subprocess.run(["git", "diff", "--name-only", f"origin/{base}...HEAD"],
                         capture_output=True, text=True, check=True).stdout
    return [f for f in out.split("\n") if f.strip()]


def declared_scope(body: str) -> list[str]:
    """Backticked paths inside the `## Scope` section.

    Prose in that section is for humans; the lock itself has to be unambiguous
    or agents will reason their way around it.
    """
    block = SCOPE_BLOCK.search(body or "")
    if not block:
        return []
    return [p.strip().rstrip("/") for p in PATHS.findall(block.group(1))
            if "/" in p or p.endswith((".py", ".md", ".toml", ".yaml", ".yml", ".jsonl"))]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pr", type=int, default=None)
    ap.add_argument("--base", default="main")
    args = ap.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repo:
        print("no GITHUB_TOKEN/GITHUB_REPOSITORY — skipping (local run)")
        return 0

    pr_number = args.pr
    if pr_number is None:
        event_path = os.environ.get("GITHUB_EVENT_PATH", "")
        if not event_path or not os.path.exists(event_path):
            print("not a pull_request event — nothing to check")
            return 0
        with open(event_path) as fh:
            pr_number = json.load(fh).get("pull_request", {}).get("number")
        if not pr_number:
            print("not a pull_request event — nothing to check")
            return 0

    try:
        pr = gh(f"/repos/{repo}/pulls/{pr_number}", token)
    except urllib.error.HTTPError as exc:
        # 403 here almost always means the workflow did not request
        # `pull-requests: read`. The default token is contents-only.
        print(f"FAIL: cannot read pull request #{pr_number}: {exc.code} {exc.reason}\n\n"
              "If this is 403, the workflow is missing a permissions block:\n"
              "  permissions:\n    contents: read\n    pull-requests: read\n    issues: read")
        return 1

    ref = ISSUE_REF.search(pr.get("body") or "")
    if not ref:
        print("FAIL: this pull request references no claim issue.\n\n"
              "AGENTS.md section 3: open a claim issue declaring the files you\n"
              "will touch, then reference it here as 'Closes #N'. That claim is\n"
              "the only thing stopping two agents editing the same file.")
        return 1

    issue_number = ref.group(1)
    try:
        issue = gh(f"/repos/{repo}/issues/{issue_number}", token)
    except urllib.error.HTTPError as exc:
        print(f"FAIL: cannot read claim issue #{issue_number}: {exc}")
        return 1

    scope = declared_scope(issue.get("body") or "")
    if not scope:
        print(f"FAIL: issue #{issue_number} declares no machine-readable scope.\n\n"
              "Add a '## Scope' section listing each path in backticks:\n"
              "  - `server/src/mealog/pipeline/retrieval.py`\n"
              "  - `eval/`")
        return 1

    violations = [p for p in changed_files(args.base)
                  if not p.startswith(ALWAYS_ALLOWED)
                  and not any(p == s or p.startswith(s.rstrip("/") + "/") for s in scope)]

    if violations:
        print(f"FAIL: {len(violations)} file(s) outside the scope declared on "
              f"issue #{issue_number}.\n")
        for v in violations:
            print(f"  {v}")
        print("\nDeclared scope:")
        for s in scope:
            print(f"  {s}")
        print("\nEither revert these files, or widen the scope on the claim issue\n"
              "*before* continuing — AGENTS.md section 3, step 3. Widening it is\n"
              "fine. Widening it silently is not.")
        return 1

    print(f"scope OK — all changes within issue #{issue_number} "
          f"({len(scope)} declared path(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
