import each from 'seebigs-each';
import { getTablePath, readTable, writeTable } from '../database.js';
import evalExpression from '../expressions.js';
import { filter } from '../utils.js';
import { coerceValue } from '../values.js';

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
            const uniqueKeys = [];
            table.primary = table.primary || [];
            if (table.primary.length) {
                uniqueKeys.push(table.primary);
            }
            each(table.columns, (tableColumn, columnName) => {
                if (tableColumn.unique) { uniqueKeys.push([columnName]); }
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
                const mustNotBeNull = tableColumn.not_null || table.primary.indexOf(columnName) >= 0;
                if (mustNotBeNull && (val === null || typeof val === 'undefined')) {
                    throw new Error(`${tableName} ${columnName} cannot be NULL`);
                }
                if (typeof val !== 'undefined') {
                    record[columnName] = coerceValue(val, tableColumn.type);
                }
                tableColumnIndex += 1;
            });
            const duplicates = filter(table.data, (otherRow) => {
                let isDupe = false;
                each(uniqueKeys, (keyCombo) => {
                    let matchesAllKeys = true;
                    each(keyCombo, (key) => {
                        if (otherRow[key] !== record[key]) {
                            matchesAllKeys = false;
                        }
                    });
                    isDupe = matchesAllKeys;
                    if (isDupe) { return false; }
                });
                return isDupe;
            });
            if (Object.keys(duplicates).length) {
                const onDupeUpdate = parsed.on_duplicate_update;
                if (onDupeUpdate) {
                    each(duplicates, (dupe, dupeIndex) => {
                        each(onDupeUpdate.set, (set) => {
                            const expr = evalExpression(set.value, dupe, table.data);
                            if (expr) {
                                table.data[dupeIndex][set.column] = expr.value;
                            }
                        });
                    });
                } else {
                    throw new Error(`Duplicate entry for ${JSON.stringify(record)}`);
                }
            } else {
                table.data[nextTableIndex] = record;
                nextTableIndex += 1;
            }
        });

        await writeTable(tablePath, table);
    }
}
