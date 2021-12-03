import { readFileSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON from './insert.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'insert_test';
const testTablePath = `${filePath}/${testName}.json`;

describe(testName, () => {

    writeFileSync(testTablePath, JSON.stringify(testJSON, null, 2));

    it('inserts against table columns with values only', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            INSERT INTO ${testName}
            VALUES (1,2,3,4,5,6,7)
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual({
            0: { id: 1, name: 2, last_login: 3 },
        });
    });

    it('inserts by column name, increments, and fills defaults', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            INSERT INTO ${testName} (name)
            VALUES ('Bill'), ('Ted')
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual({
            0: { id: 1, name: 2, last_login: 3 },
            1: { id: 2, name: 'Bill', last_login: expect.any(Number) },
            2: { id: 3, name: 'Ted', last_login: expect.any(Number) },
        });
    });

    it('inserts with expressions', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            INSERT INTO ${testName} (name, last_login)
            VALUES ('Morpheus', getdate())
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual({
            0: { id: 1, name: 2, last_login: 3 },
            1: { id: 2, name: 'Bill', last_login: expect.any(Number) },
            2: { id: 3, name: 'Ted', last_login: expect.any(Number) },
            3: { id: 4, name: 'Morpheus', last_login: expect.any(Number) },
        });
    });

});
