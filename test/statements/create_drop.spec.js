import {
    readFileSync,
    unlinkSync,
    accessSync,
    writeFileSync,
} from 'fs';
import FauxSQL from '../../index.js';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testName = 'create_drop_test';
const testTablePath = `${filePath}/${testName}.json`;
const otherTablePath = `${filePath}/other/${testName}.json`;

describe(testName, () => {

    it('creates a new table with attributes', async () => {
        expect.assertions(1);
        try {
            unlinkSync(testTablePath);
        } catch (err) {
            // file already does not exist
        }
        await fauxSQL(
            `
            CREATE TABLE ${testName}
            (id int primary key AUTO_INCREMENT, name varchar(100) not null unique default 'Nimo', last_login date DEFAULT GETDATE())
            `,
        );
        const table = JSON.parse(readFileSync(testTablePath, { encoding: 'utf-8' }));
        expect(table).toEqual({
            columns: {
                id: {
                    type: 'INT',
                    auto_increment: true,
                },
                name: {
                    type: 'VARCHAR',
                    length: 100,
                    unique: true,
                    not_null: true,
                    default: {
                        type: 'value',
                        value: 'Nimo',
                    },
                },
                last_login: {
                    type: 'DATE',
                    default: {
                        type: 'function',
                        name: 'getdate',
                        args: [],
                    },
                },
            },
            primary: 'id',
            data: null,
        });
    });

    it('does not create if a table already exists', async () => {
        expect.assertions(1);
        await expect(fauxSQL(
            `
            CREATE TABLE ${testName}
            (id int, name varchar(100))
            `,
        )).rejects.toThrow(new Error(`Table '${testName}' already exists`));
    });

    it('fails silently when "if_not_exists" is passed', async () => {
        expect.assertions(1);
        const result = await fauxSQL(
            `
            CREATE TABLE IF NOT EXISTS ${testName}
            (id int, name varchar(100))
            `,
        );
        expect(result).toBe(undefined);
    });

    it('drops a table', async () => {
        expect.assertions(2);
        const existing = readFileSync(testTablePath, { encoding: 'utf-8' });
        expect(!!existing).toBe(true);
        await fauxSQL(
            `
            DROP TABLE ${testName}
            `,
        );
        try {
            accessSync(testTablePath);
        } catch (err) {
            expect(err.message.indexOf('ENOENT')).toEqual(0);
            writeFileSync(testTablePath, existing); // write out again for post-test debugging
        }
    });

    it('creates a table in a new database', async () => {
        expect.assertions(1);
        try {
            unlinkSync(otherTablePath);
        } catch (err) {
            // file already does not exist
        }
        await fauxSQL(
            `
            CREATE TABLE other.${testName}
            (id int, name varchar(100))
            `,
        );
        const table = JSON.parse(readFileSync(otherTablePath, { encoding: 'utf-8' }));
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
            primary: null,
            data: null,
        });
    });

});
