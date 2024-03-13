import { dirname, join } from 'path';
import { mkdirp } from 'mkdirp';
import {
    readFile,
    readdir,
    rm,
    stat,
    writeFile,
} from 'fs/promises';

export function getTablePath(filePath, tableObj) {
    const tableAlias = tableObj.as;
    const tableName = tableObj.table;
    const tableDatabase = tableObj.db || '';
    const tablePath = join(filePath, `${tableDatabase}/${tableName}.json`);
    return {
        tableAlias,
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

export async function listFiles(filesPath) {
    const dirs = [];
    const databases = { default: {} };
    const allFiles = await readdir(filesPath);
    for (const file of allFiles) {
        const filePath = `${filesPath}/${file}`;
        const fileName = file.split('.')[0];
        if ((await stat(filePath)).isDirectory()) {
            dirs.push(fileName);
        } else {
            const tableData = await readTable(filePath);
            if (tableData) {
                delete tableData.data; // strips all records
                databases.default[fileName] = tableData;
            }
        }
    }
    for (const dir of dirs) {
        const allSubFiles = await readdir(`${filesPath}/${dir}`);
        for (const subfile of allSubFiles) {
            const subFilePath = `${filesPath}/${dir}/${subfile}`;
            const subFileName = subfile.split('.')[0];
            const tableData = await readTable(subFilePath);
            delete tableData.data;
            databases[dir] = databases[dir] || {};
            databases[dir][subFileName] = tableData;
        }
    }
    return databases;
}
