import hashlib
import json
import math
import subprocess
from pathlib import Path

SOURCE_COMMIT = "e9915ec49cf762e2d32a61f427036345a1b1670d"
RUN_ID = "WASM-2026-10-16T08-20-00-487Z"
DEPENDENCY_TREE_SHA256 = (
    "ddf57ff8eeb7942c197e8c12eea145bd4fa894ff0a6fb0d40302dc5953d7159d"
)


class AuditError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise AuditError(message)


def verify_sources(root, hashes, source_commit=SOURCE_COMMIT):
    repo = root.parent.parent
    for file, expected in hashes.items():
        blob = subprocess.check_output(
            [
                "git",
                "show",
                f"{source_commit}:experiments/E023-target-offset-gaze/{file}",
            ],
            cwd=repo,
        )
        require(
            hashlib.sha256(blob).hexdigest() == expected,
            f"recorded source mismatch: {file}",
        )


def verify_build(root, report, inputs):
    build = report.get("build")
    require(
        build and build.get("kind") == "clean build immediately before preview",
        "source-bound build manifest required",
    )
    sources = build["sourcesSha256"]
    dist = build["distSha256"]
    dependencies = build.get("dependencies")
    require(
        dependencies
        and dependencies.get("command")
        == ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"],
        "clean dependency install attestation required",
    )
    require(
        dependencies["lockSha256"] == sources["web/package-lock.json"],
        "dependency lock mismatch",
    )
    require(
        dependencies["installedTreeSha256"] == DEPENDENCY_TREE_SHA256,
        "dependency tree mismatch",
    )
    require(
        dependencies["preparedEmptyDirectories"] == [".vite-temp"],
        "dependency baseline setup mismatch",
    )
    require(sources == inputs["sha256"], "source-inputs/build manifest mismatch")
    prefix = "experiments/E023-target-offset-gaze/"
    repo = root.parent.parent
    tracked = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", SOURCE_COMMIT, "--", prefix],
        cwd=repo,
        text=True,
    ).splitlines()
    explicit = {
        "web/package.json",
        "web/package-lock.json",
        "web/vite.config.ts",
        "web/tsconfig.json",
        "web/index.html",
        "server/pyproject.toml",
        "server/uv.lock",
    }
    required = {
        f[len(prefix) :]
        for f in tracked
        if f[len(prefix) :].startswith(("web/src/", "web/scripts/", "mod/"))
        or (f[len(prefix) :].startswith("server/") and f.endswith(".py"))
    } | explicit
    actual = {f for f in sources if not f.startswith("web/generated/public/")}
    require(actual == required, "incomplete recorded source set")
    verify_sources(root, {f: sources[f] for f in actual})
    public = {
        f.removeprefix("web/generated/public/"): h
        for f, h in sources.items()
        if f.startswith("web/generated/public/")
    }
    assets = {"assets/" + f: h for f, h in report["bundleSha256"].items()}
    require(
        public
        and any(f.endswith(".js") for f in assets)
        and any(f.endswith(".css") for f in assets)
        and (set(dist) == set(public) | set(assets) | {"index.html"}),
        "incomplete dist manifest",
    )
    require(
        all((dist[f] == h for f, h in (public | assets).items())),
        "bundle/public hash mismatch",
    )
    pin = json.loads(
        subprocess.check_output(
            ["git", "show", f"{SOURCE_COMMIT}:{prefix}web/src/runtime-pin.json"],
            cwd=repo,
        )
    )
    require(
        build["vendorSourceCommit"]
        == pin["sourceCommit"]
        == report["provenance"]["sourceCommit"],
        "vendor pin mismatch",
    )
    gitlink = subprocess.check_output(
        ["git", "rev-parse", f"{SOURCE_COMMIT}:vendor/stack-chan"], cwd=repo, text=True
    ).strip()
    require(gitlink == pin["sourceCommit"], "vendor gitlink mismatch")
    for file, digest in pin["hashes"].items():
        require(
            report["provenance"]["hashes"][file] == dist["simulator/" + file] == digest,
            "runtime pin mismatch",
        )
    require(
        dist["coami-mod.xsa"] == report["provenance"]["hashes"]["coami-mod.xsa"],
        "MOD archive mismatch",
    )
    mod = report.get("mod")
    require(
        mod and mod == report["provenance"].get("modBuild"),
        "MOD compiler attestation required",
    )
    require(mod["dependencies"] == dependencies, "MOD compiler dependency mismatch")
    require(
        mod["archiveSha256"] == dist["coami-mod.xsa"], "MOD compiler archive mismatch"
    )
    require(
        mod["sources"]
        == {file: sources["mod/" + file] for file in ["mod.ts", "protocol.ts"]},
        "MOD compiler source mismatch",
    )
    python = report.get("python")
    expected_python = json.loads(
        (root / "evidence/python-attestation.json").read_text()
    )
    require(python and python == expected_python, "Python runtime attestation mismatch")
    require(
        python["version"] == "3.12.12"
        and python["setup"]
        == ["uv venv --clear --python 3.12.12 .venv", "uv sync --locked --reinstall"]
        and python["launchFlags"] == ["-I", "-B"],
        "Python locked recreation required",
    )
    require(
        python["lockSha256"] == sources["server/uv.lock"]
        and python["projectSha256"] == sources["server/pyproject.toml"],
        "Python source lock mismatch",
    )
    provenance_bytes = (json.dumps(report["provenance"], indent=2) + "\n").encode()
    require(
        hashlib.sha256(provenance_bytes).hexdigest() == dist["runtime-provenance.json"],
        "runtime provenance bytes mismatch",
    )
    for file, digest in report["provenance"]["sources"].items():
        if file.startswith("mod/"):
            require(sources[file] == digest, "MOD source mismatch")
        else:
            require(file.startswith("vendor/web/"), "unexpected vendor provenance path")
            blob = subprocess.check_output(
                [
                    "git",
                    "show",
                    pin["sourceCommit"] + ":" + file.removeprefix("vendor/"),
                ],
                cwd=repo / "vendor/stack-chan",
            )
            require(
                hashlib.sha256(blob).hexdigest() == digest, "vendor source mismatch"
            )


def verify_case_ids(cases):
    expected_ids = {f"TC-E2E-{i:02}" for i in range(1, 16)}
    require(
        len(cases) == 15 and {c["id"] for c in cases} == expected_ids,
        "expected exactly 15 distinct cases",
    )


def verify_sdk_target(actual, expected):
    for vector in [actual, expected]:
        require(
            isinstance(vector, list)
            and len(vector) == 3
            and all(type(v) in (int, float) and math.isfinite(v) for v in vector),
            "SDK target requires exactly three finite numeric components",
        )
    require(
        all(abs(actual[i] - expected[i]) < 1e-9 for i in range(3)),
        "SDK target mismatch",
    )


def audit(root):
    r = root / "evidence/wasm-runs" / RUN_ID
    report = json.loads((r / "report.json").read_text())
    inputs = json.loads((r / "source-inputs.json").read_text())
    verify_case_ids(report["cases"])
    require(report["errors"] == [], "evidence validation failed")
    verify_build(root, report, inputs)
    rows = []
    for case in report["cases"]:
        d = json.loads((r / case["file"]).read_text())
        records = d["records"]
        traces = []
        require(
            d["case"]["id"] == case["id"] and d["result"] == case["result"],
            "case file identity/result mismatch",
        )
        require(
            d["provenance"] == report["provenance"], "case runtime provenance mismatch"
        )
        for x in records:
            if x["kind"] == "trace" and x["text"].startswith("COAMI23|"):
                traces.append(json.loads(x["text"].split("|", 1)[1]))
        frames = [x for x in records if x["kind"] == "frame-committed"]
        probes = [x for x in traces if x.get("phase") == "probe"]
        decoded = [x for x in traces if x.get("phase") == "decoded"]
        returned = [x for x in traces if x.get("phase") == "returned"]
        decisions = [x for x in records if x["kind"] == "decision-observation"]
        windows = [x for x in records if x["kind"] == "window-observation"]
        init = [x for x in records if x["kind"] == "initial-pose"]
        require(
            case["probe"]
            and len(probes) == 6
            and (len(init) == 1)
            and (init[0]["error_radians"] <= math.pi / 180),
            "evidence validation failed",
        )
        require(
            not [x for x in traces if x.get("phase") in ["failed", "init-failed"]],
            "evidence validation failed",
        )
        require(
            len(returned) == case["sdkCalls"] == case["result"]["controls"],
            "evidence validation failed",
        )
        require(
            len(decoded) == len(frames) == 6 + len(returned),
            "evidence validation failed",
        )
        for f in frames:
            matches = [x for x in decoded if x["seq"] == f["seq"]]
            require(len(matches) == 1, "SDK target decoded identity mismatch")
            verify_sdk_target(matches[0].get("target"), f.get("expected"))
        for ret in returned:
            matches = [f for f in frames if f["seq"] == ret["seq"] and not f["probe"]]
            require(len(matches) == 1, "SDK target returned identity mismatch")
            verify_sdk_target(ret.get("target"), matches[0].get("expected"))
            require(
                len(
                    [
                        w
                        for w in windows
                        if w["command_id"] == d["run_id"] + ":" + str(ret["seq"])
                    ]
                )
                >= 19,
                "evidence validation failed",
            )
        if case["result"]["state"] == "成功":
            require(
                all(all(abs(v) <= 0.1 for v in x["offset"]) for x in decisions[-3:])
                and len(decisions) >= 3,
                "evidence validation failed",
            )
        else:
            require(
                case["result"]["reason"] == "iteration_limit" and len(returned) == 20,
                "evidence validation failed",
            )
        first, last = (decisions[0], decisions[-1])
        rows.append(
            {
                "id": case["id"],
                "state": case["result"]["state"],
                "controls": len(returned),
                "probe_frames": len(probes),
                "initial_error_radians": init[0]["error_radians"],
                "first_offset": first["offset"],
                "last_offset": last["offset"],
                "decision_observations": len(decisions),
                "window_observations": len(windows),
                "max_quaternion_delta_from_initial": max(
                    (
                        abs(a - b)
                        for x in decisions
                        for a, b in zip(x["quaternion"], first["quaternion"])
                    )
                ),
            }
        )
    require(
        report["state"]
        == ("成功" if all(c["state"] == "成功" for c in rows) else "失敗"),
        "suite result mismatch",
    )
    out = {
        "audit": "PASS",
        "run_id": report["runId"],
        "source_inputs_match": True,
        "source_commit": SOURCE_COMMIT,
        "source_verification": "clean-build manifest bound to immutable Git source blobs and recorded complete dist hashes",
        "build_manifest_match": True,
        "dependency_tree_verified": True,
        "mod_compiler_verified": True,
        "python_runtime_verified": True,
        "python_attestation": "python-attestation.json",
        "dependency_tree_sha256": DEPENDENCY_TREE_SHA256,
        "browser_exceptions": 0,
        "total_probe_frames": sum(x["probe_frames"] for x in rows),
        "total_sdk_calls": sum(x["controls"] for x in rows),
        "cases": rows,
    }
    return out


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    out = audit(root)
    (root / "evidence/wasm-evidence-audit-current.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n"
    )
    print(json.dumps(out, ensure_ascii=False, indent=2))
