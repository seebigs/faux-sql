import each from 'seebigs-each';
import { getTablePath, readTable, writeTable } from '../database.js';
import whereFilters from '../where.js';
import { SchemaError } from '../errors.js';

export default async function del(parsed) {
    for (const tableObj of parsed.table) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

        const table = await readTable(tablePath);
        if (!table) { throw new SchemaError(`Table ${tableName} not found at ${tablePath}`); }
        const { where } = parsed;
        let { data } = table;

        if (where) {
            data = whereFilters(where, data);
        }

        // TODO: orderby and limit?

        each(data, (row, index) => {
            delete table.data[index];
        });

        await writeTable(tablePath, table);
    }
}
