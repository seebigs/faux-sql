import each from 'seebigs-each';
import { getTablePath, readTable, writeTable } from '../database.js';
import {
    addColumn,
    addConstraint,
    dropColumn,
    dropKey,
} from '../column.js';

export default async function alter(parsed) {
    for (const tableObj of parsed.table) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

        const table = await readTable(tablePath);
        if (!table) { throw new Error(`Table ${tableName} not found at ${tablePath}`); }

        each(parsed.expr, (expr) => {
            const { action, resource } = expr;
            if (action === 'add') {
                if (resource === 'column') {
                    addColumn(table, expr);
                } else if (resource === 'constraint') {
                    addConstraint(table, expr.create_definitions);
                }
            } else if (action === 'drop') {
                if (resource === 'column') {
                    dropColumn(table, expr.column.column);
                } else if (resource === 'key') {
                    dropKey(table, expr.keyword);
                }
            } else {
                throw new Error(`Alter ${action} not yet supported`);
            }
        });

        await writeTable(tablePath, table);
    }
}
