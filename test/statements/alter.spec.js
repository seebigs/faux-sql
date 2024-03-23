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

    it('adds a column', async () => {
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
                    auto_increment: 1,
                },
                name: {
                    type: 'VARCHAR',
                    length: 100,
                },
                email: {
                    type: 'VARCHAR',
                    length: 255,
                    primary_key: true,
                },
            },
            data: [
                {
                    id: 1,
                    name: 'Person',
                },
                {
                    id: 2,
                    name: 'Evil Twin',
                },
            ],
        });
    });

    it('drops a column', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            ALTER TABLE ${testName}
            DROP name
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table).toEqual({
            columns: {
                id: {
                    type: 'INT',
                    auto_increment: 1,
                },
                email: {
                    type: 'VARCHAR',
                    length: 255,
                    primary_key: true,
                },
            },
            data: [
                {
                    id: 1,
                },
                {
                    id: 2,
                },
            ],
        });
    });

    it('updates auto increment', async () => {
        expect.assertions(1);
        await fauxSQL(
            `
            ALTER TABLE ${testName}
            AUTO_INCREMENT = 999;
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table).toEqual({
            columns: {
                id: {
                    type: 'INT',
                    auto_increment: 999,
                },
                email: {
                    type: 'VARCHAR',
                    length: 255,
                    primary_key: true,
                },
            },
            data: [
                {
                    id: 1,
                },
                {
                    id: 2,
                },
            ],
        });
    });

});
