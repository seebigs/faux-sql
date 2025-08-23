import each from 'seebigs-each';
import { parseValue } from '../values.js';
import { distinctValues, eachReverse, getSortFn } from '../utils.js';
import evalExpression from '../expressions.js';
import whereFilter from '../where.js';
import { SchemaError } from '../errors.js';
import getJoinedRecords from '../join.js';
import limitResults from '../limit.js';

function resolveIdentifier(item, references, statementType) {
    if (item.type === 'column_ref') {
        return item;
    }
    if (item.type === 'number') {
        const identifier = references[item.value - 1];
        if (identifier) {
            if (identifier.expr.type === 'column_ref') {
                return identifier.expr;
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

    const { joinedRecords, loadedTables } = await getJoinedRecords(from, filePath);

    /** WHERE **/

    const filteredRecords = [];
    each(joinedRecords, (row) => {
        if (!where || whereFilter(where, row)) {
            filteredRecords.push(row);
        }
    });

    /** GROUP BY **/

    let selectors = columns;
    if (selectors.length === 1 && selectors[0].expr.column === '*') {
        const combinedColumns = {};
        each(loadedTables, (table, tableKey) => {
            each(table.columns, (_, columnKey) => {
                if (!combinedColumns[columnKey]) {
                    combinedColumns[columnKey] = tableKey;
                }
            });
        });
        const allColumns = [];
        each(combinedColumns, (tableKey, columnKey) => {
            allColumns.push({
                expr: {
                    type: 'column_ref',
                    table: tableKey,
                    column: columnKey,
                },
            });
        });
        selectors = allColumns;
    }

    let groupedResults = filteredRecords;
    let groups = selectors;
    if (groupby) {
        groups = [];
        each(groupby, (groupByItem) => {
            groups.push(resolveIdentifier(groupByItem, selectors, 'group'));
        });
        const groupedRecords = {};
        const buckets = {};
        each(filteredRecords, (result) => {
            const bucketKey = groups.reduce((accum, curr) => {
                return accum + parseValue(curr, result);
            }, '');
            buckets[bucketKey] = buckets[bucketKey] || [];
            buckets[bucketKey].push(result);
        });

        each(buckets, (bucketRows, bucketKey) => {
            const bucket = distinct ? distinctValues(bucketRows) : bucketRows;
            groupedRecords[bucketKey] = bucket;
        });

        groupedResults = groupedRecords;
    }

    /** HAVING **/

    /** SELECT **/

    let selectedResults = [];
    each(groupedResults, (fullResult) => {
        const result = {};
        each(selectors, (sel) => {
            const conditions = !groupby ? {} : {
                column_ref: () => {
                    return groups.some((e) => e.table === sel.expr.table && e.column === sel.expr.column);
                },
            };
            let expr;
            if (groupby) {
                expr = evalExpression(sel.expr, fullResult[0], fullResult, sel.as, conditions);
            } else {
                expr = evalExpression(sel.expr, fullResult, groupedResults, sel.as, conditions);
            }
            if (expr && typeof expr.value !== 'undefined') {
                result[expr.key] = expr.value;
            }
        });
        selectedResults.push(result);
    });

    /** ORDER BY **/

    if (orderby) {
        eachReverse(orderby, (orderByItem) => {
            const identifier = resolveIdentifier(orderByItem.expr, selectors, 'order');
            const sortFn = getSortFn(identifier.column, orderByItem.type);
            selectedResults.sort(sortFn);
        });
    }

    /** DISTINCT **/

    if (distinct && selectedResults.length > 1) {
        selectedResults = distinctValues(selectedResults);
    }

    /** LIMIT **/

    const implicitGroupAll = !groupby && selectors.every((sel) => {
        return sel.expr.type === 'aggr_func';
    });
    if (implicitGroupAll) {
        limit = { value: [{ type: 'number', value: 1 }] };
    }
    selectedResults = limitResults(selectedResults, limit);

    return selectedResults;
}
