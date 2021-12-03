import each from 'seebigs-each';
import { getTablePath, readTable, writeTable } from '../database.js';
import evalExpression from '../expressions.js';

export default async function insert(parsed) {
    for (const tableObj of parsed.table) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

        const table = await readTable(tablePath);
        if (!table) { throw new Error(`Table ${tableName} not found at ${tablePath}`); }
        table.data = table.data || {};
        let nextTableIndex = Object.keys(table.data).length;

        each(parsed.columns, (parsedColumn) => {
            if (!table.columns[parsedColumn]) {
                throw new Error(`Unknown column '${parsedColumn}' in table '${tableName}'`);
            }
        });

        each(parsed.values, ({ value }) => {
            const record = {};
            let tableColumnIndex = 0;
            each(table.columns, (tableColumn, columnName) => {
                const columnIndex = parsed.columns ? parsed.columns.indexOf(columnName) : tableColumnIndex;
                let val;
                const expr = evalExpression(value[columnIndex]);
                if (expr) {
                    val = expr.value;
                }
                if (typeof val === 'undefined') {
                    const columnDefault = tableColumn.default;
                    if (tableColumn.auto_increment) {
                        val = nextTableIndex + 1;
                    } else if (columnDefault) {
                        const defaultExpr = evalExpression(columnDefault, record, table.data);
                        if (defaultExpr) {
                            val = defaultExpr.value;
                        }
                    }
                }
                if (tableColumn.not_null && (val === null || typeof val === 'undefined')) {
                    throw new Error(`${tableName} ${columnName} cannot be NULL`);
                }
                // TODO enforce type coersion using tableColumn
                if (typeof val !== 'undefined') {
                    record[columnName] = val;
                }
                tableColumnIndex += 1;
            });
            table.data[nextTableIndex] = record;
            nextTableIndex += 1;
        });

        await writeTable(tablePath, table);
    }
}