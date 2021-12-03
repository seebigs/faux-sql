import NodeSql from 'node-sql-parser';

import alter from './src/statements/alter.js';
import create from './src/statements/create.js';
import del from './src/statements/delete.js';
import drop from './src/statements/drop.js';
import insert from './src/statements/insert.js';
import select from './src/statements/select.js';
import truncate from './src/statements/truncate.js';
import update from './src/statements/update.js';

const executors = {
    alter,
    create,
    drop,
    select,
    truncate,
    insert,
    update,
    delete: del,
};

export default function FauxSQL({ filePath } = {}) {

    async function fauxSQL(statement = '') {
        let parsed = {};
        try {
            parsed = new NodeSql.Parser().astify(statement) || {};
            if (Array.isArray(parsed)) { [parsed] = parsed; }
        } catch (err) {
            console.log(statement);
            throw new Error(err.stack);
        }

        parsed.filePath = `${process.cwd()}/database`;
        if (filePath) {
            parsed.filePath = filePath.charAt(0) === '/' ? filePath : `${process.cwd()}/${filePath}`;
        }

        // console.log(JSON.stringify(parsed, null, 4));

        if (parsed.type) {
            const executor = executors[parsed.type];
            if (typeof executor === 'function') {
                return executor(parsed);
            }
            throw new Error(`"${parsed.type}" query type not yet supported`);
        } else {
            throw new Error('Please provide a statement to be evaluated');
        }
    }

    return fauxSQL;
}