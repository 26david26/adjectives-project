import fs from 'fs';

import { Book } from '../shared/core.js';
import { ADJECTIVES_CONSTRAINTS, QUESTION_ID, Question, Questions, questions } from '../shared/questions.js';
import { Log, PATH_JSON, PATH_SUMMARY } from './general.js';

const PATH_QUESTIONS = `${PATH_JSON}/questions.json`;
const DEFAULT_MAX_ADJECTIVES = 3;

// parse arguments
const maxAdjectives: { [type: string]: number } = {};
for (const type in ADJECTIVES_CONSTRAINTS)
    maxAdjectives[type] = DEFAULT_MAX_ADJECTIVES;

for (const arg of process.argv) {
    let match: RegExpMatchArray | null;
    match = arg.match(/^--max-adjectives=(\d+)$/); // e.g. `--max-adjectives=2`
    if (match) {
        for (const type in maxAdjectives)
            maxAdjectives[type] = parseInt(match[1]);
    }
    match = arg.match(/^--max-adjectives=([\w\-]+:\d+(,[\w\-]+:\d+)*)$/); // e.g. `--max-adjectives=scheme:3,morphism:2`
    if (match) {
        for (const pair of match[1].split(',')) {
            const [type, n] = pair.split(':');
            if (!(type in maxAdjectives))
                throw new Error(`Unknown type '${type}'`);
            maxAdjectives[type] = parseInt(n);
        }
    }
    match = arg.match(/^--help$/);
    if (match) {
        console.log('usage: script-build-questions.js [options]');
        console.log('  options:');
        console.log('    --help                   show this help message');
        console.log('    --max-adjectives=<n>     use at most <n> adjectives per question (default 3)');
        console.log('    --max-adjectives=<type>:<n>[,<type>:<n>]');
        console.log('                             as above, but per type, e.g. `scheme:3,morphism:2`');
        process.exit(0);
    }
}

// load summary
const book = new Book();
Log.action('Reading summary.json', () => {
    if (!fs.existsSync(PATH_SUMMARY))
        throw new Error(`Missing summary file '${PATH_SUMMARY}'`);

    const summary = JSON.parse(fs.readFileSync(PATH_SUMMARY, 'utf8'));

    // create book from summary
    book.initialize(summary);
    book.verify();
});

// generate questions
const data: Questions = { maxAdjectives, questions: [] };
for (const type in ADJECTIVES_CONSTRAINTS) {
    const found: Question[] = [];
    Log.action(`Generating ${type} questions (at most ${maxAdjectives[type]} adjectives)`, () => {
        for (const context of questions(book, type, ADJECTIVES_CONSTRAINTS[type], maxAdjectives[type]))
            found.push({ type, adjectives: Object.keys(context[type][QUESTION_ID].adjectives).length, context });
    });
    Log.info(`Obtained ${found.length} ${type} question(s)`);
    data.questions.push(...found);
}

// save questions
Log.action(`Saving questions`, () => {
    fs.writeFileSync(PATH_QUESTIONS, JSON.stringify(data));
});
