import { readFileSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON1 from './delete1.spec.json';
import testJSON2 from './delete2.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testTable1 = 'delete1_test';
const testTable2 = 'delete2_test';
const testTable1Path = `${filePath}/${testTable1}.json`;
const testTable2Path = `${filePath}/${testTable2}.json`;

describe('delete_test', () => {

    writeFileSync(testTable1Path, JSON.stringify(testJSON1, null, 2));
    writeFileSync(testTable2Path, JSON.stringify(testJSON2, null, 2));

    it('deletes rows from a table as expected', async () => {
        expect.assertions(2);
        await fauxSQL(
            `
            DELETE t1 FROM ${testTable1} as t1, ${testTable2}
            WHERE t1.id = ${testTable2}.id AND t1.id > 1 AND ${testTable2}.name like 'B%'
            ORDER BY id desc
            LIMIT 2
            `,
        );
        const t1 = JSON.parse(readFileSync(testTable1Path, { encoding: 'utf-8' }));
        const t2 = JSON.parse(readFileSync(testTable2Path, { encoding: 'utf-8' }));
        expect(t1.data).toEqual([
            {
                id: 1,
                last_login: 'today',
            },
            {
                id: 2,
                last_login: 'yesterday',
            },
            {
                id: 3,
                last_login: 'never',
            },
        ]);
        expect(t2.data).toEqual([
            {
                id: 1,
                name: 'Bobby',
            },
            {
                id: 2,
                name: 'Bill',
            },
            {
                id: 3,
                name: 'Ted',
            },
            {
                id: 4,
                name: 'Barbie',
            },
            {
                id: 5,
                name: 'Benjamin',
            },
        ]);
    });

});
