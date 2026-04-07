#!/bin/sh
set -eu

exec java -Dserver.port="${PORT:-8080}" -jar /app/app.jar
