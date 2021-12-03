import { readFileSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON from './truncate.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'truncate_test';
const testTablePath = `${filePath}/${testName}.json`;

describe(testName, () => {

    writeFileSync(testTablePath, JSON.stringify(testJSON, null, 2));

    it('truncates a table as expected', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            TRUNCATE TABLE ${testName}
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table).toEqual({
            columns: {
                id: {
                    type: 'INT',
                },
                name: {
                    type: 'VARCHAR',
                    length: 100,
                },
            },
            data: null,
        });
    });

});
