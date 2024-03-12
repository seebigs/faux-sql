import each from 'seebigs-each';
import { parseValue } from './values.js';
import { UnsupportedError } from './errors.js';

function parseLeftRight(left, right, row) {
    return {
        left: parseValue(left, row),
        right: parseValue(right, row),
    };
}

const filters = {
    binary_expr: (row, where) => {
        const binaryOperator = where.operator;
        if (binaryOperator === '=') {
            const { left, right } = parseLeftRight(where.left, where.right, row);
            return typeof left !== 'undefined' && left === right;
        }
        if (binaryOperator === '>') {
            const { left, right } = parseLeftRight(where.left, where.right, row);
            return typeof left !== 'undefined' && left > right;
        }
        if (binaryOperator === '>=') {
            const { left, right } = parseLeftRight(where.left, where.right, row);
            return typeof left !== 'undefined' && left >= right;
        }
        if (binaryOperator === '<') {
            const { left, right } = parseLeftRight(where.left, where.right, row);
            return typeof left !== 'undefined' && left < right;
        }
        if (binaryOperator === '<=') {
            const { left, right } = parseLeftRight(where.left, where.right, row);
            return typeof left !== 'undefined' && left <= right;
        }
        if (binaryOperator === '!=' || binaryOperator === '<>') {
            const { left, right } = parseLeftRight(where.left, where.right, row);
            return typeof left !== 'undefined' && left !== right;
        }
        if (binaryOperator === 'AND') {
            const left = filters[where.left.type](row, where.left);
            const right = filters[where.right.type](row, where.right);
            return left && right;
        }
        if (binaryOperator === 'OR') {
            const left = filters[where.left.type](row, where.left);
            const right = filters[where.right.type](row, where.right);
            return left || right;
        }
        if (binaryOperator === 'LIKE' || binaryOperator === 'NOT LIKE') {
            const not = binaryOperator === 'NOT LIKE';
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
        }
        if (binaryOperator === 'IN' || binaryOperator === 'NOT IN') {
            const not = binaryOperator === 'NOT IN';
            let isInList = false;
            const compareLeft = parseValue(where.left, row);
            each(where.right.value, (listItem) => {
                if (compareLeft === parseValue(listItem, row)) {
                    isInList = true;
                    return false; // drop out of loop
                }
            });
            return not ? !isInList : isInList;
        }
        throw new UnsupportedError(`WHERE binaryOperator ${binaryOperator} type not yet supported`);
    },
    bool: (data, where) => {
        return !!parseValue(where);
    },
    number: (data, where) => {
        return !!parseValue(where);
    },
    single_quote_string: (row) => {
        return !!row;
    },
    unary_expr: (row, where) => {
        if (where.operator === 'NOT') {
            return !filters[where.expr.type](row, where.expr);
        }
    },
};

export default function whereFilter(where, row) {
    if (!where) { return true; }
    const whereFn = filters[where.type];
    if (typeof whereFn === 'function') {
        return whereFn(row, where);
    }
    throw new UnsupportedError(`WHERE ${where.type} not yet supported`);
}
