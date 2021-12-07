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
            INSERT INTO ${testName} (last_login)
            VALUES (getdate())
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
            VALUES (2, 'Bill')
            ON DUPLICATE KEY UPDATE
            last_login = "today"
            `,
        );
        let table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual({
            0: { id: 1, name: 2, last_login: 3 },
            1: { id: 2, name: 'Bill', last_login: 'today' },
            2: { id: 3, name: 'Ted', last_login: expect.any(Number) },
            3: { id: 4, name: 'Morpheus', last_login: expect.any(Number) },
        });
        await fauxSQL(
            `
            INSERT INTO ${testName} (id, name, last_login)
            VALUES (1, 'different', 3)
            ON DUPLICATE KEY UPDATE
            name = "Waldo"
            `,
        );
        table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual({
            0: { id: 1, name: 'Waldo', last_login: 3 },
            1: { id: 2, name: 'Bill', last_login: 'today' },
            2: { id: 3, name: 'Ted', last_login: expect.any(Number) },
            3: { id: 4, name: 'Morpheus', last_login: expect.any(Number) },
        });
    });

});
