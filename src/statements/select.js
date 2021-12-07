import each from 'seebigs-each';
import { getTablePath, readTable } from '../database.js';
import { parseValue } from '../values.js';
import { distinctValues, eachReverse, getSortFn } from '../utils.js';
import evalExpression from '../expressions.js';
import whereFilters from '../where.js';

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
            throw new Error(`Unknown column ${item.value} in ${statementType} statement`);
        }
    }
}

export default async function select(parsed) {

    /** FROM **/
    // TODO: allow multiple tables and joins (for...of)
    let table;
    if (parsed.from) {
        const { tableName, tablePath } = getTablePath(parsed.filePath, parsed.from[0]);
        if (!tableName) { throw new Error('Please specify a table'); }
        table = await readTable(tablePath);
        if (!table) { throw new Error(`Table '${tableName}' not found at ${tablePath}`); }
    } else {
        table = {
            data: { 0: {} },
        };
    }

    const { columns } = table;
    let { data = {} } = table;

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

    /** SELECT **/
    if (selectors === '*') {
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

    /** WHERE **/
    if (where) {
        data = whereFilters(where, data, stopAfter);
    }

    /** GROUP & DISTINCT **/
    let groups = selectors;
    if (groupby) {
        groups = [];
        each(groupby, (groupByItem) => {
            groups.push(resolveIdentifier(groupByItem, selectors, 'group'));
        });
    }
    let records = {};
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
            const result = {};
            const row = bucket[0];
            each(selectors, (sel) => {
                const expr = evalExpression(sel.expr, row, bucket, sel.as, {
                    column_ref: () => {
                        return groups.indexOf(sel.expr.column) >= 0;
                    },
                });
                if (expr) {
                    result[expr.key] = expr.value;
                }
            });
            records[bucketKey] = result;
        });

    } else {
        let resultCount = 0;
        each(data, (row, index) => {
            const result = {};
            each(selectors, (sel) => {
                const expr = evalExpression(sel.expr, row, data, sel.as);
                if (expr) {
                    result[expr.key] = expr.value;
                }
            });
            records[index] = result;
            resultCount += 1;
            if (stopAfter && resultCount >= stopAfter) {
                return false; // drop out of loop
            }
        });
        if (distinct && resultCount > 1) {
            records = distinctValues(records);
        }
    }

    /** HAVING **/
    // TODO

    let results = Object.values(records);

    /** ORDER BY **/
    if (orderby) {
        eachReverse(orderby, (orderByItem) => {
            const order = resolveIdentifier(orderByItem.expr, selectors, 'order');
            results.sort(getSortFn(order, orderByItem.type));
        });
    }

    /** LIMIT **/
    if (limits) {
        if (limits.length > 1) {
            const limitsLen = parseInt(parseValue(limits[0]), 10) + parseInt(parseValue(limits[1]), 10);
            results = results.slice(parseValue(limits[0]), limitsLen);
        } else {
            results = results.slice(0, parseValue(limits[0]));
        }
    }

    return Object.values(results);
}
