import each from 'seebigs-each';
import getJoinedRecords from '../join.js';
import whereFilter from '../where.js';
import { eachReverse, getSortFnNested } from '../utils.js';
import limitResults from '../limit.js';
import { UnsupportedError } from '../errors.js';
import { writeTable } from '../database.js';

export default async function del({
    from,
    filePath,
    where,
    orderby,
    limit,
    table: parsedTables,
}) {

    const { joinedRecords, loadedTables } = await getJoinedRecords(from, filePath);

    /** WHERE **/

    let results = [];
    each(joinedRecords, (row) => {
        if (!where || whereFilter(where, row)) {
            results.push(row);
        }
    });

    /** ORDER BY **/

    if (orderby) {
        eachReverse(orderby, ({ expr, type }) => {
            if (expr.type !== 'column_ref') { throw new UnsupportedError(`Order by ${expr.type} not supported`); }
            const sortFn = getSortFnNested(expr, type);
            results.sort(sortFn);
        });
    }

    /** LIMIT **/

    results = limitResults(results, limit);

    /** DELETE **/

    const tablesToDeleteFrom = parsedTables && parsedTables.length ? parsedTables : from;
    for (const deleteFrom of tablesToDeleteFrom) {
        const killList = [];
        each(results, (result) => {
            killList[result[deleteFrom.as || deleteFrom.table].fauxsqlTableIndex] = true;
        });
        const parsedFrom = from.find((f) => {
            return f.as === deleteFrom.table || f.table === deleteFrom.table;
        });
        const table = loadedTables[parsedFrom.as || parsedFrom.table];

        // iterate in reverse because we're deleting indexes as we go
        for (let i = killList.length - 1; i >= 0; i -= 1) {
            if (killList[i]) {
                table.data.splice(i, 1);
            }
        }

        await writeTable(table.tablePath, table);
    }
}
