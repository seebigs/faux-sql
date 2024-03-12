import each from 'seebigs-each';
import { getTablePath, readTable } from '../database.js';
import { parseValue } from '../values.js';
import { distinctValues, eachReverse, getSortFn } from '../utils.js';
import evalExpression from '../expressions.js';
import whereFilter from '../where.js';
import { SchemaError, UnsupportedError } from '../errors.js';

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

async function singleSelect(parsed, selectFrom) {

    /** FROM **/
    // TODO: allow multiple tables and joins (for...of)
    let table;
    if (parsed.from) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, selectFrom);
        if (!tableName) { throw new Error('Please specify a table'); }
        table = await readTable(tablePath);
        if (!table) { throw new SchemaError(`Table '${tableName}' not found at ${tablePath}`); }
    } else {
        table = {
            data: { 0: {} },
        };
    }

    const { columns } = table;
    const { data = {} } = table;

    let selectors = parsed.columns;
    const {
        where,
        groupby,
        distinct,
        orderby,
        limit,
    } = parsed;

    /** Optimize for LIMIT **/
    const limits = limit && limit.value;
    let stopAfter = null;
    if (!orderby && limits && limits.length === 1) {
        stopAfter = limits[0].value;
    }

    /** SELECT ALL **/
    if (selectors.length === 1 && selectors[0].expr.column === '*') {
        const allColumns = Object.keys(columns || data[0]);
        selectors = allColumns.map((key) => {
            return {
                expr: {
                    type: 'column_ref',
                    table: null,
                    column: key,
                },
                as: null,
            };
        });
    }

    /** GROUP **/
    let groups = selectors;
    if (groupby) {
        groups = [];
        each(groupby, (groupByItem) => {
            groups.push(resolveIdentifier(groupByItem, selectors, 'group'));
        });
    }
    const records = {};
    if (groupby) {
        const buckets = {};
        each(data, (result) => {
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

    } else {
        each(data, (row, index) => {
            records[index] = row;
        });
    }

    /** HAVING **/
    // TODO

    const results = Object.values(records);

    /** ORDER BY **/
    if (orderby) {
        eachReverse(orderby, (orderByItem) => {
            const order = resolveIdentifier(orderByItem.expr, selectors, 'order');
            const sortFn = getSortFn(order, orderByItem.type);
            if (groupby) {
                results.sort((a, b) => {
                    return sortFn(a[0], b[0]);
                });
            } else {
                results.sort(sortFn);
            }
        });
    }

    /** SELECT **/
    let selectedResults = [];
    each(results, (fullResult) => {
        /** WHERE **/
        if (whereFilter(where, fullResult)) {
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
                    expr = evalExpression(sel.expr, fullResult, data, sel.as, conditions);
                }
                if (expr) {
                    result[expr.key] = expr.value;
                }
            });
            selectedResults.push(result);
        }
        if (stopAfter && selectedResults.length >= stopAfter) {
            return false; // drop out of loop
        }
    });

    /** DISTINCT **/
    if (distinct && selectedResults.length > 1) {
        selectedResults = distinctValues(selectedResults);
    }

    /** LIMIT **/
    if (limits) {
        if (limits.length > 1) {
            const limitsLen = parseInt(parseValue(limits[0]), 10) + parseInt(parseValue(limits[1]), 10);
            selectedResults = selectedResults.slice(parseValue(limits[0]), limitsLen);
        } else {
            selectedResults = selectedResults.slice(0, parseValue(limits[0]));
        }
    }

    return selectedResults;
}

// async function multiSelect(parsed, selectFrom) {
//     const rawSelects = [];
//     for (const fromObj of parsed.from) {
//         rawSelects.push(await multiSelect(parsed, fromObj));
//     }
//     console.log(rawSelects);
//     return rawSelects;
// }

export default async function select(parsed) {
    if (parsed.from.length > 1) {
        throw new UnsupportedError('Selecting from more than one table is not yet supported');
    }
    return singleSelect(parsed, parsed.from[0]);
}
