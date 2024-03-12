import { existsSync, mkdirSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON from './show.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'show_test';
const testTablePath = `${filePath}/${testName}.json`;
const otherTableDir = `${filePath}/other`;
const otherTablePath = `${otherTableDir}/${testName}.json`;
if (!existsSync(otherTableDir)) {
    mkdirSync(otherTableDir);
}

describe(testName, () => {

    writeFileSync(testTablePath, JSON.stringify(testJSON, null, 2));
    writeFileSync(otherTablePath, JSON.stringify(testJSON, null, 2));

    it('shows databases', async () => {
        expect.assertions(2);
        const databases = await fauxSQL(
            `
            SHOW DATABASES
            `,
        );
        expect(databases.default[testName]).toEqual({
            columns: {
                id: {
                    type: 'INT',
                },
                name: {
                    type: 'VARCHAR',
                    length: 50,
                },
            },
        });
        expect(databases.other[testName]).toEqual({
            columns: {
                id: {
                    type: 'INT',
                },
                name: {
                    type: 'VARCHAR',
                    length: 50,
                },
            },
        });
    });

    it('shows tables', async () => {
        expect.assertions(1);
        const tables = await fauxSQL(
            `
            SHOW TABLES
            `,
        );
        expect(tables[testName]).toEqual({
            columns: {
                id: {
                    type: 'INT',
                },
                name: {
                    type: 'VARCHAR',
                    length: 50,
                },
            },
        });
    });

});
