import { readFileSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON from './delete.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'delete_test';
const testTablePath = `${filePath}/${testName}.json`;

describe(testName, () => {

    writeFileSync(testTablePath, JSON.stringify(testJSON, null, 2));

    it('deletes rows from a table as expected', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            DELETE FROM ${testName}
            WHERE id>1 AND name!=NULL
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual({
            0: {
                id: 1,
                name: 'August',
                last_login: 'today',
            },
        });
    });

});
