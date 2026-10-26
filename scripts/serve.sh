#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/../web"
exec python3 -m http.server 8000
