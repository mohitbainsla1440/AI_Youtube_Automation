#!/bin/sh
cd "$(dirname "$0")/.."
exec /opt/homebrew/Cellar/node/25.9.0_1/bin/node node_modules/.bin/expo start 
