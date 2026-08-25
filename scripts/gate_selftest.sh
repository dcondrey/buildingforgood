#!/usr/bin/env bash
# Prove that the two gates without a known-bad fixture can actually fail.
#
# `DECISIONS.md`, 2026-08-24: a gate nobody has watched fail is not a gate.
# Adding a check and observing it pass is not evidence, because a check wired to
# nothing passes too. Four gates already had a known-bad input — ten mutants for
# the planner, fourteen negative cases for the claim inventory, leak fixtures for
# the privacy scanner, one known-bad line per rule for the portability lint.
#
# Two did not: the refusal suite (verify stage 3) and the adversarial harnesses
# (stage 4). They were covered indirectly, by the mutation gate's
# complaint-signal mutant and by having been watched failing during the session
# that wired them in, which is weaker than a fixture and was named as such.
#
# This is the fixture. Each case breaks one guard, runs ONLY the stage that is
# supposed to notice, and fails loudly if that stage stays green. It is not part
# of `verify.sh`: it deliberately edits tracked source, so it refuses to run
# against a dirty tree and restores what it touched.
set -uo pipefail
cd "$(dirname "$0")/.."

for f in app/src/domain/vocabulary/refusedTerms.ts app/src/domain/cost/cost.ts; do
  if ! git diff --quiet -- "$f"; then
    echo "refusing to run: $f has uncommitted changes." >&2
    echo "This script rewrites tracked files in place; commit or stash first." >&2
    exit 1
  fi
done

restore() { git checkout -- app/src/domain/vocabulary/refusedTerms.ts app/src/domain/cost/cost.ts; }
trap restore EXIT

fail=0

# Both gates grade by a suite failing, so a suite that is already failing would
# make every case below look caught. Same defect the mutation gate had.
echo "== baseline: both stages must be green before anything is broken =="
if ! npm --prefix app exec -- vitest run src/refusals.test.ts >/dev/null 2>&1; then
  echo "ABORTED: the refusal suite is already failing; nothing below would mean anything." >&2
  exit 1
fi
if ! (cd app && npm exec -- vitest run --config vitest.attacks.config.ts) >/dev/null 2>&1; then
  echo "ABORTED: the adversarial harnesses are already failing." >&2
  exit 1
fi
echo "baseline green."
echo ""

# Uniqueness is checked in python because an anchor may span lines: the
# load-bearing vocabulary terms appear twice in the file, once in the guard's
# list and once in the corpus the suite reads, so a single line cannot identify
# which one is being broken.
MUTATE='
import sys
path, needle, repl = sys.argv[1], sys.argv[2], sys.argv[3]
needle = needle.encode().decode("unicode_escape")
repl = repl.encode().decode("unicode_escape")
text = open(path, encoding="utf-8").read()
if text.count(needle) != 1:
    sys.stderr.write("anchor appears %d times\n" % text.count(needle))
    raise SystemExit(1)
open(path, "w", encoding="utf-8").write(text.replace(needle, repl, 1))
'

check() {
  local name="$1" file="$2" needle="$3" replacement="$4" suite="$5"
  if ! python3 -c "$MUTATE" "$file" "$needle" "$replacement" 2>/dev/null; then
    echo "SETUP FAILED  $name: anchor is not unique in $file" >&2
    fail=1
    restore
    return
  fi
  if eval "$suite" >/dev/null 2>&1; then
    echo "SURVIVED      $name"
    fail=1
  else
    echo "caught        $name"
  fi
  restore
}

REFUSAL_SUITE='npm --prefix app exec -- vitest run src/refusals.test.ts'
ATTACK_SUITE='(cd app && npm exec -- vitest run --config vitest.attacks.config.ts)'

# Stage 3. Drop one Spanish complaint term. This is Escalation 3 in miniature:
# the guard still refuses the English word and stops seeing the Spanish one.
#
# The term matters. The first version of this fixture removed "quejas", which
# proved nothing: the list also carries "queja", matching is on substrings, and
# `quejas_recibidas` stayed refused by the singular. The suite went green and
# looked for a moment like a hole in the gate. A fixture that changes no
# behaviour is not a fixture — it is a second way for a check to pass without
# earning it. "avisos_ciudadanos" has no shorter stem in the list, so removing
# it genuinely un-refuses the corpus key that depends on it. The anchor spans
# two lines because the term appears again in the corpus the suite reads, and
# breaking the corpus instead of the guard would prove nothing either.
check "refusal suite: a Spanish complaint term goes missing" \
  app/src/domain/vocabulary/refusedTerms.ts \
  '      "aviso_ciudadano",\n      "avisos_ciudadanos",' \
  '      "aviso_ciudadano",\n      "avisos_REMOVED_BY_SELFTEST",' \
  "$REFUSAL_SUITE"

# Stage 4. Reopen the hole ATTACK E-2 was written for: the denominator guard
# reading keys but not the text of values.
check "attack suite: the cost guard stops reading text values" \
  app/src/domain/cost/cost.ts \
  '      if (denominator !== undefined) {' '      if (false && denominator !== undefined) {' \
  "$ATTACK_SUITE"

echo ""
if [ "$fail" -ne 0 ]; then
  echo "GATE SELFTEST FAILED. A gate stayed green while the thing it guards was broken." >&2
  echo "That gate is not protecting what its name says it protects." >&2
  exit 1
fi
echo "GATE SELFTEST PASSED — both stages were watched failing."
