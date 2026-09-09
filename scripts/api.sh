#!/usr/bin/env bash
# API'yi başlatır. Java'yı kabuğun ortamına bırakmıyoruz (bkz. scripts/java-home.sh).
set -euo pipefail
JAVA_HOME="$(bash "$(dirname "$0")/java-home.sh")"
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
cd "$(dirname "$0")/../services/api"
exec ./gradlew "$@"
