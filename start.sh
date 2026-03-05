#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
yarn tsx runner/index.js
