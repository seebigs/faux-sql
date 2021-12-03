import { dropTable, getTablePath } from '../database.js';

export default async function drop(parsed) {
    if (parsed.keyword === 'table') {
        for (const tableObj of parsed.name) {
            const { tablePath } = getTablePath(parsed.filePath, tableObj);
            await dropTable(tablePath);
        }
    } else {
        throw new Error(`Drop ${parsed.keyword} not yet supported`);
    }
}
