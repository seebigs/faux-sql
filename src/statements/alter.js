import each from 'seebigs-each';
import { getTablePath, readTable, writeTable } from '../database.js';
import { addColumn, dropColumn } from '../column.js';

export default async function alter(parsed) {
    for (const tableObj of parsed.table) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

        const table = await readTable(tablePath);
        if (!table) { throw new Error(`Table ${tableName} not found at ${tablePath}`); }

        each(parsed.expr, (expr) => {
            if (expr.action === 'add') {
                addColumn(table, expr);
            } else if (expr.action === 'drop') {
                dropColumn(table, expr.column.column);
            } else {
                throw new Error(`Alter ${expr.action} not yet supported`);
            }
        });

        await writeTable(tablePath, table);
    }
}
