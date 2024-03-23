import each from 'seebigs-each';
import { getTablePath, readTable, writeTable } from '../database.js';
import evalExpression from '../expressions.js';
import { coerceValue } from '../values.js';
import { ConstraintError, DuplicateError, SchemaError } from '../errors.js';

export default async function insert(parsed) {
    for (const tableObj of parsed.table) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

        const table = await readTable(tablePath);
        if (!table) { throw new SchemaError(`Table ${tableName} not found at ${tablePath}`); }
        table.data = table.data || [];

        each(parsed.columns, (parsedColumn) => {
            if (!table.columns[parsedColumn]) {
                throw new SchemaError(`Unknown column '${parsedColumn}' in table '${tableName}'`);
            }
        });

        each(parsed.values, ({ value }) => {
            const record = {};
            let tableColumnIndex = 0;
            const uniqueColumns = [];

            // Build a record to insert
            each(table.columns, (tableColumn, columnName) => {
                if (tableColumn.unique || tableColumn.primary_key) { uniqueColumns.push(columnName); }
                const columnIndex = parsed.columns ? parsed.columns.indexOf(columnName) : tableColumnIndex;
                let val;
                const expr = evalExpression(value[columnIndex]);
                if (expr) {
                    val = coerceValue(expr.value, tableColumn.type);
                }
                if (tableColumn.auto_increment) {
                    if (!val) { val = tableColumn.auto_increment; }
                    tableColumn.auto_increment = Math.max(tableColumn.auto_increment, val) + 1;
                }
                if (tableColumn.default && typeof val === 'undefined') {
                    const defaultExpr = evalExpression(tableColumn.default, record, table.data);
                    if (defaultExpr) {
                        val = defaultExpr.value;
                    }
                }
                const mustNotBeNull = tableColumn.not_null || tableColumn.primary_key;
                if (mustNotBeNull && (val === null || typeof val === 'undefined')) {
                    throw new ConstraintError(`${tableName} ${columnName} cannot be NULL`);
                }
                if (typeof val !== 'undefined') {
                    record[columnName] = val;
                }
                tableColumnIndex += 1;
            });

            // Check for duplicate records
            let duplicateFound = false;
            const ignoreDuplicates = parsed.prefix.indexOf('ignore') !== -1;
            const onDupeUpdate = parsed.on_duplicate_update;
            each(table.data, (existingRow) => {
                // is this existingRow a dupe of new record?
                let isDupe = false;
                if (uniqueColumns.length) {
                    let matchesAllUniques = true;
                    each(uniqueColumns, (uniqueColumn) => {
                        if (existingRow[uniqueColumn] !== record[uniqueColumn]) {
                            matchesAllUniques = false;
                        }
                        return false; // drop out of loop
                    });
                    isDupe = matchesAllUniques;
                }
                // if yes, either update or error
                if (isDupe) {
                    duplicateFound = true;
                    if (onDupeUpdate) {
                        each(onDupeUpdate.set, (set) => {
                            const expr = evalExpression(set.value, existingRow, table.data);
                            if (expr) {
                                existingRow[set.column] = expr.value;
                            }
                        });
                    } else if (!ignoreDuplicates) {
                        throw new DuplicateError(`Duplicate record in '${tableName}' for ${JSON.stringify(record)}`);
                    }
                }
            });

            // If not a duplicate, insert at bottom
            if (!duplicateFound) {
                table.data.push(record);
            }
        });

        await writeTable(tablePath, table);
    }
}
