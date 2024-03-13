import each from 'seebigs-each';
import { parseValue } from './values.js';
import { UnsupportedError } from './errors.js';
import { defaultTableName } from './defaults.js';


function parseLeftRight(where, compareObject) {
    const left = parseValue(where.left, compareObject[where.left.table || defaultTableName]);
    const right = parseValue(where.right, compareObject[where.right.table || defaultTableName]);
    return { left, right };
}

const filters = {
    binary_expr: (where, compareObject) => {
        const binaryOperator = where.operator;
        if (binaryOperator === '=') {
            const { left, right } = parseLeftRight(where, compareObject);
            return typeof left !== 'undefined' && left === right;
        }
        if (binaryOperator === '>') {
            const { left, right } = parseLeftRight(where, compareObject);
            return typeof left !== 'undefined' && left > right;
        }
        if (binaryOperator === '>=') {
            const { left, right } = parseLeftRight(where, compareObject);
            return typeof left !== 'undefined' && left >= right;
        }
        if (binaryOperator === '<') {
            const { left, right } = parseLeftRight(where, compareObject);
            return typeof left !== 'undefined' && left < right;
        }
        if (binaryOperator === '<=') {
            const { left, right } = parseLeftRight(where, compareObject);
            return typeof left !== 'undefined' && left <= right;
        }
        if (binaryOperator === '!=' || binaryOperator === '<>') {
            const { left, right } = parseLeftRight(where, compareObject);
            return typeof left !== 'undefined' && left !== right;
        }
        if (binaryOperator === 'AND') {
            const left = filters[where.left.type](where.left, compareObject);
            const right = filters[where.right.type](where.right, compareObject);
            return left && right;
        }
        if (binaryOperator === 'OR') {
            const left = filters[where.left.type](where.left, compareObject);
            const right = filters[where.right.type](where.right, compareObject);
            return left || right;
        }
        if (binaryOperator === 'LIKE' || binaryOperator === 'NOT LIKE') {
            const not = binaryOperator === 'NOT LIKE';
            const { left, right } = parseLeftRight(where, compareObject);
            let compareRight = right;
            if (compareRight.charAt(0) !== '%') {
                compareRight = `^${compareRight}`;
            }
            if (compareRight.charAt(compareRight.length - 1) !== '%') {
                compareRight = `${compareRight}$`;
            }
            const regex = new RegExp(compareRight.replaceAll('%', '.*').replaceAll(/(?<!\\)_/g, '.'));
            const match = left.match(regex);
            return not ? !match : match;
        }
        if (binaryOperator === 'IN' || binaryOperator === 'NOT IN') {
            const not = binaryOperator === 'NOT IN';
            let isInList = false;
            const { left } = parseLeftRight(where, compareObject);
            each(where.right.value, (listItem) => {
                if (left === parseValue(listItem, compareObject[where.right.table || defaultTableName])) {
                    isInList = true;
                    return false; // drop out of loop
                }
            });
            return not ? !isInList : isInList;
        }
        throw new UnsupportedError(`WHERE binary_expr operator ${binaryOperator} type not yet supported`);
    },
    bool: (where) => {
        return !!parseValue(where);
    },
    number: (where) => {
        return !!parseValue(where);
    },
    single_quote_string: (row) => {
        return !!row;
    },
    unary_expr: (where, compareObject) => {
        if (where.operator === 'NOT') {
            return !filters[where.expr.type](where.expr, compareObject);
        }
        throw new UnsupportedError(`WHERE unary_expr operator ${where.operator} type not yet supported`);
    },
};

export default function whereFilter(where, compareObject) {
    if (!where) { return true; }
    const whereFn = filters[where.type];
    if (typeof whereFn === 'function') {
        return whereFn(where, compareObject);
    }
    throw new UnsupportedError(`WHERE ${where.type} not yet supported`);
}
