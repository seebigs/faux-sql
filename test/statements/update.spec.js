import { readFileSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON from './update.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'update_test';
const testTablePath = `${filePath}/${testName}.json`;

describe(testName, () => {

    writeFileSync(testTablePath, JSON.stringify(testJSON, null, 2));

    it('updates a table as expected', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            UPDATE ${testName}
            SET last_login=getdate(), foo=bar, name='OOO'
            WHERE id>1 AND name!=NULL
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual({
            0: {
                id: 1,
                name: 2,
                last_login: 3,
            },
            1: {
                id: 2,
                name: 'OOO',
                last_login: expect.any(Number),
            },
            2: {
                id: 3,
                name: 'OOO',
                last_login: expect.any(Number),
            },
        });
    });

});
