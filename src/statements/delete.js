import each from 'seebigs-each';
import { getTablePath, readTable, writeTable } from '../database.js';
import { SchemaError } from '../errors.js';
import whereFilter from '../where.js';
import { defaultTableName } from '../defaults.js';

export default async function del(parsed) {
    for (const tableObj of parsed.table) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

        const table = await readTable(tablePath);
        if (!table) { throw new SchemaError(`Table ${tableName} not found at ${tablePath}`); }
        const { where } = parsed;
        const { data } = table;

        // TODO: orderby and limit?

        each(data, (row, index) => {
            const compareObject = {};
            compareObject[defaultTableName] = row;
            if (whereFilter(where, compareObject)) {
                delete table.data[index];
            }
        });

        await writeTable(tablePath, table);
    }
}
