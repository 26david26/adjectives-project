import { Book } from '../shared/core.js';
import { Questions } from '../shared/questions.js';
import { formatContext } from './formatter.js';
import { create } from './util.js';

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
    fetch('json/questions.json', { cache: 'reload' }).then(response => response.json()).then((data: Questions) => {
        table.append(create('tr', {}, create('th', {}, 'Questions')));
        const qs = data.questions;
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
                        formatContext(summary, question.context),
                        '?'
                    ])
                ])
            ]));
        }
        loading.remove();
    }).catch(() => {
        loading.remove();
        table.append(create('tr', {}, create('td', {}, 'Failed to load questions.json ..')));
    });

    return page;
}
