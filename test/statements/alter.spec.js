import { readFileSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON from './alter.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'alter_test';
const testTablePath = `${filePath}/${testName}.json`;

describe(testName, () => {

    writeFileSync(testTablePath, JSON.stringify(testJSON, null, 2));

    it('alters a table as expected', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            ALTER TABLE ${testName}
            ADD email varchar(255) PRIMARY KEY
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
                email: {
                    type: 'VARCHAR',
                    length: 255,
                },
            },
            primary: 'email',
            data: null,
        });
    });

});
