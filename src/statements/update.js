import each from 'seebigs-each';
import { getTablePath, readTable, writeTable } from '../database.js';
import whereFilter from '../where.js';
import evalExpression from '../expressions.js';
import { coerceValue } from '../values.js';
import { SchemaError } from '../errors.js';
import { defaultTableName } from '../defaults.js';

export default async function update(parsed) {
    for (const tableObj of parsed.table) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

        const table = await readTable(tablePath);
        if (!table) { throw new SchemaError(`Table ${tableName} not found at ${tablePath}`); }
        const { set, where } = parsed;
        const { columns } = table;
        const { data } = table;

        // TODO: orderby and limit?

        each(data, (row, index) => {
            const compareObject = {};
            compareObject[defaultTableName] = row;
            if (whereFilter(where, compareObject)) {
                each(set, (mod) => {
                    const columnName = mod.column;
                    const tableColumn = columns[columnName];
                    if (tableColumn) {
                        const expr = evalExpression(mod.value, row, table.data);
                        if (expr) {
                            data[index][columnName] = coerceValue(expr.value, tableColumn.type);
                        }
                    } else {
                        throw new SchemaError(`Unknown column ${columnName} in ${tableName}`);
                    }
                });
            }
        });

        await writeTable(tablePath, table);
    }
}
