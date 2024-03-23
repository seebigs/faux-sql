// eslint-disable-next-line import/no-extraneous-dependencies
import { jest } from '@jest/globals';
import { readFileSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testJSON from './update.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'update_test';
const testTablePath = `${filePath}/${testName}.json`;

afterEach(() => {
    jest.clearAllMocks();
});

describe(testName, () => {

    writeFileSync(testTablePath, JSON.stringify(testJSON, null, 2));

    it('updates a table as expected', async () => {
        expect.assertions(1);

        jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(9999);
        jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(87);
        jest.spyOn(Date.prototype, 'getDate').mockReturnValue(77);
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(66);
        jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(55);
        jest.spyOn(Date.prototype, 'getSeconds').mockReturnValue(44);

        await fauxSQL(
            `
            UPDATE ${testName}
            SET last_login=getdate(), id=id+1, name='OOO'
            WHERE id > 1 AND name != 'Ted'
            ORDER BY last_login desc
            LIMIT 2
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table.data).toEqual([
            {
                id: 1,
                name: null,
                last_login: 2024,
            },
            {
                id: 3,
                name: 'OOO',
                last_login: '9999-88-77 66:55:44',
            },
            {
                id: 3,
                name: 'Ted',
                last_login: 2023,
            },
            {
                id: 5,
                name: 'OOO',
                last_login: '9999-88-77 66:55:44',
            },
            {
                id: 5,
                last_login: 2014,
            },
        ]);
    });

});
