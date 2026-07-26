import { Book, Context } from '../shared/core.js';
import { questions } from '../shared/questions.js';
import { formatContext } from './formatter.js';
import { create } from './util.js';

const ADJECTIVES_CONSTRAINTS: { [type: string]: { [adj: string]: boolean[] } } = {
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

function shuffle<T>(array: T[]): void {
    let index = array.length;
    while (index != 0) {
        const i = Math.floor(Math.random() * index);
        index--;
        [array[index], array[i]] = [array[i], array[index]];
    }
}

export function pageQuestions(summary: Book): HTMLElement {
    const page = create('div', { class: 'page page-questions' });

    // title
    page.append(create('span', { class: 'title' }, 'Questions'));

    // description
    page.append(create('p', {}, 'The questions below could not be answered with \'yes\' by the examples, or with \'no\' using the theorems.'));

    // loading icon
    const loading = create('div', { class: 'loading' });
    page.append(loading);

    // table
    const table = create('table', { style: 'margin-bottom: 4px;' });
    page.append(table);
    setTimeout(() => {
        table.append(create('tr', {}, create('th', {}, 'Questions')));
        const qs: Context[] = [];
        for (const type in ADJECTIVES_CONSTRAINTS)
            qs.push(...questions(summary, type, ADJECTIVES_CONSTRAINTS[type]));
        console.log(`#questions = ${qs.length}`);
        shuffle(qs);
        let i = 0;
        const maxQuestions = 25;
        for (const question of qs) {
            if (++i > maxQuestions) break;
            table.append(create('tr', {}, [
                create('td', {}, [
                    create('span', {}, [
                        'Does there exist ',
                        formatContext(summary, question),
                        '?'
                    ])
                ])
            ]));
        }
        loading.remove();
    }, 0);

    return page;
}
