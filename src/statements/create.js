import each from 'seebigs-each';
import { readTable, createTable, getTablePath } from '../database.js';
import { addColumn } from '../column.js';

export default async function create(parsed) {
    if (parsed.keyword === 'table') {
        for (const tableObj of parsed.table) {
            const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

            const tableAlreadyExists = await readTable(tablePath);
            if (tableAlreadyExists) {
                if (!parsed.if_not_exists) {
                    throw new Error(`Table '${tableName}' already exists`);
                }
                return;
            }

            const table = {
                columns: {},
                primary: null,
                data: null,
            };
            each(parsed.create_definitions, (definition) => {
                addColumn(table, definition);
            });

            await createTable(tablePath, table);
        }
    } else {
        throw new Error(`Create ${parsed.keyword} not yet supported`);
    }
}
