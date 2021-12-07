import each from 'seebigs-each';
import { parseValue } from './values.js';

function getNow() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${h}:${m}:${s}`;
}

const functions = {
    concat: (colExpr, row) => {
        let str = '';
        each(colExpr.args.value, (param) => {
            str += parseValue(param, row);
        });
        return str;
    },
    getdate: getNow,
    now: getNow,
};

const aggrFunctions = {
    count: (_, records) => {
        return Object.keys(records).length;
    },
    avg: (colExpr, records) => {
        const key = colExpr.args.expr.column;
        let count = 0;
        let sum = 0;
        each(records, (record) => {
            count += 1;
            sum += Number(record[key]);
        });
        return sum / count;
    },
    max: (colExpr, records) => {
        const key = colExpr.args.expr.column;
        let max;
        each(records, (record) => {
            const currVal = record[key];
            max = max > currVal ? max : currVal;
        });
        return max;
    },
    min: (colExpr, records) => {
        const key = colExpr.args.expr.column;
        let min;
        each(records, (record) => {
            const currVal = record[key];
            min = min < currVal ? min : currVal;
        });
        return min;
    },
    sum: (colExpr, records) => {
        const key = colExpr.args.expr.column;
        let sum = 0;
        each(records, (record) => {
            sum += record[key];
        });
        return sum;
    },
};

function fnExec(colExpr, row) {
    const fn = functions[colExpr.name.toLowerCase()];
    if (typeof fn === 'function') {
        return fn(colExpr, row);
    }
    throw new Error(`${colExpr.name} function not yet supported`);
}

function aggrFnExec(colExpr, records) {
    const fn = aggrFunctions[colExpr.name.toLowerCase()];
    if (typeof fn === 'function') {
        return fn(colExpr, records);
    }
    throw new Error(`${colExpr.name} function not yet supported`);
}

function fnToString(expression) {
    const params = (Array.isArray(expression.args) ? expression.args : expression.args.value).map((item) => {
        const itemType = item.type;
        if (itemType === 'column_ref') {
            return item.column;
        }
        if (itemType === 'single_quote_string') {
            return `'${item.value}'`;
        }
        return item.value;
    });
    const toStr = `${expression.name}(${params})`;
    return toStr;
}

function aggrFnToString(expression) {
    const toStr = `${expression.name}(${expression.args.expr.column})`;
    return toStr;
}

export default function evalExpression(expression, row, data, asKey, conditions = {}) {
    let key;
    let value;

    if (expression) {
        if (expression.type === 'column_ref') {
            if (typeof conditions.column_ref === 'function') {
                if (!conditions.column_ref(expression)) {
                    return false;
                }
            }
            key = asKey || expression.column;
            value = row[expression.column];
        } else if (expression.type === 'function') {
            key = asKey || fnToString(expression);
            value = fnExec(expression, row);
        } else if (expression.type === 'aggr_func') {
            key = asKey || aggrFnToString(expression);
            value = aggrFnExec(expression, data);
        } else {
            key = asKey || expression.column;
            value = parseValue(expression, row);
        }
    }

    return {
        key,
        value,
    };
}
