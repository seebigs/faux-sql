import each from 'seebigs-each';
import { readTable, createTable, getTablePath } from '../database.js';
import { addColumn, addConstraint } from '../column.js';
import { DuplicateError, UnsupportedError } from '../errors.js';

export default async function create(parsed) {
    if (parsed.keyword === 'table') {
        for (const tableObj of parsed.table) {
            const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

            const tableAlreadyExists = await readTable(tablePath);
            if (tableAlreadyExists) {
                if (!parsed.if_not_exists) {
                    throw new DuplicateError(`Table '${tableName}' already exists`);
                }
                return;
            }

            const table = {
                columns: {},
                data: null,
            };
            each(parsed.create_definitions, (definition) => {
                const { resource } = definition;
                if (resource === 'column') {
                    addColumn(table, definition);
                } else if (resource === 'constraint') {
                    addConstraint(table, definition);
                }
            });

            await createTable(tablePath, table);
        }
    } else {
        throw new UnsupportedError(`Create ${parsed.keyword} not yet supported`);
    }
}
