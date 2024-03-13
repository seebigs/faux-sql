import each from 'seebigs-each';
import { getTablePath, readTable } from '../database.js';
import { parseValue } from '../values.js';
import { distinctValues, eachReverse, getSortFn } from '../utils.js';
import evalExpression from '../expressions.js';
import whereFilter from '../where.js';
import { SchemaError } from '../errors.js';
import { defaultTableName } from '../defaults.js';

function resolveIdentifier(item, references, statementType) {
    const itemType = item.type;
    if (itemType === 'column_ref') {
        return item.column;
    }
    if (itemType === 'number') {
        const identifier = references[item.value - 1];
        if (identifier) {
            if (identifier.expr.type === 'column_ref') {
                return identifier.expr.column;
            }
            throw new Error(`Can't ${statementType} by ${identifier.expr.type}`);
        } else {
            throw new SchemaError(`Unknown column ${item.value} in ${statementType} statement`);
        }
    }
}

export default async function select({
    columns,
    distinct,
    groupby,
    filePath,
    from,
    limit,
    orderby,
    where,
}) {
    const data = {};
    const rawRecords = {};
    let primaryTable = { columns: {}, data: {} };

    if (!from) {
        const quickResult = [];
        each(columns, (col) => {
            const expr = evalExpression(col.expr, {}, {}, col.as);
            if (expr) {
                quickResult.push(expr.value);
            }
        });
        return quickResult;
    }

    /** FROM **/
    for (let i = 0; i < from.length; i += 1) {
        const {
            tableAlias,
            tableName,
            tablePath,
        } = getTablePath(filePath, from[i]);

        if (!tableName) { throw new Error('Please specify a table'); }
        const table = await readTable(tablePath);
        if (!table) { throw new SchemaError(`Table '${tableName}' not found at ${tablePath}`); }
        if (i === 0) { primaryTable = table; }
        data[tableName] = table;
        if (tableAlias) { data[tableAlias] = table; } // possible collision with table names?
    }

    /** JOIN **/

    if (from.length > 1) {
        const fromFirst = from[0];
        const fromFirstKey = fromFirst.as || fromFirst.table;
        for (let i = 1; i < from.length; i += 1) {
            const fromNext = from[i];

            if (!fromNext.join || fromNext.join === 'INNER JOIN') {
                each(primaryTable.data, (row, index) => {
                    each(data[fromNext.table].data, (nextRow) => {
                        const fromNextKey = fromNext.as || fromNext.table;
                        const compareObject = {};
                        compareObject[fromFirstKey] = row;
                        compareObject[fromNextKey] = nextRow;
                        if (whereFilter(fromNext.on || where, compareObject)) {
                            const rawResult = {};
                            each(nextRow, (value, key) => {
                                rawResult[key] = value;
                            });
                            each(row, (value, key) => {
                                rawResult[key] = value;
                            });
                            rawRecords[index] = rawResult;
                        }
                    });
                });
            }
        }

        // add WHERE filter for joins

    } else {

        /** WHERE **/

        each(primaryTable.data, (row, index) => {
            const compareObject = {};
            compareObject[defaultTableName] = row;
            if (!where || whereFilter(where, compareObject)) {
                rawRecords[index] = row;
            }
        });
    }

    /** GROUP BY **/

    let selectors = columns;
    if (selectors.length === 1 && selectors[0].expr.column === '*') {
        const firstRecord = Object.values(rawRecords)[0];
        if (!firstRecord) { return []; } // no records found
        const allColumns = Object.keys(firstRecord);
        selectors = allColumns.map((key) => {
            return {
                expr: {
                    type: 'column_ref',
                    column: key,
                },
            };
        });
    }

    let groupedResults = rawRecords;
    let groups = selectors;
    if (groupby) {
        groups = [];
        each(groupby, (groupByItem) => {
            groups.push(resolveIdentifier(groupByItem, selectors, 'group'));
        });
        const records = {};
        const buckets = {};
        each(rawRecords, (result) => {
            const bucketKey = groups.reduce((prev, curr) => {
                return prev + result[curr];
            }, '');
            buckets[bucketKey] = buckets[bucketKey] || [];
            buckets[bucketKey].push(result);
        });

        each(buckets, (bucketValues, bucketKey) => {
            const bucket = distinct ? distinctValues(bucketValues) : bucketValues;
            records[bucketKey] = bucket;
        });

        groupedResults = records;
    }

    /** HAVING **/

    /** SELECT **/

    let selectedResults = [];
    each(groupedResults, (fullResult) => {
        const result = {};
        each(selectors, (sel) => {
            const conditions = !groupby ? {} : {
                column_ref: () => {
                    return groups.indexOf(sel.expr.column) >= 0;
                },
            };
            let expr;
            if (groupby) {
                expr = evalExpression(sel.expr, fullResult[0], fullResult, sel.as, conditions);
            } else {
                expr = evalExpression(sel.expr, fullResult, groupedResults, sel.as, conditions);
            }
            if (expr) {
                result[expr.key] = expr.value;
            }
        });
        selectedResults.push(result);
    });

    /** ORDER BY **/

    if (orderby) {
        eachReverse(orderby, (orderByItem) => {
            const columnName = resolveIdentifier(orderByItem.expr, selectors, 'order');
            const sortFn = getSortFn(columnName, orderByItem.type);
            if (groupby) {
                selectedResults.sort((a, b) => {
                    return sortFn(a[0], b[0]);
                });
            } else {
                selectedResults.sort(sortFn);
            }
        });
    }

    /** DISTINCT **/

    if (distinct && selectedResults.length > 1) {
        selectedResults = distinctValues(selectedResults);
    }

    /** LIMIT **/

    const limitVal = limit && limit.value;
    if (limit && limit.value) {
        if (limitVal.length > 1) {
            const limitLength = parseInt(parseValue(limitVal[0]), 10) + parseInt(parseValue(limitVal[1]), 10);
            selectedResults = selectedResults.slice(parseValue(limitVal[0]), limitLength);
        } else {
            selectedResults = selectedResults.slice(0, parseValue(limitVal[0]));
        }
    }

    return selectedResults;
}
