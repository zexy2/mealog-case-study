#!/usr/bin/env python3
"""Fail closed when tracked repository content looks like a secret.

The Google key check is deliberately literal and applies to every tracked
file. The generic check is deliberately narrower: only values assigned to a
variable whose name contains KEY, TOKEN, or SECRET are candidates. This keeps
fixture model identifiers and golden-set SHA-256 values as ordinary data.
"""
from __future__ import annotations

import argparse
import math
import os
import re
import subprocess
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

GOOGLE_API_KEY = re.compile(rb"AIza[0-9A-Za-z_-]{35}")
SENSITIVE_NAME = re.compile(r"(?:KEY|TOKEN|SECRET)", re.IGNORECASE)
ASSIGNMENT = re.compile(
    rb"""(?ix)
    (?P<name>["']?[a-z_][a-z0-9_-]*["']?)
    [ \t]*(?P<operator>=|:)
    [ \t]*(?P<value>
        "(?:\\.|[^"\\\r\n])*"
        | '(?:\\.|[^'\\\r\n])*'
        | [^\s,;#}\]]*
    )
    """
)

PLACEHOLDERS = {
    "change-me",
    "changeme",
    "dummy",
    "example",
    "fake",
    "not-a-secret",
    "none",
    "placeholder",
    "replace-me",
    "replace_me",
    "test",
    "test-key",
    "null",
    "your-key",
    "your-key-here",
    "your_key_here",
}
REFERENCE_PREFIXES = ("$", "os.", "env.", "getenv(")
ENTROPY_THRESHOLD = 3.5
MIN_TOKEN_LENGTH = 32


@dataclass(frozen=True)
class Finding:
    path: str
    source: str
    reason: str
    line: int | None = None


def _line_number(content: bytes, offset: int) -> int:
    return content[:offset].count(b"\n") + 1


def _clean_value(raw: bytes) -> str:
    value = raw.decode("utf-8", errors="replace").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    return value.strip()


def _is_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    return (
        not normalized
        or normalized in PLACEHOLDERS
        or normalized.startswith(
            ("${", "{{", "<", "your ", "your-", "your_", "replace ", "replace-")
        )
    )


def _is_reference(value: str) -> bool:
    """Allow code/config references, which do not expose a value."""
    return value.strip().startswith(REFERENCE_PREFIXES)


def _entropy(value: str) -> float:
    counts = Counter(value)
    length = len(value)
    return -sum((count / length) * math.log2(count / length) for count in counts.values())


def _is_high_entropy(value: str) -> bool:
    return len(value) >= MIN_TOKEN_LENGTH and len(set(value)) >= 10 and _entropy(value) >= ENTROPY_THRESHOLD


def _is_env_file(path: Path) -> bool:
    return path.name == ".env" or (
        path.name.startswith(".env.") and path.name != ".env.example"
    )


def scan_content(path: Path, content: bytes, source: str) -> list[Finding]:
    findings: list[Finding] = []
    google_match = GOOGLE_API_KEY.search(content)
    if google_match:
        findings.append(
            Finding(
                path.as_posix(),
                source,
                "Google API key pattern",
                _line_number(content, google_match.start()),
            )
        )

    for match in ASSIGNMENT.finditer(content):
        name = match.group("name").decode("ascii", errors="ignore").strip("\"'")
        if not SENSITIVE_NAME.search(name):
            continue
        value = _clean_value(match.group("value"))
        if match.group("operator") == b":" and value.lower() in {"bool", "float", "int", "str"}:
            continue
        if _is_reference(value) or _is_placeholder(value):
            continue
        if name.upper() == "GEMINI_API_KEY":
            findings.append(
                Finding(
                    path.as_posix(),
                    source,
                    "non-placeholder GEMINI_API_KEY assignment",
                    _line_number(content, match.start()),
                )
            )
        elif _is_high_entropy(value):
            findings.append(
                Finding(
                    path.as_posix(),
                    source,
                    "high-entropy sensitive assignment",
                    _line_number(content, match.start()),
                )
            )
    return findings


def _git(root: Path, *args: str) -> bytes:
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        check=False,
        capture_output=True,
    )
    if result.returncode:
        message = result.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"git {' '.join(args)} failed: {message}")
    return result.stdout


def _tracked_files(root: Path) -> list[Path]:
    return [
        Path(os.fsdecode(raw))
        for raw in _git(root, "ls-files", "-z").split(b"\0")
        if raw
    ]


def _added_diff_lines(root: Path, base: str):
    diff = _git(root, "diff", "--no-ext-diff", "--no-color", "--unified=0", f"{base}...HEAD")
    current_path: Path | None = None
    for line in diff.splitlines():
        if line.startswith(b"+++ b/"):
            current_path = Path(os.fsdecode(line[6:]))
        elif current_path is not None and line.startswith(b"+") and not line.startswith(b"+++"):
            yield current_path, line[1:]


def scan_repository(root: Path, diff_base: str | None = None) -> tuple[list[Finding], int, bool]:
    tracked = _tracked_files(root)
    findings: list[Finding] = []
    for relative in tracked:
        if _is_env_file(relative):
            findings.append(Finding(relative.as_posix(), "tree", "tracked .env file"))
        try:
            content = (root / relative).read_bytes()
        except OSError as exc:
            findings.append(Finding(relative.as_posix(), "tree", f"unreadable tracked file: {exc}"))
            continue
        findings.extend(scan_content(relative, content, "tree"))

    diff_scanned = diff_base is not None
    if diff_base is not None:
        for relative, added in _added_diff_lines(root, diff_base):
            if _is_env_file(relative):
                findings.append(Finding(relative.as_posix(), "diff", "tracked .env file"))
            findings.extend(scan_content(relative, added, "diff"))

    unique = {(f.path, f.source, f.reason, f.line): f for f in findings}
    return list(unique.values()), len(tracked), diff_scanned


def _default_diff_base(root: Path) -> str | None:
    try:
        _git(root, "rev-parse", "--verify", "origin/main")
    except RuntimeError:
        return None
    return "origin/main"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument(
        "--diff-base",
        help="scan added diff lines against this git ref (defaults to origin/main when available)",
    )
    args = parser.parse_args()
    root = args.root.resolve()
    diff_base = args.diff_base if args.diff_base is not None else _default_diff_base(root)

    try:
        findings, tracked_count, diff_scanned = scan_repository(root, diff_base)
    except RuntimeError as exc:
        print(f"FAIL: secret guard could not complete: {exc}")
        return 1

    if findings:
        print(f"FAIL: secret guard found {len(findings)} finding(s)")
        for finding in findings:
            location = f"{finding.path}:{finding.line}" if finding.line else finding.path
            print(f"  {finding.source}: {location} — {finding.reason}")
        return 1

    diff_note = " and added diff lines" if diff_scanned else ""
    print(f"secret guard passed: scanned {tracked_count} tracked files{diff_note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
