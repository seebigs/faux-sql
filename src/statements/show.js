import each from 'seebigs-each';
import { listFiles } from '../database.js';
import { UnsupportedError } from '../errors.js';

function showTables(tables) {
    each(tables, (table, tableName) => {
        if (table && table.columns) {
            console.log('\n');
            console.log(` \x1b[1;32m${tableName}\x1b[0m`);
            console.table(table.columns);
        }
    });
    console.log();
}

function showDatabases(databases) {
    const dbChar = '*';
    each(databases, (tables, dbName) => {
        if (Object.keys(tables || {}).length) {
            console.log('\n');
            console.log(dbChar.repeat(dbName.length + 12));
            console.log(dbChar.repeat(5), dbName, dbChar.repeat(5));
            console.log(dbChar.repeat(dbName.length + 12));
            showTables(tables);
        }
    });
    console.log();
}

export default async function show(parsed, usingCLI) {
    const filesObj = await listFiles(parsed.filePath);
    if (parsed.keyword === 'databases') {
        return usingCLI ? showDatabases(filesObj) : filesObj;
    }
    if (parsed.keyword === 'tables') {
        return usingCLI ? showTables(filesObj.default) : filesObj.default;
    }
    throw new UnsupportedError(`Drop ${parsed.keyword} not yet supported`);
}
