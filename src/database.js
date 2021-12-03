import { dirname, join } from 'path';
import { readFile, rm, writeFile } from 'fs/promises';
import mkdirp from 'mkdirp';

export function getTablePath(filePath, tableObj) {
    const tableName = tableObj.table;
    const dbName = tableObj.db || '';
    const tablePath = join(filePath, `${dbName}/${tableName}.json`);
    return {
        tableName,
        tablePath,
    };
}

export async function readTable(tablePath) {
    let content = null;
    try {
        content = await readFile(tablePath, { encoding: 'utf-8' });
        return JSON.parse(content);
    } catch (err) {
        // do nothing
    }
}

export async function writeTable(tablePath, table) {
    return writeFile(tablePath, JSON.stringify(table, null, 2));
}

export async function createTable(tablePath, table) {
    await mkdirp(dirname(tablePath));
    return writeTable(tablePath, table);
}

export async function dropTable(tablePath) {
    return rm(tablePath, { force: true });
}
