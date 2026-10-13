# E017 pinned toolchain bootstrap (macOS)

This procedure creates all three isolated tool source checkouts and their required executables from a fresh Coami checkout. It does not require E015 or an existing compiler cache. Run it in the **E017 feature worktree**, with no other build using its `web/generated/` directory.

Prerequisites: macOS arm64, Git, Python 3, Node 24–26 with npm, Xcode and its command-line tools / macOS SDK, CMake, and FreeType. With an existing Homebrew installation, `brew install cmake freetype` supplies the last two. `xcode-select -p` must identify an installed developer directory. This document does not install or switch Xcode for you.

## Fresh acquisition and builds

From the Coami repository root, initialize the recorded SDK gitlink; do not change its pin:

```sh
git submodule update --init vendor/stack-chan
cd experiments/E017-top-swipe-event/web
npm ci --ignore-scripts --no-audit --no-fund
export E017_WEB="$PWD"
export E017_NODE_BIN="$(dirname "$(command -v node)")"
mkdir -p "$E017_WEB/generated/toolchain"

# These clone destinations must be absent; no existing source tree is deleted.
git clone --filter=blob:none --no-checkout https://github.com/Moddable-OpenSource/moddable.git "$E017_WEB/generated/toolchain/moddable"
git -C "$E017_WEB/generated/toolchain/moddable" checkout --detach b6e06ba70506a7381ffb28e09e3175bf4e99f305
git clone --filter=blob:none --no-checkout https://github.com/emscripten-core/emsdk.git "$E017_WEB/generated/toolchain/emsdk"
git -C "$E017_WEB/generated/toolchain/emsdk" checkout --detach 14c18b569f55138fe4963924162244251f454fb0
git clone --filter=blob:none --no-checkout https://github.com/vladimirgamalyan/fontbm.git "$E017_WEB/generated/toolchain/fontbm"
git -C "$E017_WEB/generated/toolchain/fontbm" checkout --detach 7677b908523e909679f67cd5c170396bb9def1aa

export MODDABLE="$E017_WEB/generated/toolchain/moddable"
export EMSDK="$E017_WEB/generated/toolchain/emsdk"
export EM_CONFIG="$EMSDK/.emscripten"
export FONTBM_SOURCE="$E017_WEB/generated/toolchain/fontbm"
export FONTBM="$FONTBM_SOURCE/build/fontbm"

# Build Moddable's release tools (including xsc, xsl and mcconfig).
make -C "$MODDABLE/build/makefiles/mac" release

# Install the release selected by this exact emsdk checkout, then create its config.
"$EMSDK/emsdk" install 5.0.1
"$EMSDK/emsdk" activate 5.0.1
. "$EMSDK/emsdk_env.sh"

# Keep the experiment's Node 24–26 ahead of emsdk's bundled Node in PATH.
export PATH="$E017_NODE_BIN:$MODDABLE/build/bin/mac/release:$EMSDK/upstream/emscripten:$PATH"
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
npm run dev -- --port 5187
```

`prepare:poc` stages the pinned SDK plus the E017 patch, builds WASM, then builds the MOD. Do not run these stages concurrently. A standalone `npm run mod` checks the current `runtime/wasm-top-touch.patch` SHA-256 against the runtime provenance as well as the vendor pin. On `runtime patch mismatch`, rerun `npm run runtime` before `npm run mod` (or run `prepare:poc`); an old archive is removed before rejection. When an already open page sees changed runtime hashes or patch SHA-256, reload the whole page to replace its cached browser engine module. On another shell, re-export the variables above and source `emsdk_env.sh` before building; restore the Node 24–26 PATH precedence afterward.

To run source tests on a fresh checkout without building WASM, use `npm run stage:host` before `npm test`. The runtime boundary tests read the actual patched staging source. `stage:host` creates no WASM artifact.

## Provenance and verification limits

The original acceptance run used read-only copies of E015 tool sources **including its compiler cache**. The commits, versions and hashes in the original exported human traces describe those actual binaries. A fresh bootstrap produces its own tool/runtime/MOD hashes via `prepare:poc`; it is not promised to reproduce the old hashes byte for byte across compiler, FreeType or OS versions. Preserve historical traces rather than rewriting their provenance to match a new build.

This review change's bootstrap commands were checked against the pinned source makefiles, emsdk release mapping and fontbm CMake project, and shell syntax was checked. A complete new network acquisition / cold WASM build was **not executed** as part of the documentation fix. Existing isolated sources were used to verify standalone MOD build and the SDK pin rejection tests. No E015 build or original vendor source was changed.

Pinned upstream procedure sources (also present in these checkouts):

- [Moddable macOS makefile](https://github.com/Moddable-OpenSource/moddable/blob/b6e06ba70506a7381ffb28e09e3175bf4e99f305/build/makefiles/mac/makefile)
- [emsdk README](https://github.com/emscripten-core/emsdk/blob/14c18b569f55138fe4963924162244251f454fb0/README.md) and [release mapping](https://github.com/emscripten-core/emsdk/blob/14c18b569f55138fe4963924162244251f454fb0/emscripten-releases-tags.json)
- [fontbm build instructions](https://github.com/vladimirgamalyan/fontbm/blob/7677b908523e909679f67cd5c170396bb9def1aa/README.md) and [CMake project](https://github.com/vladimirgamalyan/fontbm/blob/7677b908523e909679f67cd5c170396bb9def1aa/CMakeLists.txt)
