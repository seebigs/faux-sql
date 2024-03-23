import NodeSql from 'node-sql-parser';
import { UnsupportedError } from './src/errors.js';

import alter from './src/statements/alter.js';
import create from './src/statements/create.js';
import del from './src/statements/delete.js';
import drop from './src/statements/drop.js';
import insert from './src/statements/insert.js';
import select from './src/statements/select.js';
import show from './src/statements/show.js';
import truncate from './src/statements/truncate.js';
import update from './src/statements/update.js';

const statementTypes = {
    alter,
    create,
    delete: del,
    drop,
    insert,
    select,
    show,
    truncate,
    update,
};

function executeStatement(parsed, resolvedFilePath, usingCLI) {
    parsed.filePath = resolvedFilePath;

    // console.log(JSON.stringify(parsed, null, 4));

    if (parsed.type) {
        const executor = statementTypes[parsed.type];
        if (typeof executor === 'function') {
            return executor(parsed, usingCLI);
        }
        throw new UnsupportedError(`"${parsed.type}" query type not yet supported`);
    } else {
        throw new Error('Please provide a statement to be evaluated');
    }
}


export default function FauxSQL({ filePath } = {}, usingCLI = false) {

    async function fauxSQL(statement = '') {
        let resolvedFilePath = `${process.cwd()}/database`;
        if (filePath) {
            resolvedFilePath = filePath.charAt(0) === '/' ? filePath : `${process.cwd()}/${filePath}`;
        }

        let parsedStatement = {};
        try {
            parsedStatement = new NodeSql.Parser().astify(statement) || {};
        } catch (err) {
            console.log(statement);
            throw new Error(err.stack);
        }

        if (Array.isArray(parsedStatement)) {
            const results = [];
            for (const parsed of parsedStatement) {
                results.push(await executeStatement(parsed, resolvedFilePath, usingCLI));
            }
            return results;
        }

        return executeStatement(parsedStatement, resolvedFilePath, usingCLI);
    }

    return fauxSQL;
}

// https://learnsql.com/blog/sql-order-of-operations/
// https://medium.com/@shailav.shrestha/reference-types-of-sql-joins-4511cc802f02
