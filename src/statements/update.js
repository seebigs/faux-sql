import each from 'seebigs-each';
import { getTablePath, readTable, writeTable } from '../database.js';
import whereFilters from '../where.js';
import evalExpression from '../expressions.js';

export default async function update(parsed) {
    for (const tableObj of parsed.table) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

        const table = await readTable(tablePath);
        if (!table) { throw new Error(`Table ${tableName} not found at ${tablePath}`); }
        const { set, where } = parsed;
        let { data } = table;

        if (where) {
            data = whereFilters(where, data);
        }

        // TODO: orderby and limit?

        each(data, (row, index) => {
            each(set, (mod) => {
                const expr = evalExpression(mod.value, row, table.data);
                if (expr) {
                    data[index][mod.column] = expr.value;
                }
            });
        });

        await writeTable(tablePath, table);
    }
}
