# E021 pinned toolchain bootstrap (macOS)

This procedure creates all three isolated tool source checkouts and their required executables from a fresh Coami checkout. It does not require E015 or an existing compiler cache. Run it in the **E021 feature worktree**, with no other build using its `web/generated/` directory.

Prerequisites: macOS arm64, Git, Python 3, Node 24–26 with npm, Xcode and its command-line tools / macOS SDK, CMake, and FreeType. With an existing Homebrew installation, `brew install cmake freetype` supplies the last two. `xcode-select -p` must identify an installed developer directory. This document does not install or switch Xcode for you.

## Fresh acquisition and builds

From the Coami repository root, initialize the recorded SDK gitlink; do not change its pin:

```sh
git submodule update --init vendor/stack-chan
cd experiments/E021-imu-event/web
npm ci --ignore-scripts --no-audit --no-fund
export E021_WEB="$PWD"
export E021_NODE_BIN="$(dirname "$(command -v node)")"
mkdir -p "$E021_WEB/generated/toolchain"

# These clone destinations must be absent; no existing source tree is deleted.
git clone --filter=blob:none --no-checkout https://github.com/Moddable-OpenSource/moddable.git "$E021_WEB/generated/toolchain/moddable"
git -C "$E021_WEB/generated/toolchain/moddable" checkout --detach b6e06ba70506a7381ffb28e09e3175bf4e99f305
git clone --filter=blob:none --no-checkout https://github.com/emscripten-core/emsdk.git "$E021_WEB/generated/toolchain/emsdk"
git -C "$E021_WEB/generated/toolchain/emsdk" checkout --detach 14c18b569f55138fe4963924162244251f454fb0
git clone --filter=blob:none --no-checkout https://github.com/vladimirgamalyan/fontbm.git "$E021_WEB/generated/toolchain/fontbm"
git -C "$E021_WEB/generated/toolchain/fontbm" checkout --detach 7677b908523e909679f67cd5c170396bb9def1aa

export MODDABLE="$E021_WEB/generated/toolchain/moddable"
export EMSDK="$E021_WEB/generated/toolchain/emsdk"
export EM_CONFIG="$EMSDK/.emscripten"
export FONTBM_SOURCE="$E021_WEB/generated/toolchain/fontbm"
export FONTBM="$FONTBM_SOURCE/build/fontbm"

# Build Moddable's release tools (including xsc, xsl and mcconfig).
make -C "$MODDABLE/build/makefiles/mac" release

# Install the release selected by this exact emsdk checkout, then create its config.
"$EMSDK/emsdk" install 5.0.1
"$EMSDK/emsdk" activate 5.0.1
. "$EMSDK/emsdk_env.sh"

# Keep the experiment's Node 24–26 ahead of emsdk's bundled Node in PATH.
export PATH="$E021_NODE_BIN:$MODDABLE/build/bin/mac/release:$EMSDK/upstream/emscripten:$PATH"
cmake -S "$FONTBM_SOURCE" -B "$FONTBM_SOURCE/build" -DCMAKE_BUILD_TYPE=Release
cmake --build "$FONTBM_SOURCE/build" --target fontbm

node --version
emcc --version
command -v mcconfig
command -v xsc
test -x "$FONTBM"
```

`emcc --version` must report 5.0.1 with source `8c5f43157a3f069ade75876e23061330521eabde`. The emsdk release archive ID is a different identifier: this checkout's `emscripten-releases-tags.json` maps 5.0.1 to `bf32ae8b61ac8efeb7eca01b54c8307f992724f7`. Do not substitute `latest` or a globally installed compiler.

Check tracked source cleanliness; generated untracked tool outputs are expected:

```sh
git -C "$MODDABLE" status --porcelain --untracked-files=no
git -C "$EMSDK" status --porcelain --untracked-files=no
git -C "$FONTBM_SOURCE" status --porcelain --untracked-files=no
```

All three commands must print nothing. `prepare-runtime.mjs` independently verifies exact source HEADs, tracked cleanliness, isolated paths, compiler version and executable paths before building.

## Build the experiment

Continue in the same shell (and `web/` directory):

```sh
npm run prepare:poc
npm test
npm run build
npm run dev -- --port 5191
```

`prepare:poc` stages the pinned SDK plus the E021 patch, builds WASM, then builds the MOD. Do not run these stages concurrently. A standalone `npm run mod` checks the current `runtime/wasm-imu.patch` SHA-256 against the runtime provenance as well as the vendor pin. On `runtime patch mismatch`, rerun `npm run runtime` before `npm run mod` (or run `prepare:poc`); an old archive is removed before rejection. When an already open page sees changed runtime hashes or patch SHA-256, reload the whole page to replace its cached browser engine module. On another shell, re-export the variables above and source `emsdk_env.sh` before building; restore the Node 24–26 PATH precedence afterward.

To run source tests on a fresh checkout without building WASM, use `npm run stage:host` before `npm test`. The runtime boundary tests read the actual patched staging source. `stage:host` creates no WASM artifact.

## Provenance and verification limits

This E021 run made isolated copy-on-write copies of the existing E019 Moddable, emsdk and fontbm source trees **including their installed compiler payload and caches**, under E021 `web/generated/toolchain/`. The E019 sources were only read. The E021 emsdk config was rewritten to its isolated paths; EM_CONFIG and EM_CACHE point inside E021. No full fresh network acquisition/cold toolchain bootstrap was executed. The fresh bootstrap commands above describe how to acquire the same source pins; they do not promise byte-identical binaries across hosts.

`prepare:poc` executed the E021 SDK patch build and MOD compilation successfully. Its provenance records the actual source pins, tool executable hashes and runtime/MOD hashes. Existing historical tests or human traces from other experiments are not E021 evidence. **E021 human and hardware validation have not executed.** Runtime browser attempts and failures are recorded independently from compilation/source tests.

A real browser run revealed that pinned Moddable 9.5.0 `modules/base/time/wasm/modTime.c` has an empty `xs_time_ticks()` implementation. Therefore the original SDK's `Time.ticks` is undefined on this pinned WASM platform. The owner authorized the bounded scratch clock extension. The E021 patch excludes the default time module mapping, selects a Time alias wrapper, and extends a byte-identical copy of pinned time.js. Only ticks uses native emscripten_get_now(); other APIs inherit the pinned implementation. prepare-runtime checks the copy against the original pinned tool source and records both original Time JS/C hashes. Original tool and SDK recognition sources remain unchanged. The final actual browser run passed 53/53 checks using this real monotonic clock. Historical failures remain recorded; no fake case clock is used.

Pinned upstream procedure sources (also present in these checkouts):

- [Moddable macOS makefile](https://github.com/Moddable-OpenSource/moddable/blob/b6e06ba70506a7381ffb28e09e3175bf4e99f305/build/makefiles/mac/makefile)
- [emsdk README](https://github.com/emscripten-core/emsdk/blob/14c18b569f55138fe4963924162244251f454fb0/README.md) and [release mapping](https://github.com/emscripten-core/emsdk/blob/14c18b569f55138fe4963924162244251f454fb0/emscripten-releases-tags.json)
- [fontbm build instructions](https://github.com/vladimirgamalyan/fontbm/blob/7677b908523e909679f67cd5c170396bb9def1aa/README.md) and [CMake project](https://github.com/vladimirgamalyan/fontbm/blob/7677b908523e909679f67cd5c170396bb9def1aa/CMakeLists.txt)
