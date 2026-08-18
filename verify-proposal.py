#!/usr/bin/env python3
"""Mechanically verify a proposed example or theorem before it enters the data.

Usage:  python3 verify-proposal.py <proposal.json> <target-gap.json>

A proposal is only ACCEPTED if all of:
  1. it emits valid YAML the project's own loader accepts
  2. the full deduction runs with no contradiction anywhere in the database
  3. it actually closes the target gap
  4. it does not silently change any existing example's recorded adjectives

On any failure the file is removed and the data restored. Exit 0 = accepted.
"""
import json, os, subprocess, sys, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data')
SUMMARY = os.path.join(ROOT, 'public/json/summary.json')


def emit_yaml(p):
    """Build YAML by hand. json.dumps gives valid double-quoted YAML scalars and
    correctly escapes the backslashes in LaTeX, which naive quoting does not."""
    J = json.dumps
    if p['kind'] == 'example':
        lines = ['type: scheme', f"name: {J(p['name'])}", f"description: {J(p['description'])}"]
        lines.append('adjectives:')
        for adj, val in p['adjectives'].items():
            v, why = (val + [None])[:2] if isinstance(val, list) else (val, None)
            lines.append(f"  {adj}: [{str(bool(v)).lower()}, {J(why)}]" if why
                         else f"  {adj}: [{str(bool(v)).lower()}]")
        return '\n'.join(lines) + '\n', f"data/examples/scheme/{p['id']}.yaml"
    if p['kind'] == 'theorem':
        conds = p['if'] if isinstance(p['if'], list) else [p['if']]
        lines = ['type: theorem', f"name: {J(p['name'])}", 'given: scheme X']
        lines.append(f"if: {J(conds[0])}" if len(conds) == 1
                     else 'if:\n' + '\n'.join(f"  - {J(c)}" for c in conds))
        lines.append(f"then: {J(p['then'])}")
        if p.get('citation'):
            lines.append(f"description: {J(p['citation'])}")
        return '\n'.join(lines) + '\n', f"data/theorems/scheme/{p['id']}.yaml"
    raise ValueError(f"unknown kind {p['kind']}")


def snapshot():
    with open(SUMMARY) as f:
        s = json.load(f)
    return {e: dict(v.get('adjectives', {})) for e, v in s['examples']['scheme'].items()}


def build():
    # clear-json first: update-json-from-yaml overwrites but never ERASES, so a
    # rejected proposal would otherwise linger in summary.json after its file is
    # deleted. Every build here must start from a clean slate.
    for cmd in (['npm', 'run', 'clear-json'],
                ['npm', 'run', 'update-json-from-yaml'], ['npm', 'run', 'deduce']):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        blob = r.stdout + r.stderr
        if r.returncode != 0 or 'Error' in blob or 'Contradiction' in blob:
            return False, blob.strip().splitlines()[-6:]
    return True, []


def gap_closed(gap):
    with open(SUMMARY) as f:
        s = json.load(f)
    for eid, e in s['examples']['scheme'].items():
        a = e.get('adjectives', {})
        if all(a.get(adj) == val for adj, val in gap):
            return True, eid
    return False, None


def main():
    proposal = json.load(open(sys.argv[1]))
    gap = [(a, v) for a, v in json.load(open(sys.argv[2]))]
    if proposal['kind'] == 'none':
        print('SKIP  proposer found nothing'); return 2

    before = snapshot()
    text, rel = emit_yaml(proposal)
    path = os.path.join(ROOT, rel)
    if os.path.exists(path):
        print(f'REJECT  {rel} already exists'); return 1
    with open(path, 'w') as f:
        f.write(text)

    ok, err = build()
    if not ok:
        os.remove(path); build()
        print('REJECT  build/deduction failed:'); [print('   ', l) for l in err]; return 1

    closed, by = gap_closed(gap)
    after = snapshot()
    changed = {e: (before[e], after[e]) for e in before
               if e in after and before[e] != after[e]}

    if proposal['kind'] == 'example' and not closed:
        os.remove(path); build()
        print('REJECT  does not actually close the target gap'); return 1
    if proposal['kind'] == 'theorem' and closed:
        os.remove(path); build()
        print('REJECT  theorem claims impossibility but an example realizes the gap'); return 1
    if proposal['kind'] == 'theorem':
        # a true-but-irrelevant theorem must not pass: it has to actually make
        # the target gap contradictory under deduction
        r = subprocess.run(['node', 'check-gap.mjs', json.dumps(gap)],
                           cwd=ROOT, capture_output=True, text=True)
        if 'CONTRADICTORY' not in r.stdout:
            os.remove(path); build()
            print('REJECT  theorem does not make the target gap contradictory'
                  f' (gap is still {r.stdout.strip() or "unknown"})'); return 1
    if changed:
        print(f'WARN   {len(changed)} existing example(s) gained deductions:')
        for e, (b, a) in list(changed.items())[:5]:
            print(f'    {e}: +{sorted(set(a) - set(b))}')

    print(f'ACCEPT  {rel}')
    if closed:
        print(f'   closes the gap via {by}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
