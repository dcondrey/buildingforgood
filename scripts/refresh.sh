#!/usr/bin/env bash
# Monthly refresh, run by a person. Not scheduled, not automated.
#
#   ./scripts/refresh.sh                 # fetch, audit, contract-check, write
#   ./scripts/refresh.sh --dry-run       # every check, nothing written
#   ./scripts/refresh.sh --no-fetch      # use the raw files already on disk
#   ./scripts/refresh.sh --fixture       # committed synthetic fixture, no network
#
# Any other flags are passed straight through to stillhere_pipeline.refresh.
# Read docs/project/REFRESH.md before the first run.
#
# Every way this script can stop prints `REFRESH FAILED:` and a sentence a
# non-developer can act on or hand to a technical contact. That is deliberate:
# the first thing an adopting program director sees when setup goes wrong used
# to be a pip or venv traceback, which told them nothing.
set -euo pipefail
cd "$(dirname "$0")/.."

MIN_PYTHON="3.11"
CONTACT="If you are not sure what to do with this, stop and send this whole message to your technical contact (section 11 of docs/adoption/RUNBOOK.md). Nothing has been written and the site still shows the last good numbers."

# `REFRESH FAILED: <sentence>`, then any number of indented follow-on lines.
# Printed on stdout to match stillhere_pipeline.refresh, so an operator who
# pipes this command to a log file still sees why it stopped.
fail() {
  echo ""
  echo "REFRESH FAILED: $1"
  shift
  local line
  for line in "$@"; do
    # Indent every line of the argument, not just its first: several of these
    # carry a multi-line excerpt of what a tool reported.
    printf '%s\n' "$line" | sed 's/^/  /'
  done
  exit 1
}

FETCH=1
SOURCE=bundle
PASSTHROUGH=()
for arg in "$@"; do
  case "$arg" in
    --no-fetch) FETCH=0 ;;
    --fixture) SOURCE=fixture; FETCH=0 ;;
    *) PASSTHROUGH+=("$arg") ;;
  esac
done

echo "== [0/2] checking prerequisites =="

if [ ! -w . ]; then
  fail "this copy of the project is read-only, so the refresh cannot set itself up here." \
    "The folder is $(pwd)." \
    "Either move the project somewhere you can write to (your home folder, not a read-only disk or a shared drive mounted read-only), or ask whoever set up this machine for write permission on that folder." \
    "$CONTACT"
fi

if ! command -v python3 >/dev/null 2>&1; then
  fail "this computer does not have Python installed, and the refresh cannot run without it." \
    "You need Python ${MIN_PYTHON} or newer." \
    "On a Mac: install it from https://www.python.org/downloads/ (the big yellow download button is the right one)." \
    "On Ubuntu or Debian Linux: run  sudo apt install python3 python3-venv" \
    "On Windows: use the Microsoft Store's \"Python 3\" app, and run this command from a WSL or Git Bash terminal." \
    "$CONTACT"
fi

FOUND_PYTHON="$(python3 -c 'import platform; print(platform.python_version())' 2>/dev/null || echo unknown)"
if ! python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' >/dev/null 2>&1; then
  fail "the Python on this computer is too old for the refresh." \
    "Found Python ${FOUND_PYTHON} at $(command -v python3); the pipeline needs ${MIN_PYTHON} or newer." \
    "Installing a newer Python from https://www.python.org/downloads/ is enough — you do not have to remove the old one." \
    "$CONTACT"
fi

# An existing .venv that cannot run Python is the single most confusing state
# to land in: every later command fails with a different error. Name it once,
# here, with the one-line fix.
if [ -d .venv ] && ! .venv/bin/python -c '' >/dev/null 2>&1; then
  fail "the project's private Python folder (.venv) is damaged and cannot be used." \
    "This usually happens after the computer's Python was upgraded or moved, or after a previous setup was interrupted." \
    "The fix is safe and loses nothing: delete the .venv folder inside $(pwd) and run this command again. It will rebuild itself, which takes a few minutes." \
    "On a Mac or Linux terminal that is:  rm -rf .venv"
fi

CREATED_VENV=0
if [ ! -d .venv ]; then
  echo "first run: setting up the project's own Python tools."
  echo "This takes a few minutes and prints almost nothing. That is normal — do not interrupt it."
  # `mktemp -t NAME` is a prefix to BSD/macOS and a template needing trailing
  # X's to GNU coreutils. The bare form works on a Mac and dies on Linux with
  # "too few X's in template" — which is exactly the kind of shell error this
  # script exists to keep away from a non-developer.
  VENV_LOG="$(mktemp "${TMPDIR:-/tmp}/stillhere-venv.XXXXXX")"
  trap 'rm -f "$VENV_LOG"' EXIT
  if ! python3 -m venv .venv >"$VENV_LOG" 2>&1; then
    # A half-built .venv makes the next run fail somewhere else. Remove the
    # one this run created so the failure stays reproducible.
    rm -rf .venv
    fail "the refresh could not create its private Python folder (.venv), so it has not run." \
      "Python ${FOUND_PYTHON} reported:" \
      "$(sed -n '1,6p' "$VENV_LOG" | sed 's/^/    /')" \
      "On Ubuntu or Debian this usually means one more package is needed:  sudo apt install python3-venv" \
      "Otherwise the most common causes are a full disk or a folder this account cannot write to." \
      "$CONTACT"
  fi
  CREATED_VENV=1
fi

# Skip the install when the environment already matches pipeline/pyproject.toml.
# Without this, a monthly refresh on a machine that is set up but offline fails
# at pip for no reason: the tools it wants are already there.
PIN_STAMP=".venv/.stillhere-pipeline-install"
PYPROJECT_DIGEST="$(python3 - <<'PY'
import hashlib, pathlib
print(hashlib.sha256(pathlib.Path("pipeline/pyproject.toml").read_bytes()).hexdigest())
PY
)"
NEED_INSTALL=1
if [ -f "$PIN_STAMP" ] && [ "$(cat "$PIN_STAMP")" = "$PYPROJECT_DIGEST" ] \
   && .venv/bin/python -c 'import stillhere_pipeline' >/dev/null 2>&1; then
  NEED_INSTALL=0
fi

if [ "$NEED_INSTALL" -eq 1 ]; then
  if [ "$CREATED_VENV" -eq 0 ]; then
    echo "installing the pipeline's tools; this needs the internet and prints almost nothing."
  fi
  PIP_LOG="$(mktemp "${TMPDIR:-/tmp}/stillhere-pip.XXXXXX")"
  trap 'rm -f "${VENV_LOG:-}" "$PIP_LOG"' EXIT
  if ! .venv/bin/pip install --quiet -e "pipeline[dev]" >"$PIP_LOG" 2>&1; then
    if grep -qiE 'network|resolve|proxy|timed out|timeout|connection|ssl|certificate|temporary failure|getaddrinfo|retries exceeded' "$PIP_LOG"; then
      fail "the refresh could not download the tools it needs, so it has not run." \
        "This is almost always the internet connection, a workplace proxy, or a firewall — not a problem with the data." \
        "Check that this computer is online, then run the command again. If your organization uses a proxy or blocks package downloads, your technical contact will need to set that up once." \
        "The installer reported:" \
        "$(grep -iE 'error|ERROR' "$PIP_LOG" | sed -n '1,4p' | sed 's/^/    /')" \
        "$CONTACT"
    fi
    fail "the refresh could not install the tools it needs, so it has not run." \
      "The installer reported:" \
      "$(sed -n '1,8p' "$PIP_LOG" | sed 's/^/    /')" \
      "$CONTACT"
  fi
  printf '%s' "$PYPROJECT_DIGEST" > "$PIN_STAMP"
fi

if ! .venv/bin/python -c 'import stillhere_pipeline' >/dev/null 2>&1; then
  fail "the pipeline is not installed in the project's Python folder even though setup reported success." \
    "Delete the .venv folder inside $(pwd) and run this command again:  rm -rf .venv" \
    "If it happens twice, this is not something to work around." \
    "$CONTACT"
fi

if [ "$FETCH" -eq 1 ]; then
  for tool in curl sha256sum; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      case "$tool" in
        curl) how="On a Mac, curl normally ships with the system, so its absence means something has changed on this machine. On Ubuntu or Debian:  sudo apt install curl" ;;
        *) how="On a Mac:  brew install coreutils  (macOS ships \`shasum\` under a different name). On Ubuntu or Debian it is already there as part of coreutils." ;;
      esac
      fail "the download step needs the \`${tool}\` command and this computer does not have it." \
        "You can still run every check against the files already on disk, without downloading anything:  ./scripts/refresh.sh --no-fetch" \
        "$how" \
        "$CONTACT"
    fi
  done
fi

echo "prerequisites OK (Python ${FOUND_PYTHON})"

if [ "$FETCH" -eq 1 ]; then
  echo "== [1/2] fetch and verify public monitoring sources =="
  if ! ./scripts/fetch_raw.sh monitoring; then
    fail "the published source files could not be downloaded or did not match their recorded fingerprints, so nothing has been rebuilt." \
      "The lines above this message say which file and why. There are two very different cases:" \
      "  * \"fetching …\" followed by a curl error means the download failed — check the internet connection and run the command again." \
      "  * a checksum line reading FAILED means the file downloaded but is not the one this project recorded. Do NOT re-record it to make this go away; find out what the publisher changed first." \
      "$CONTACT"
  fi
else
  echo "== [1/2] fetch skipped =="
fi

echo "== [2/2] audit, contract-check, emit =="
# The Python side never touches the network. It verifies pins, audits the
# monitoring table, revalidates the full demo contract and the privacy gate,
# and writes only if all of that passes.
set +e
.venv/bin/python -m stillhere_pipeline.refresh --source "$SOURCE" ${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}
STATUS=$?
set -e
if [ "$STATUS" -eq 1 ]; then
  # The Python side already printed `REFRESH FAILED:` and its own reason.
  exit 1
fi
if [ "$STATUS" -ne 0 ]; then
  fail "the refresh stopped unexpectedly and nothing has been written." \
    "The lines above are a programmer's error report, not something you can act on." \
    "Send this whole terminal output to your technical contact (section 11 of docs/adoption/RUNBOOK.md). The site still shows the last good numbers."
fi

echo ""
echo "REFRESH COMPLETE — now run ./scripts/verify.sh before publishing."
