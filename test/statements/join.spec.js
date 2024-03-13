import { existsSync, mkdirSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON from './join.spec.json';
import test2JSON from './join2.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'join_test';
const test2Name = 'join2_test';
const otherDatabaseName = 'other';
const testTablePath = `${filePath}/${testName}.json`;
const otherTableDir = `${filePath}/other`;
const otherTablePath = `${otherTableDir}/${test2Name}.json`;
if (!existsSync(otherTableDir)) {
    mkdirSync(otherTableDir);
}

describe(testName, () => {

    writeFileSync(testTablePath, JSON.stringify(testJSON, null, 2));
    writeFileSync(otherTablePath, JSON.stringify(test2JSON, null, 2));

    it('handles a basic inner join', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT name, fav_animal
            FROM ${testName}
            INNER JOIN ${otherDatabaseName}.${test2Name}
            ON ${testName}.id = ${test2Name}.user_id
            `,
        );
        expect(results).toEqual([
            {
                name: 'Aaron A Aaronson',
                fav_animal: 'Aardvark',
            },
            {
                name: 'John Doe',
                fav_animal: 'Deer',
            },
            {
                name: 'Sally Ride',
            },
            {
                name: 'Willy Wonka',
            },
        ]);
    });

    it('handles a more complex inner join', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT t1.name, t2.fav_animal, t2.fav_food AS snack
            FROM ${testName} t1
            INNER JOIN ${otherDatabaseName}.${test2Name} t2
            ON t1.id = t2.user_id
            ORDER BY 2 desc
            `,
        );
        expect(results).toEqual([
            {
                name: 'John Doe',
                fav_animal: 'Deer',
                snack: 'Celery',
            },
            {
                name: 'Aaron A Aaronson',
                fav_animal: 'Aardvark',
                snack: 'Apples',
            },
            {
                name: 'Sally Ride',
            },
            {
                name: 'Willy Wonka',
                snack: 'Candy',
            },
        ]);
    });

    it('joins with select from multiple tables', async () => {
        expect.assertions(1);
        const results = await fauxSQL(
            `
            SELECT t1.name, t2.fav_animal, t2.fav_food AS snack
            FROM ${testName} t1, ${otherDatabaseName}.${test2Name} t2
            WHERE t1.id = t2.user_id
            `,
        );
        expect(results).toEqual([
            {
                name: 'Aaron A Aaronson',
                fav_animal: 'Aardvark',
                snack: 'Apples',
            },
            {
                name: 'John Doe',
                fav_animal: 'Deer',
                snack: 'Celery',
            },
            {
                name: 'Sally Ride',
            },
            {
                name: 'Willy Wonka',
                snack: 'Candy',
            },
        ]);
    });

    // Generally, the ON clause serves for conditions that specify how to join tables
    //   the WHERE clause restricts which rows to include in the result set.
    // If there is no matching row for the right table in the ON or USING part in a LEFT JOIN , a row with all columns set to NULL is used for the right table.

});
