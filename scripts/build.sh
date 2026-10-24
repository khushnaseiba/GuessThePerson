#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v cargo >/dev/null 2>&1; then
    printf '%s\n' "cargo is required. Install Rust from https://rustup.rs and retry."
    exit 1
fi
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/guess_person_wasm.wasm web/game.wasm
printf '%s\n' "Built web/game.wasm"
