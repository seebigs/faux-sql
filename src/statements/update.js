import each from 'seebigs-each';
import { writeTable } from '../database.js';
import whereFilter from '../where.js';
import evalExpression from '../expressions.js';
import { coerceValue } from '../values.js';
import { SchemaError, UnsupportedError } from '../errors.js';
import getJoinedRecords from '../join.js';
import { eachReverse, getSortFnNested } from '../utils.js';
import limitResults from '../limit.js';

export default async function update({
    table: parsedTables,
    filePath,
    where,
    orderby,
    limit,
    set,
}) {

    const { joinedRecords, loadedTables } = await getJoinedRecords(parsedTables, filePath);

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

    /** UPDATE **/

    each(results, (result) => {
        each(result, (row, tableName) => {
            const origTable = loadedTables[tableName];
            // const origRecord = origTable.data[row.fauxsqlTableIndex];
            each(set, (mod) => {
                const columnName = mod.column;
                const tableColumn = origTable.columns[columnName];
                if (tableColumn) {
                    const expr = evalExpression(mod.value, result, origTable.data);
                    if (expr) {
                        row[columnName] = coerceValue(expr.value, tableColumn.type);
                    }
                } else {
                    throw new SchemaError(`Unknown column ${columnName} in ${tableName}`);
                }
            });
        });
    });

    for (const table of Object.values(loadedTables)) {
        await writeTable(table.tablePath, table);
    }
}
