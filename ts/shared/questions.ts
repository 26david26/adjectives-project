import { Assistant, ContradictionError, Matcher } from './assistant.js';
import { Book, Context } from './core.js';

export const ADJECTIVES_CONSTRAINTS: { [type: string]: { [adj: string]: boolean[] } } = {
    'scheme': {
        'cohen-macaulay': [],
        'connected': [true],
        'excellent': [],
        // 'finite-dimensional',
        // 'integral',
        // 'irreducible',
        'jacobson': [],
        // 'locally-noetherian',
        // 'noetherian',
        // 'normal',
        // 'quasi-affine',
        // 'quasi-compact',
        // 'quasi-separated',
        'reduced': [true],
        // 'regular',
        // 'semi-separated',
        // 'separated',
    },
    'morphism': {
        // 'affine',
        // 'closed-immersion',
        // 'closed',
        // 'etale',
        // 'faithfully-flat',
        // 'finite',
        // 'flat',
        // 'formally-etale',
        // 'formally-smooth',
        // 'formally-unramified',
        // 'homeomorphism',
        // 'immersion',
        // 'locally-of-finite-presentation',
        // 'locally-of-finite-type',
        // 'of-finite-presentation',
        // 'of-finite-type',
        // 'open-immersion',
        // 'open',
        // 'proper',
        // 'quasi-affine',
        // 'quasi-compact',
        // 'quasi-finite',
        // 'quasi-separated',
        // 'regular',
        // 'semi-separated',
        // 'separated',
        // 'smooth',
        // 'surjective',
        // 'syntomic': [],
        // 'universally-closed',
        // 'universally-open',
        // 'unramified'
    }
};

// Shape of `public/json/questions.json`, precomputed by `script-build-questions.ts`:
// a question is a context whose subject has `adjectives` many adjectives assigned.
export const QUESTION_ID = 'X'; // id of the subject of a question, within its context

export type Question = { type: string, adjectives: number, context: Context };
export type Questions = { maxAdjectives: { [type: string]: number }, questions: Question[] };

export function combinations<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    function p(tuple: T[], i: number) {
        if (tuple.length === size) {
            result.push(tuple);
            return;
        }
        if (i + 1 > array.length)
            return;
        p(tuple.concat(array[i]), i + 1);
        p(tuple, i + 1);
    }
    p([], 0);
    return result;
}

export function product<T>(array: T[], size: number): T[][] {
    if (size == 0) return [[]];
    const results: T[][] = [];
    for (const tuple of product(array, size - 1)) {
        for (const t of array)
            results.push(tuple.concat(t));
    }
    return results;
}

export function questions(summary: Book, type: string, constraints: { [adj: string]: boolean[] }, maxAdjectives: number = 2): Context[] {
    const adjectives = Object.keys(summary.adjectives[type]);

    const assistant = new Assistant(summary);
    const questions: Context[] = []; // contains the original questions
    const questionsDeduced: Context[] = []; // contains the deduced contexts

    const id = QUESTION_ID; // dummy name

    // GENERATE QUESTIONS
    for (let n = 1; n <= maxAdjectives; ++n) { // loop over number of adjectives
        for (const adjs of combinations(adjectives, n)) { // loop over all combinations of adjectives
            for (const values of product([true, false], n)) { // loop over all values of the adjectives
                if (adjs.some((adj, i) => (adj in constraints && !constraints[adj].includes(values[i])))) // if some value does not match the constraints, just skip this one
                    continue;
                if (!values.some(v => v)) // we want at least one positive property
                    continue;
                const context = summary.createContextFromType(type, id); // create context for type
                for (let i = 0; i < n; ++i) // assign the adjectives their values
                    context[type][id].adjectives[adjs[i]] = values[i];
                const results = assistant.search(context); // search for examples
                let contradiction = false; // deduce on context, and see if there is a contradiction
                const contextClone = structuredClone(context);
                try { assistant.deduce(contextClone); } catch (err: any) {
                    if (!(err instanceof ContradictionError)) throw err;
                    contradiction = true;
                }
                if (results.length == 0 && !contradiction) { // if there are no results and no contradiction ...
                    questions.push(context); // ... then this is a good question
                    questionsDeduced.push(contextClone);
                }
            }
        }
    }

    // FILTER QUESTIONS (IF A => B, THEN WE MAY AS WELL OMIT B)
    for (let i = 0; i < questions.length; ++i) {
        for (let j = 0; j < questions.length; ++j) {
            if (i == j) continue;
            const A = questionsDeduced[i];
            const B = questions[j]; // use this so that we need to check fewer conditions
            const matcher = new Matcher(summary, B, A);

            if (matcher.match(B[type][id], A[type][id])) { // check if A => B
                questions.splice(j, 1); // remove B
                questionsDeduced.splice(j, 1); // remove B
                --j; // shift j one back
                if (i > j) --i;// shift i one back if i > j
            }
        }
    }

    return questions;
}
