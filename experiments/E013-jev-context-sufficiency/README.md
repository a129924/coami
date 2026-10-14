# E013 Jev Context Sufficiency evaluation

E013 evaluates the frozen 60-case v1 research/holdout benchmark and the frozen 15-case v0 comparison with one Context Sufficiency call per case. It records raw model observations and does not select a pass threshold. This directory is an experiment, not a production service.

## Current gate

The exact `v1-draft-004` 60-case snapshot has Owner human acceptance and an independent fixture verdict recorded in its `review.md`. The matching snapshot is **FROZEN** as `context_sufficiency_v1`; [freeze-attestation.json](../../evaluation/context_sufficiency/versions/v1/freeze-attestation.json) binds the review and three source files by SHA-256. The Owner separately authorized one live 75-case run on 2026-10-08: `20261008T035450Z-010364d7`. Its local bytes passed integrity and per-case safety review; the reviewed Git export is under [evidence/runs/20261008T035450Z-010364d7](evidence/runs/20261008T035450Z-010364d7). The local directory alone has no verified backup or immutability.

## Inputs and conditions

- Python 3.12, `typesafe-sdk==0.7.2`, model `jev-1.13.0`, 30-second I/O timeout, zero automatic retries, SDK logger disabled. Live preflight checks the executing Python minor version before consuming its one-use authorization.
- The Context question is read without modification from E012 `policies.json`; its hash is recorded. Only `background`, `conversation`, and `utterance` reach Jev. Case ID, split, oracle, rationale, candidate, and threshold remain evaluator-only.
- The fixed run order is v1 research 40, v1 holdout 20, then v0 15. Calls are sequential. E013 does not run Input/Output Policy, route an Action, or generate an answer.
- The tracked freeze attestation contains `owner_accepted_60: true`, `fixture_review_approved: true`, `frozen: true`, the SHA-256 of the exact `review.md`, and a `v1_hashes` object keyed by `README.md`, `context_sufficiency_v1.jsonl`, `validate_dataset.py`. The runner checks its full field set, exact `v1-draft-004` and `context_sufficiency_v1` identity, approved independent verdict and reviewer, recorded freeze time, source files, current review status, frozen v0 hashes, both validators, 75-case inventory, SDK version, and key before any call. The attestation records the separate human decisions; it does not authorize a live call.
- [local-store-policy.json](local-store-policy.json) records the Owner-selected `/Users/andrew/coami-evidence/E013` root. It says `storage_mode: local_staging`, `versioned_immutable: false`, `backup_verified: false`, and `retention_until: null`; these are deliberate facts, not a claim of durable or immutable backup. Only Owner-authorized local processes may read it. The preflight checks the exact root and policy, then uses `runs/<run_id>/` with exclusive creation. A read-only mode after completion and SHA-256 checks detect or discourage changes but cannot stop the local owner from altering or deleting evidence.

## Offline validation

From the repository root after `uv sync --locked --project experiments/E013-jev-context-sufficiency`:

```sh
experiments/E013-jev-context-sufficiency/.venv/bin/python -m unittest discover -s experiments/E013-jev-context-sufficiency/tests -v
python evaluation/context_sufficiency/validate_dataset.py
python evaluation/context_sufficiency/versions/v1/validate_dataset.py
ruff check experiments/E013-jev-context-sufficiency
ruff format --check experiments/E013-jev-context-sufficiency
```

The tests use fake HTTP transport and synthetic responses. They do not measure Jev.

## Future live execution and evidence review

The following command was used for the separately authorized historical run, with the existing E012 `.env` loaded read-only in place of an E013 credential copy. It is retained as an execution record, including its historical `--no-sync` flag. It is not a standing authorization for another run, and the current runner now requires an additional committed, run-specific `--live-authorization` record:

```sh
env -u TYPESAFE_API_KEY -u UV_NO_ENV_FILE -u RUST_LOG \
  uv run --quiet --locked --no-sync --project experiments/E013-jev-context-sufficiency \
  --env-file /Users/andrew/code/python/coami/experiments/E012-jev-text-policy/.env \
  python experiments/E013-jev-context-sufficiency/jev_context.py --live \
  --freeze-attestation evaluation/context_sufficiency/versions/v1/freeze-attestation.json \
  --store-policy experiments/E013-jev-context-sufficiency/local-store-policy.json \
  --store-root /Users/andrew/coami-evidence/E013
```

For a separately authorized future run, authenticate the `uv` binary, the entire managed Python 3.12 runtime, and the committed project and lock bytes with system Python before and after synchronizing without a credential. Synchronization forbids source builds and project installation; the same Git revision must survive synchronization and match the bootstrap revision. The authenticated Python 3.12 bootstrap reads the credential file only after confirming the runner and one-run authorization. The paths and SHA-256 values below are pinned for this macOS arm64 host and require a reviewed update if either installation changes. Clear `UV_NO_SYNC` and `PYTHONPATH` so inherited settings cannot skip synchronization or shadow the imported SDK:

Preflight checks imported SDK and transitive dependency code against the authorized lockfile's versions, installed RECORD hashes, module origins, and the independent 287-file `sdk-code-digests.json` baseline whose SHA-256 is fixed in the authorized runner source. The baseline is for this macOS arm64 Python 3.12 environment and was reviewed as committed source; changing a package and its mutable RECORD together still fails it. A different platform or wheel build requires a separately reviewed baseline and authorization. It also verifies that `runs/` and `authorization-uses/` beneath the approved local store are real directories before consuming the one-use authorization. The command below uses Python's `-I -S -B -c` entry point: `-S` prevents site hooks and `.pth` execution, the site-packages path is appended after the standard library without processing hooks, and an exclusive empty bytecode cache prefix prevents loading existing dependency `.pyc` files. It then executes a single runner byte snapshot without first executing a separate repository launcher script. The runner checks that snapshot against its committed authorization; invoking `jev_context.py --live` directly blocks before the authorization marker. Git authorization reads clear inherited `GIT_*` overrides, validate this checkout's `.git` target, and use that explicit Git directory. These are point-in-time checks; the local store remains unbacked staging until reviewed evidence is committed and pushed.

Before the first third-party import, the runner also checks every locked dependency source byte against the pinned digest baseline. A changed import wrapper therefore blocks before it can execute. Future runs retain `uv.lock` and `sdk-code-digests.json` with separate hashes; evidence replay checks those run-bound bytes against the installed environment and fails closed if the current environment cannot reproduce that run. The historical run predates these snapshots and uses the lock from its fixed Git runner revision, which must agree with the current pinned baseline.

The `-c` bootstrap uses only the standard library until it has compared the exact runner (and, for evidence operations, `evidence_tools.py`) with one resolved commit from this checkout's `HEAD`. A live run also compares the one-run authorization bytes and its runner hash. It does not execute locally edited evidence code before those checks. After that comparison it appends the synchronized dependency path and executes the verified runner snapshot. Git replacement objects are disabled for these reads.

```sh
verify_inputs() {
  /usr/bin/python3 -I -S -B -c '
import hashlib, os, stat, subprocess
from pathlib import Path
def blocked():
    raise SystemExit("E013 BLOCKED LAUNCH_RUNTIME_UNVERIFIED")
try:
    uv_link = Path("/Users/andrew/.local/bin/uv")
    uv_binary = Path("/Users/andrew/.local/pipx/venvs/uv/bin/uv")
    if not uv_link.is_symlink() or uv_link.resolve() != uv_binary or hashlib.sha256(uv_binary.read_bytes()).hexdigest() != "ef2d06c5bd20c7ec6ad0ea466d3406211b5fc302efd3d3ce21e5f38fa01559e7":
        blocked()
    runtime = Path("/Users/andrew/.local/share/uv/python/cpython-3.12.12-macos-aarch64-none")
    if not runtime.is_dir():
        blocked()
    digest = hashlib.sha256()
    for item in sorted(runtime.rglob("*"), key=lambda path: path.relative_to(runtime).as_posix()):
        relative = item.relative_to(runtime).as_posix().encode()
        if item.is_symlink():
            digest.update(b"L\0" + relative + b"\0" + os.readlink(item).encode() + b"\0")
        elif item.is_file():
            digest.update(b"F\0" + relative + b"\0" + hashlib.sha256(item.read_bytes()).digest())
        elif item.is_dir():
            digest.update(b"D\0" + relative + b"\0")
        else:
            blocked()
    binary = runtime / "bin/python3.12"
    if digest.hexdigest() != "e28f4275a88734b4fc6e768440429812dfd363b026ca221ce966c4ab7f531135" or hashlib.sha256(binary.read_bytes()).hexdigest() != "a0ea1fa2b8d2631d1ba8e513b29a90c6a6cdfb9d00febb1a02e5cc5cb44a838e":
        blocked()
    root = Path.cwd().resolve()
    env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    env["GIT_NO_REPLACE_OBJECTS"] = "1"
    probe = subprocess.run(["/usr/bin/git", "-C", str(root), "rev-parse", "--show-toplevel", "--absolute-git-dir"], env=env, capture_output=True, check=True).stdout.decode().splitlines()
    marker = root / ".git"
    if len(probe) != 2 or Path(probe[0]).resolve() != root or marker.is_symlink():
        blocked()
    if marker.is_dir():
        expected_git_dir = marker.resolve()
    elif marker.is_file():
        pointer = marker.read_text().strip()
        if not pointer.startswith("gitdir: "):
            blocked()
        expected_git_dir = (root / pointer.removeprefix("gitdir: ")).resolve()
    else:
        blocked()
    git_dir = Path(probe[1]).resolve()
    if git_dir != expected_git_dir or not git_dir.is_dir():
        blocked()
    def git(*args):
        return subprocess.run(["/usr/bin/git", "--git-dir", str(git_dir), "--work-tree", str(root), *args], env=env, capture_output=True, check=True).stdout
    revision = git("rev-parse", "HEAD^{commit}").decode().strip()
    if len(revision) != 40 or any(character not in "0123456789abcdef" for character in revision):
        blocked()
    for relative in ("experiments/E013-jev-context-sufficiency/pyproject.toml", "experiments/E013-jev-context-sufficiency/uv.lock"):
        project_input = root / relative
        if not stat.S_ISREG(project_input.lstat().st_mode) or project_input.read_bytes() != git("show", f"{revision}:{relative}"):
            blocked()
    print(revision)
except (OSError, RuntimeError, ValueError, UnicodeDecodeError, subprocess.CalledProcessError):
    blocked()
'
}
e013_revision="$(verify_inputs)" &&
/usr/bin/env -u TYPESAFE_API_KEY -u UV_NO_ENV_FILE -u UV_NO_SYNC -u PYTHONPATH -u RUST_LOG \
  /Users/andrew/.local/bin/uv sync --quiet --locked --no-build --no-install-project --project experiments/E013-jev-context-sufficiency &&
test "$(verify_inputs)" = "$e013_revision" &&
/usr/bin/env -u TYPESAFE_API_KEY -u UV_NO_ENV_FILE -u UV_NO_SYNC -u PYTHONPATH -u RUST_LOG E013_PREFLIGHT_REVISION="$e013_revision" \
  /Users/andrew/.local/share/uv/python/cpython-3.12.12-macos-aarch64-none/bin/python3.12 -I -S -B -c '
import hashlib, json, os, subprocess, sys, tempfile
from pathlib import Path
def blocked():
    print("E013 BLOCKED RUNNER_SOURCE_UNVERIFIED", flush=True)
    raise SystemExit(2)
try:
    root = Path.cwd().resolve()
    runner = root / "experiments/E013-jev-context-sufficiency/jev_context.py"
    args = sys.argv[1:]
    modes = ("--live", "--verify-local-run", "--publish-reviewed", "--verify-evidence")
    selected = [mode for mode in modes if args.count(mode) == 1]
    if len(selected) != 1:
        blocked()
    live = selected[0] == "--live"
    auth = None
    if live:
        if args.count("--live-authorization") != 1:
            blocked()
        authorization_index = args.index("--live-authorization")
        if authorization_index + 1 >= len(args):
            blocked()
        auth = Path(args[authorization_index + 1]).resolve()
        if not auth.is_relative_to(root):
            blocked()
        if args.count("--credential-file") != 1:
            blocked()
        credential_index = args.index("--credential-file")
        if credential_index + 1 >= len(args):
            blocked()
        credential_file = Path(args[credential_index + 1]).resolve()
    env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    env["GIT_NO_REPLACE_OBJECTS"] = "1"
    probe = subprocess.run(["/usr/bin/git", "-C", str(root), "rev-parse", "--show-toplevel", "--absolute-git-dir"], env=env, capture_output=True, check=True).stdout.decode().splitlines()
    marker = root / ".git"
    if len(probe) != 2 or Path(probe[0]).resolve() != root or marker.is_symlink():
        blocked()
    if marker.is_dir():
        expected_git_dir = marker.resolve()
    elif marker.is_file():
        pointer = marker.read_text().strip()
        if not pointer.startswith("gitdir: "):
            blocked()
        expected_git_dir = (root / pointer.removeprefix("gitdir: ")).resolve()
    else:
        blocked()
    git_dir = Path(probe[1]).resolve()
    if git_dir != expected_git_dir or not git_dir.is_dir():
        blocked()
    revision = subprocess.run(["/usr/bin/git", "--git-dir", str(git_dir), "--work-tree", str(root), "rev-parse", "HEAD^{commit}"], env=env, capture_output=True, check=True).stdout.decode().strip()
    if len(revision) != 40 or any(character not in "0123456789abcdef" for character in revision) or (live and revision != os.environ.pop("E013_PREFLIGHT_REVISION", None)):
        blocked()
    def committed(path):
        relative = path.relative_to(root).as_posix()
        return subprocess.run(["/usr/bin/git", "--git-dir", str(git_dir), "--work-tree", str(root), "show", f"{revision}:{relative}"], env=env, capture_output=True, check=True).stdout
    source = runner.read_bytes()
    if source != committed(runner):
        blocked()
    if live:
        authorization = auth.read_bytes()
        if authorization != committed(auth):
            blocked()
        document = json.loads(authorization)
        if not isinstance(document, dict) or hashlib.sha256(source).hexdigest() != document.get("runner_sha256"):
            blocked()
    else:
        evidence_tools = runner.with_name("evidence_tools.py")
        evidence_source = evidence_tools.read_bytes()
        if evidence_source != committed(evidence_tools):
            blocked()
    if live:
        if "TYPESAFE_API_KEY" in os.environ or not credential_file.is_file():
            blocked()
        lines = [line.strip() for line in credential_file.read_text().splitlines() if line.strip() and not line.lstrip().startswith("#")]
        if len(lines) != 1 or not lines[0].startswith("TYPESAFE_API_KEY="):
            blocked()
        key = lines[0].split("=", 1)[1].strip()
        if not key or "\n" in key or "\r" in key:
            blocked()
        os.environ["TYPESAFE_API_KEY"] = key
        del args[credential_index:credential_index + 2]
except (OSError, ValueError, TypeError, KeyError, UnicodeDecodeError, RecursionError, subprocess.CalledProcessError):
    blocked()
venv = runner.parent / ".venv"
sys.prefix = sys.exec_prefix = str(venv)
sys.path.append(str(venv / "lib/python3.12/site-packages"))
sys.pycache_prefix = tempfile.mkdtemp(prefix="e013-empty-pycache-")
sys.argv = [str(runner), *args]
if live:
    exec(compile(source, str(runner), "exec"), {"__name__": "__main__", "__file__": str(runner), "_E013_EXECUTED_SOURCE": source})
else:
    import types
    runner_module = types.ModuleType("jev_context")
    runner_module.__file__ = str(runner)
    runner_module._E013_EXECUTED_SOURCE = source
    sys.modules["jev_context"] = runner_module
    exec(compile(source, str(runner), "exec"), runner_module.__dict__)
    evidence_module = types.ModuleType("evidence_tools")
    evidence_module.__file__ = str(evidence_tools)
    sys.modules["evidence_tools"] = evidence_module
    exec(compile(evidence_source, str(evidence_tools), "exec"), evidence_module.__dict__)
    raise SystemExit(runner_module.main())
' --live \
  --freeze-attestation evaluation/context_sufficiency/versions/v1/freeze-attestation.json \
  --store-policy experiments/E013-jev-context-sufficiency/local-store-policy.json \
  --store-root /Users/andrew/coami-evidence/E013 \
  --live-authorization experiments/E013-jev-context-sufficiency/authorizations/<run_id>.json \
  --credential-file /Users/andrew/code/python/coami/experiments/E012-jev-text-policy/.env
```

For `--verify-local-run`, `--publish-reviewed`, and `--verify-evidence`, use the same authenticated Python 3.12 bootstrap above, omit `--credential-file` and the live-only arguments, and supply the selected evidence mode and its documented paths. The bootstrap installs both checked byte snapshots as Python modules before calling the runner's evidence entry point. Its Git checks invoke the fixed `/usr/bin/git` system executable, independent of `PATH` entries supplied by the environment. Do not execute `jev_context.py` directly for evidence operations: normal Python startup can run `.pth` or `sitecustomize` code before the verifier starts. The bootstrap requires the runner and evidence tool files to match committed `HEAD`; commit reviewed tool changes before using it. `--verify-evidence` accepts only the canonical tracked run directory, compares every public artifact with blobs from one resolved Git commit, then interprets the matching private byte snapshot. Evidence readers reject FIFOs, devices, and symlinks before opening them. These commands make no Jev call.

`.env` is an Owner-maintained, Git-ignored local credential file. Never print, hash, or commit it. The freeze attestation path above is tracked and verified; the local store path is approved for staging, not backed-up archival storage. Any later live run needs a new explicit Owner instruction. Before such a run, commit a dedicated JSON authorization record at `experiments/E013-jev-context-sufficiency/authorizations/<run_id>.json` and pass that path as `--live-authorization`. It must contain `run_id` (a new unique ID), `authorized_by: "Owner"`, `scope: "one E013 75-case Context Sufficiency run"`, `model: "jev-1.13.0"`, `freeze_attestation_sha256`, `store_policy_sha256`, `runner_sha256`, and `uv_lock_sha256`. The runner checks that its exact bytes and the synchronized lockfile are committed at HEAD and match this authorization, records the pre-run HEAD revision and canonical authorization path in the manifest, then consumes that run ID by exclusively creating `authorization-uses/<run_id>.json` in the approved store **before** creating `runs/<run_id>/` or calling Jev. Local and published verification use isolated Git to confirm that the retained authorization bytes occur at that recorded revision and path. The marker remains if the run directory is deleted; a failed run still consumes its authorization. This marker is outside the mutable run directory but remains owner-mutable local state without independent backup or tamper resistance. The manifest retains the authorization SHA-256. A committed record and its recorded revision are auditable but do not cryptographically prove when a call occurred or who approved it. The Owner's separate instruction and commit review establish that human decision. The completed historical run predates this record requirement; no retrospective pre-run authorization is asserted for it. The runner, freeze attestation, store policy, and `uv.lock` must each match their canonical committed `HEAD` bytes. Freeze attestation and store policy are each read once; validation, authorization and the manifest use those same byte snapshots. The historical run ID and IDs already present in tracked evidence are reserved.

Publication accepts a local run only at the approved store's exact `runs/<run_id>` path. Its private verification snapshot is created beside that run under the same approved `runs/` directory; a copied run in `/tmp` cannot be published as though its restricted evidence were still in the approved store.

Future run ID preflight also searches all locally reachable Git history for a prior `evidence/runs/<run_id>/manifest.json`, including one deleted from the current tree. An ID found there remains reserved. A shallow checkout cannot prove the absence of older history, so future live execution requires a complete local evidence history.

The runner writes an exclusive `runs/<run_id>/` in the local store: `manifest.json`, `runner.py` (the exact executing source), `authorization.json` (the exact committed one-run approval for future runs), `uv.lock` (the authorized environment snapshot), `events.jsonl`, `analysis.jsonl`, `summary.json`, exact emitted request bytes, and exact 2xx response bytes. The authorization JSON is limited to the eight documented fields, rejects duplicate keys and noncanonical bytes, and is checked against the tracked freeze, store-policy, runner, and lockfile hashes; the exact committed authorization snapshot is carried through preflight and retention. The bound documents must match their canonical paths and committed `HEAD` bytes before a live call. The freeze and store-policy gate documents retain their existing two-space JSON form and reject ambiguous or noncanonical bytes before authorization is consumed. Case source bytes are captured and hash-checked before the authorization marker, then the 75 requests use that same snapshot. The capture transport ignores inherited proxy and TLS environment settings. Only the historical run `20261008T035450Z-010364d7` predates this record and has no authorization snapshot or lock snapshot. Every other run without them is an explicit verification gap. Each body is keyed by `(run_id, group, case_id)` and has a SHA-256. A failed or interrupted run remains incomplete and is never overwritten or automatically resumed. `ERROR`, `UNKNOWN`, and `NOT_RUN` do not count as correct model predictions; `ERROR` and `UNKNOWN` accept only runner-defined codes, never free-form exception text. Captured 2xx JSON with duplicate fields is INVALID, with the original body still retained. Verify the local bytes after each run with `--verify-local-run --run-dir /Users/andrew/coami-evidence/E013/runs/<run_id>`; the verifier requires every retained request to match the pinned SDK's exact emitted bytes for its frozen case. The event log must exactly match each attempted row's `START` time and is included with its SHA-256 in future reviewed Git exports. A clean verification is a point-in-time integrity check, not a backup. Each new run retains its exact `store-policy.json` snapshot and SHA-256; the reviewed export carries the same bytes so later policy edits cannot silently change the meaning of old runs.

`private-evidence/` is ignored temporary staging only. After a local integrity check, a reviewer must inspect **each case's** exact analysis row and body for unexpected sensitive content, recording `safety_checked: true`, each exact analysis/body SHA-256, and `analysis_public`/`raw_public` decisions in an approval JSON with all 75 cases. The approval parser rejects duplicate keys, including conflicting visibility decisions. The summary also needs `summary_public: true`, `summary_safety_checked: true`, and `summary_sha256` of its exact reviewed bytes; its JSON must have unique keys, canonical bytes, and a timezone-aware generation time. API keys, authentication headers, non-2xx error bodies, and raw tracebacks must never enter Git. Run `--publish-reviewed --run-dir <local-run> --approval <review.json>` only after that review. The tool copies the bounded run inputs into a private temporary snapshot inside the approved local store, then verifies and publishes from that same snapshot so later changes to mutable source files cannot replace reviewed rows. It checks local hashes, oracle inventory, request evidence, parsed raw content, store-policy claims, fixed execution conditions, and summary identity before publishing through a temporary sibling directory. A failed write leaves no Git-visible run and can be retried. It publishes a field-limited `review.json` with 75 safety decisions, the exact `runner.py` source, and future runs' eight-field `authorization.json` and `uv.lock`; their SHA-256 values are bound in the manifest. Approved raw files are copied byte-for-byte; unapproved full rows and bodies remain local. Commit and push the reviewed evidence as a separate versioned topic; until then, the run is **local and unbacked**. If any case cannot be published, the Git index records a gap and later Agents need authorized local access to verify it. The index records stable relative locators, store ID, run version, hashes, access limits, and the absence of a retention promise.

From a clean checkout, `--verify-evidence --evidence-run <tracked-run> [--restricted-run <authorized-run>]` checks available objects, exact summary/review/runner hashes, raw-to-analysis agreement, fixed run conditions, valid status states, the freeze decision and frozen oracle membership; it reports explicit gaps. The accepted freeze, review and frozen v1/v0 sources must match committed `HEAD` bytes. Local and clean-checkout verification first authenticate the installed replay SDK and transitive dependency bytes against the pinned lock and digest baseline; a version string alone is insufficient. It reconstructs each emitted request byte string through that SDK and checks its recorded hash; with `--restricted-run`, it also requires the retained request bytes to match. Transport errors require retained request evidence. Parser-specific INVALID rows require the pinned SDK to accept the captured bytes before the local parser rejects them; non-JSON constants cannot form a valid response. It requires the public directory name to match the run ID, uses only reviewed manifest fields, enforces each analysis visibility decision, binds reviewer attribution to the retained review, and rejects duplicate or noncanonical analysis JSONL and review JSON. A `NOT_RUN` suffix must follow a stopping `UNKNOWN` or internal `ERROR`, and all cases after a stopping outcome must be `NOT_RUN`. Manifest creation must precede the first attempted case; summary generation must follow every attempted row. The public event log SHA-256 is checked even when restricted analysis is unavailable; exact event replay waits for all full rows. Captured probabilities retain their exact JSON numeric types; retained policy identity fields must be nonempty strings. A captured `UNKNOWN` body remains hash- and request-verified evidence without a model choice; `ERROR` cannot carry a captured body. Published manifests explicitly identify the restricted store and access limits. For future runs, verification compares the retained runner, lock, freeze attestation, and store policy with their Git bytes at the recorded authorization revision; review and summary interpretation uses the same byte snapshots that were hashed. The historical run requires the exact known Git runner revision `ad4e692d72ee9661c02697594cfd4aa93cf380a6`, which is also compared with its retained source. Its policy snapshot was added from the same historical commit and bound to the public manifest; the sealed original local run uses this tracked historical snapshot. Future threshold research may use the full research rows to propose candidates, then examine holdout separately, especially `INSUFFICIENT → SUFFICIENT`; E013 itself does not choose a threshold. A single mutable local directory has no independent retention or immutability guarantee, even after chmod; Git publication makes only the reviewed subset versioned and remotely retrievable.

For future runs, the authorization revision check hashes the same retained runner, lock, freeze and policy byte snapshots it compared with Git; the manifest runner hash and local `runner_source_path: "runner.py"` must also agree. A `VALID` captured response must be accepted by the pinned SDK as well as the E013 parser. The live bootstrap returns its fixed blocked result for non-object or excessively nested authorization JSON.

## Interpretation

The summary reports planned/attempted/valid/invalid/error/unknown/not-run counts, both error directions, and `correct/valid` separately from `correct/planned` for research, holdout, and v0. E012's earlier v0 result remains historical. A PR merge, technical check, or successful offline test does not freeze v1 or establish a product pass.
