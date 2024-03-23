import each from 'seebigs-each';
import { loadTable, writeTable } from '../database.js';
import { UnsupportedError } from '../errors.js';
import {
    addColumn,
    addConstraint,
    dropColumn,
    dropKey,
} from '../column.js';

export default async function alter({ table: parsedTable, expr: parsedExpr, filePath }) {
    for (const tableObj of parsedTable) {
        const table = await loadTable(filePath, tableObj);

        each(parsedExpr, (expr) => {
            const {
                action,
                resource,
                keyword,
                symbol,
            } = expr;

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
            } else if (keyword === 'auto_increment' && symbol === '=') {
                each(table.columns, (column) => {
                    if (column.auto_increment && expr.auto_increment) {
                        column.auto_increment = expr.auto_increment;
                    }
                });
            } else {
                throw new UnsupportedError(`Alter ${action || keyword} not yet supported`);
            }
        });

        await writeTable(table.tablePath, table);
    }
}
