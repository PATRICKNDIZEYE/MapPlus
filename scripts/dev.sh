#!/usr/bin/env bash
# One-shot dev bootstrap for mallGuide.
#
# What it does, in order:
#   1. Kills anything squatting on the API + Web dev ports (3000, 3001).
#   2. Brings up Postgres + Redis + MinIO via Docker Compose (if Docker is
#      running and the containers aren't already up).
#   3. Waits for Postgres to accept connections.
#   4. Boots `turbo dev` — runs apps/api (NestJS) and apps/web (Next.js)
#      in parallel with interleaved logs.
#
# Usage:  pnpm up        (preferred — defined in root package.json)
#         bash scripts/dev.sh

set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly PORTS=(3000 3001)
readonly DOCKER_SERVICES=(postgres redis minio)

c_green="$(printf '\033[32m')"
c_blue="$(printf '\033[34m')"
c_yellow="$(printf '\033[33m')"
c_dim="$(printf '\033[2m')"
c_reset="$(printf '\033[0m')"

log() { printf "${c_blue}▸${c_reset} %s\n" "$*"; }
ok()  { printf "${c_green}✓${c_reset} %s\n" "$*"; }
warn(){ printf "${c_yellow}!${c_reset} %s\n" "$*"; }

# ── 1. Free the dev ports ───────────────────────────────────────────────────
log "Clearing dev ports: ${PORTS[*]}"
for port in "${PORTS[@]}"; do
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    ok "Killed process(es) on :$port (${pids//$'\n'/, })"
  fi
done

# ── 2. Docker services ──────────────────────────────────────────────────────
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if [[ -f "$ROOT/docker-compose.yml" ]]; then
    log "Starting Docker services: ${DOCKER_SERVICES[*]}"
    (cd "$ROOT" && docker compose up -d "${DOCKER_SERVICES[@]}" 2>&1 | sed "s/^/${c_dim}docker:${c_reset} /")
    ok "Docker services up"
  else
    warn "docker-compose.yml not found — skipping container startup"
  fi
else
  warn "Docker not running — assuming you have Postgres/Redis/MinIO running natively"
fi

# ── 3. Wait for Postgres ────────────────────────────────────────────────────
if command -v pg_isready >/dev/null 2>&1; then
  log "Waiting for Postgres…"
  for i in {1..20}; do
    if pg_isready -h localhost -p 5434 -q 2>/dev/null || pg_isready -h localhost -q 2>/dev/null; then
      ok "Postgres ready"
      break
    fi
    sleep 0.5
    if [[ $i -eq 20 ]]; then warn "Postgres didn't respond — proceeding anyway"; fi
  done
fi

# ── 4. Boot the apps ────────────────────────────────────────────────────────
echo
log "Booting mallGuide (Ctrl-C to stop everything)"
echo "  ${c_dim}Web:${c_reset}  http://localhost:3000"
echo "  ${c_dim}API:${c_reset}  http://localhost:3001/trpc"
echo

cd "$ROOT"
exec pnpm dev
