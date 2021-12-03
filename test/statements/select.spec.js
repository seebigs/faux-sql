import { writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON from './select.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'select_test';
const testTablePath = `${filePath}/${testName}.json`;

describe(testName, () => {

    writeFileSync(testTablePath, JSON.stringify(testJSON, null, 2));

    it('handles a simple query', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT *
            FROM ${testName}
            WHERE id=3
            `,
        );
        expect(results).toEqual([
            {
                age: 33,
                hat: 'red',
                height: 'short',
                id: 3,
                name: 'Sally Ride',
                type: 'member',
            },
        ]);
    });

    it('handles distinct results', async () => {
        expect.assertions(2);
        const distinctSelect = await fauxSQL(
            `
            SELECT distinct name
            FROM ${testName}
            `,
        );
        expect(distinctSelect).toEqual([
            { name: 'Aaron A Aaronson' },
            { name: 'John Doe' },
            { name: 'Sally Ride' },
            { name: 'Willy Wonka' },
            { name: 'Noah Dupe' },
        ]);
        // Need to avoid duplicating results that match both sides of the OR
        //   without unintentionally removing duplicate rows from the data set
        const nonDistinctOr = await fauxSQL(
            `
            SELECT name
            FROM ${testName}
            WHERE id>0 OR name<>NULL
            `,
        );
        expect(nonDistinctOr).toEqual([
            { name: 'Aaron A Aaronson' },
            { name: 'John Doe' },
            { name: 'Sally Ride' },
            { name: 'Willy Wonka' },
            { name: 'Noah Dupe' },
            { name: 'Noah Dupe' },
        ]);
    });

    it('handles a complex non-aggregated query', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT distinct hat, name
            FROM ${testName}
            WHERE id>0 AND NOT id=2 OR name=NULL
            ORDER BY hat desc, 2 desc
            LIMIT 3
            `,
        );
        expect(results).toEqual([
            { hat: 'red', name: 'Sally Ride' },
            { hat: 'red', name: 'Aaron A Aaronson' },
            { hat: 'blue', name: 'Willy Wonka' },
        ]);
    });

    it('handles where like', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT id
            FROM ${testName}
            WHERE name like "%ll%"
            `,
        );
        expect(results).toEqual([
            { id: 3 },
            { id: 4 },
        ]);
    });

    it('handles group by', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT distinct count(*) as total, hat
            FROM ${testName}
            GROUP BY 2
            `,
        );
        expect(results).toEqual([
            { total: 2, hat: 'red' },
            { total: 3, hat: 'blue' },
        ]);
    });

    it('handles order by', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT distinct id, hat
            FROM ${testName}
            ORDER BY 2 desc, id desc
            `,
        );
        expect(results).toEqual([
            { id: 3, hat: 'red' },
            { id: 1, hat: 'red' },
            { id: 5, hat: 'blue' },
            { id: 4, hat: 'blue' },
            { id: 2, hat: 'blue' },
        ]);
    });

    it('handles functions in select', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT concat(id, '-', type)
            FROM ${testName}
            LIMIT 1
            `,
        );
        expect(results).toEqual([
            {
                'concat(id,\'-\',type)': '1-admin',
            },
        ]);
    });

    it('handles aggregate functions in select', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT avg(id), sum(id), max(name), min(id)
            FROM ${testName}
            LIMIT 1
            `,
        );
        expect(results).toEqual([
            {
                'AVG(id)': 3.3333333333333335,
                'SUM(id)': 20,
                'MAX(name)': 'Willy Wonka',
                'MIN(id)': 1,
            },
        ]);
    });

});
