import each from 'seebigs-each';
import { filter } from './utils.js';
import parseValue from './values.js';

function parseLeftRight(left, right, row) {
    return {
        left: parseValue(left, row),
        right: parseValue(right, row),
    };
}

const filters = {
    binary_expr: (data, where, stopAfter) => {
        const binaryOperator = where.operator;
        if (binaryOperator === '=') {
            return filter(data, (row) => {
                const { left, right } = parseLeftRight(where.left, where.right, row);
                return typeof left !== 'undefined' && left === right;
            }, stopAfter);
        }
        if (binaryOperator === '>') {
            return filter(data, (row) => {
                const { left, right } = parseLeftRight(where.left, where.right, row);
                return typeof left !== 'undefined' && left > right;
            }, stopAfter);
        }
        if (binaryOperator === '>=') {
            return filter(data, (row) => {
                const { left, right } = parseLeftRight(where.left, where.right, row);
                return typeof left !== 'undefined' && left >= right;
            }, stopAfter);
        }
        if (binaryOperator === '<') {
            return filter(data, (row) => {
                const { left, right } = parseLeftRight(where.left, where.right, row);
                return typeof left !== 'undefined' && left < right;
            }, stopAfter);
        }
        if (binaryOperator === '<=') {
            return filter(data, (row) => {
                const { left, right } = parseLeftRight(where.left, where.right, row);
                return typeof left !== 'undefined' && left <= right;
            }, stopAfter);
        }
        if (binaryOperator === '!=' || binaryOperator === '<>') {
            return filter(data, (row) => {
                const { left, right } = parseLeftRight(where.left, where.right, row);
                return typeof left !== 'undefined' && left !== right;
            }, stopAfter);
        }
        if (binaryOperator === 'AND') {
            const left = filters[where.left.type](data, where.left);
            const right = filters[where.right.type](data, where.right);
            return filter(data, (row, index) => {
                return left[index] && right[index];
            }, stopAfter);
        }
        if (binaryOperator === 'OR') {
            const left = filters[where.left.type](data, where.left);
            const right = filters[where.right.type](data, where.right);
            return filter(data, (row, index) => {
                return left[index] || right[index];
            }, stopAfter);
        }
        if (binaryOperator === 'LIKE' || binaryOperator === 'NOT LIKE') {
            const not = binaryOperator === 'NOT LIKE';
            return filter(data, (row) => {
                const compareLeft = parseValue(where.left, row);
                let compareRight = parseValue(where.right, row);
                if (compareRight.charAt(0) !== '%') {
                    compareRight = `^${compareRight}`;
                }
                if (compareRight.charAt(compareRight.length - 1) !== '%') {
                    compareRight = `${compareRight}$`;
                }
                const regex = new RegExp(compareRight.replaceAll('%', '.*').replaceAll(/(?<!\\)_/g, '.'));
                const match = compareLeft.match(regex);
                return not ? !match : match;
            }, stopAfter);
        }
        if (binaryOperator === 'IN' || binaryOperator === 'NOT IN') {
            const not = binaryOperator === 'NOT IN';
            return filter(data, (row) => {
                let isInList = false;
                const compareLeft = parseValue(where.left, row);
                each(where.right.value, (listItem) => {
                    if (compareLeft === parseValue(listItem, row)) {
                        isInList = true;
                        return false; // drop out of loop
                    }
                });
                return not ? !isInList : isInList;
            });
        }
        throw new Error(`WHERE binaryOperator ${binaryOperator} type not yet supported`);
    },
    bool: (data, where) => {
        return parseValue(where) ? data : [];
    },
    number: (data, where) => {
        return parseValue(where) ? data : [];
    },
    single_quote_string: (data) => {
        return data;
    },
    unary_expr: (data, where) => {
        if (where.operator === 'NOT') {
            const invertedResults = {};
            const drop = filters[where.expr.type](data, where.expr);
            each(data, (record, index) => {
                if (!drop[index]) {
                    invertedResults[index] = record;
                }
            });
            return invertedResults;
        }
    },
};

export default function whereFilters(where, data, stopAfter) {
    const whereFn = filters[where.type];
    if (typeof whereFn === 'function') {
        return whereFn(data, where, stopAfter);
    }
    throw new Error(`WHERE ${where.type} not yet supported`);
}
