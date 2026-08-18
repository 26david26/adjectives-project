// Report whether a partial assignment on a scheme is CONTRADICTORY under the
// current theorem base. Used by verify-proposal.py to check that a proposed
// theorem really closes its target gap, rather than merely being true.
//
// Usage: node check-gap.mjs '[["noetherian",true],["locally-noetherian",false]]'
// Prints CONTRADICTORY or CONSISTENT.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Book } from './js/shared/core.js';
import { Assistant, ContradictionError } from './js/shared/assistant.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const summary = JSON.parse(fs.readFileSync(path.join(root, 'public/json/summary.json'), 'utf8'));
const book = new Book();
book.initialize(summary);
book.verify();

const gap = JSON.parse(process.argv[2]);
const ctx = book.createContextFromType('scheme', 'X');
for (const [adj, val] of gap) ctx['scheme']['X'].adjectives[adj] = val;

try {
    new Assistant(book).deduce(ctx);
    console.log('CONSISTENT');
} catch (err) {
    if (!(err instanceof ContradictionError)) throw err;
    console.log('CONTRADICTORY');
}
