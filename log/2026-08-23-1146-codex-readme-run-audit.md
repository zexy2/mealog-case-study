# README cold-start run audit

Agent: `codex`
Issue/claim: #243
Branch: `agent/codex/readme-run-audit`
Repository: `zexy2/mealog-case-study`
Audited main: `6b05422dfdc4e29d0d77e833637f2c9f5fd7235f`
Date: 2026-08-23

## Test boundary

No repository README, source, data, evaluator, baseline, or mobile file was
changed. All project commands ran in a fresh clone with a clean temporary HOME
and no inherited project environment variables. `GEMINI_API_KEY=ABSENT` was
verified before project commands. Default provider remained fixture.

The first isolated `git clone` preflight failed because this private repository
needs GitHub authentication when HOME has no GitHub credentials:

```text
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

Using the existing authenticated GitHub CLI session, a new full clone succeeded:

```text
gh repo clone zexy2/mealog-case-study "$tmpdir/repo"
real 1.94
RESULT: rc=0
HEAD=6b05422dfdc4e29d0d77e833637f2c9f5fd7235f
SHALLOW=false
COMMITS=390
GEMINI_API_KEY=ABSENT
```

A reviewer therefore needs private-repository GitHub credentials before README
setup can begin. This is repository access, not an application key.

## README `Run it` transcript

Runtime versions available in clean audit shell: Node `v22.22.3`, npm `10.9.8`,
Python `3.11.15`. README states Node 22 and Python 3.11 but gives no installation
or version-manager step.

### Delivered Node.js service

README commands, copied in order from the code block:

```text
cd server                         PASS, negligible
npm ci                            PASS, real 1.87 s
npm run build                    PASS, real 1.40 s
npm run lint                     PASS, real 2.37 s
npm run test                     PASS, real 1.93 s, 16 files / 221 tests
npm start                        FAIL, real about 0.12 s
```

Literal `npm start` failure:

```text
Error: listen EADDRINUSE: address already in use :::3000
```

README documents only `http://localhost:3000/health`; it gives no port-change
command and does not warn that port 3000 must be free. The audit used the
undocumented workaround `PORT=4310 npm start`, with no provider key. Then:

```text
curl -sS -o /tmp/mealog-health.json -w "HTTP=%{http_code} BODY=" http://localhost:4310/health
HTTP=200 BODY={"status":"ok","vision":"fixture"}
real 0.01
```

Startup-to-first-HTTP-200 timing with the same workaround was measured separately
as `0.423 s`. Sum of successful README setup commands (`npm ci` through test)
plus this startup/health probe was approximately **7.99 s**, excluding clone.
The literal default-port path never reached HTTP 200 on this host; working health
required guessing `PORT`.

### Mobile app

README code-block commands, copied in order from a fresh `apps/mobile` directory:

```text
cd apps/mobile                         PASS, negligible
npm ci                                  PASS, real 4.92 s
npm run typecheck                       PASS, real 1.21 s
npx expo export --platform ios         PASS, real 12.46 s
npx expo export --platform android     PASS, real 7.55 s
```

Both exports completed. Mobile block cumulative command time: **26.14 s**.
Fresh mobile install reported 16 npm audit vulnerabilities (7 moderate, 9 high)
and deprecated-package warnings; install still succeeded. README does not tell a
reviewer whether these warnings require action before demo.

README prose also offers `npm run ios` when a local simulator is configured. An
iPhone Air simulator was already booted in this host. The command launched Expo,
opened `exp://192.168.1.78:8081`, and bundled iOS successfully in the observed
foreground run; process was stopped after launch because it is a resident dev
server. With isolated HOME it emitted this environment-specific warning:

```text
Could not update simulator linking permissions: ENOENT: no such file or directory, open '/tmp/.../Library/Developer/CoreSimulator/Devices/.../data/Library/Preferences/com.apple.launchservices.schemeapproval.plist'
```

This did not prevent launch. README requires a configured/booted simulator but
does not show how to install, boot, or select one. It also does not provide an
equivalent Android launch command in the Run it walkthrough; only Android export
is listed.

### Offline evaluation and reference tooling

README commands, copied in order from repository root:

```text
MEALOG_VENV="$(mktemp -d)/venv"       PASS, path created
python3.11 -m venv "$MEALOG_VENV"    PASS, real 1.68 s
. "$MEALOG_VENV/bin/activate"        PASS, shell state changed
python -m pip install -e "server[dev]" PASS, real 12.63 s
make check                            PASS, real 21.80 s
```

`make check` output:

```text
All checks passed!
285 passed in 19.15s
all architectural invariants hold
STATUS.md matches the repository
no per-cuisine regression in V3
```

Offline block cumulative measured command time: **36.11 s**. No API key or
network provider call was needed. Dependency constraints are lower bounds rather
than a lock: the fresh install selected current package releases. A later clean
clone can therefore resolve different Python versions.

### Copy-paste order trap

README leaves the shell in `apps/mobile` after mobile commands, then presents the
offline block without `cd` back to repository root. Running `make check` in that
same terminal fails:

```text
make: *** No rule to make target `check'.  Stop.
```

Reviewer must infer a new terminal or manually `cd` to repository root. README
explicitly says “another terminal” only for the health URL, not for mobile or
offline steps.

## Findings

1. Keyless fixture service works from fresh clone after Node install/build/lint/test.
2. Literal Node start path is not reliable on a host with port 3000 occupied;
   README omits `PORT` workaround and `curl` example. This is primary blocker.
3. Mobile typecheck and both exports work from fresh clone. Interactive iOS
   launch needs a booted/configured simulator and local-network Expo access;
   README does not give setup steps.
4. Offline venv, install, and `make check` work from repository root. Same-shell
   copy-paste after mobile gets stuck because root change is omitted.
5. README does not state how to install required Node 22/Python 3.11, how to
   choose a free API port, or how to launch a visible demo after export.

Traps: Do not claim literal default-port cold start passed; it hit `EADDRINUSE`.
Do not report `PORT=4310` as README evidence—it was an audit workaround. Do not
claim iOS simulator/device or live-provider accuracy from bundle export. Do not
log or reuse any provider credential; this audit stayed keyless. No evaluator
metric was generated beyond README's `make check` regression gate.
