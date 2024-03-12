import { getTablePath, readTable, writeTable } from '../database.js';
import { SchemaError, UnsupportedError } from '../errors.js';

export default async function truncate(parsed) {
    if (parsed.keyword === 'table') {
        for (const tableObj of parsed.name) {
            const { tableName, tablePath } = getTablePath(parsed.filePath, tableObj);

            const table = await readTable(tablePath);
            if (!table) { throw new SchemaError(`Table ${tableName} not found at ${tablePath}`); }
            table.data = null;
            await writeTable(tablePath, table);
        }
    } else {
        throw new UnsupportedError(`Truncate ${parsed.keyword} not yet supported`);
    }
}
