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

    it('inserts without column names specified', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            INSERT INTO ${testName}
            VALUES (NULL, 'Neo', 'tomorrow', 4, 5)
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual([
            { id: 1, name: 'Neo', last_login: 'tomorrow' },
        ]);
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
        expect(table.data).toEqual([
            { id: 1, name: 'Neo', last_login: 'tomorrow' },
            { id: 2, name: 'Bill', last_login: expect.any(String) },
            { id: 3, name: 'Ted', last_login: expect.any(String) },
        ]);
    });

    it('inserts with expressions', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            INSERT INTO ${testName} (last_login)
            VALUES (getdate())
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual([
            { id: 1, name: 'Neo', last_login: 'tomorrow' },
            { id: 2, name: 'Bill', last_login: expect.any(String) },
            { id: 3, name: 'Ted', last_login: expect.any(String) },
            { id: 4, name: 'Morpheus', last_login: expect.any(String) },
        ]);
    });

    it('does not allow duplicates for unique keys', async () => {
        expect.assertions(1);
        await expect(fauxSQL(
            `
            INSERT INTO ${testName} (id, name)
            VALUES (2, 'Bill')
            `,
        )).rejects.toThrow();
    });

    it('handles on duplicate update', async () => {
        expect.assertions(2);
        await fauxSQL(
            `
            INSERT INTO ${testName} (id, name)
            VALUES (2, 'anything')
            ON DUPLICATE KEY UPDATE
            last_login = "today"
            `,
        );
        let table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual([
            { id: 1, name: 'Neo', last_login: 'tomorrow' },
            { id: 2, name: 'Bill', last_login: 'today' },
            { id: 3, name: 'Ted', last_login: expect.any(String) },
            { id: 4, name: 'Morpheus', last_login: expect.any(String) },
        ]);
        await fauxSQL(
            `
            INSERT INTO ${testName} (id, name, last_login)
            VALUES (1, 'different', 3)                      # note the 3 here does not get updated
            ON DUPLICATE KEY UPDATE
            name = "Waldo"
            `,
        );
        table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual([
            { id: 1, name: 'Waldo', last_login: 'tomorrow' },
            { id: 2, name: 'Bill', last_login: 'today' },
            { id: 3, name: 'Ted', last_login: expect.any(String) },
            { id: 4, name: 'Morpheus', last_login: expect.any(String) },
        ]);
    });

    it('handles ignore option and auto increments correctly', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            INSERT IGNORE INTO ${testName} (id, name)
            VALUES (2, 'anything'), (9, 'Trinity'), (null, 'Smith')
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual([
            { id: 1, name: 'Waldo', last_login: 'tomorrow' },
            { id: 2, name: 'Bill', last_login: expect.any(String) },
            { id: 3, name: 'Ted', last_login: expect.any(String) },
            { id: 4, name: 'Morpheus', last_login: expect.any(String) },
            { id: 9, name: 'Trinity', last_login: expect.any(String) },
            { id: 10, name: 'Smith', last_login: expect.any(String) },
        ]);
    });

});
