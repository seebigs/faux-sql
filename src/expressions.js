import each from 'seebigs-each';
import { parseValue } from './values.js';
import { UnsupportedError } from './errors.js';
import { distinctValues } from './utils.js';
import whereFilter from './where.js';

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
    abs: (colExpr, row) => {
        const argsValues = colExpr.args.value;
        if (argsValues.length > 1) { throw new Error('ABS function only accepts one argument'); }
        const val = parseValue(argsValues[0], row);
        return val < 0 ? -val : val;
    },
    ceil: (colExpr, row) => {
        const argsValues = colExpr.args.value;
        if (argsValues.length > 1) { throw new Error('CEIL function only accepts one argument'); }
        const val = parseValue(argsValues[0], row);
        return Math.ceil(val);
    },
    concat: (colExpr, row) => {
        let str = '';
        each(colExpr.args.value, (param) => {
            str += parseValue(param, row);
        });
        return str;
    },
    floor: (colExpr, row) => {
        const argsValues = colExpr.args.value;
        if (argsValues.length > 1) { throw new Error('FLOOR function only accepts one argument'); }
        const val = parseValue(argsValues[0], row);
        return Math.floor(val);
    },
    if: (colExpr, row) => {
        const argsValues = colExpr.args.value;
        return whereFilter(argsValues[0], row) ? parseValue(argsValues[1], row) : parseValue(argsValues[2], row);
    },
    ifnull: (colExpr, row) => {
        const argsValues = colExpr.args.value;
        const val = parseValue(argsValues[0], row);
        return val === null ? parseValue(argsValues[1], row) : val;
    },
    round: (colExpr, row) => {
        const argsValues = colExpr.args.value;
        if (argsValues.length > 1) { throw new Error('ROUND function only accepts one argument'); }
        const val = parseValue(argsValues[0], row);
        return Math.round(val);
    },
    sqrt: (colExpr, row) => {
        const argsValues = colExpr.args.value;
        if (argsValues.length > 1) { throw new Error('SQRT function only accepts one argument'); }
        const val = parseValue(argsValues[0], row);
        return Math.sqrt(val);
    },
    truncate: (colExpr, row) => {
        const argsValues = colExpr.args.value;
        const val = parseValue(argsValues[0], row).toString();
        const truncIndex = parseValue(argsValues[1], row);
        if (typeof truncIndex === 'undefined') { throw new Error('TRUNCATE requires two valid arguments'); }
        let valArr = val.split('');
        const mapIndex = valArr.indexOf('.') + (truncIndex > 0 ? truncIndex + 1 : truncIndex);
        valArr = valArr.map((char, index) => {
            if (!/\d/.test(char)) { return char; }
            return index >= mapIndex ? 0 : char;
        });
        return Number(valArr.join(''));
    },
    getdate: getNow,
    now: getNow,
};

const aggrFunctions = {
    count: (_, records) => {
        return Object.keys(records).length;
    },
    avg: (colExpr, records) => {
        let count = 0;
        let sum = 0;
        each(records, (record) => {
            count += 1;
            sum += Number(parseValue(colExpr.args.expr, record));
        });
        return sum / count;
    },
    max: (colExpr, records) => {
        let max;
        each(records, (record) => {
            const currVal = parseValue(colExpr.args.expr, record);
            max = max > currVal ? max : currVal;
        });
        return max;
    },
    min: (colExpr, records) => {
        let min;
        each(records, (record) => {
            const currVal = parseValue(colExpr.args.expr, record);
            min = min < currVal ? min : currVal;
        });
        return min;
    },
    sum: (colExpr, records) => {
        let sum = 0;
        each(records, (record) => {
            sum += parseValue(colExpr.args.expr, record);
        });
        return sum;
    },
};

function fnExec(colExpr, row) {
    const fn = functions[colExpr.name.toLowerCase()];
    if (typeof fn === 'function') {
        return fn(colExpr, row);
    }
    throw new UnsupportedError(`${colExpr.name} function not yet supported`);
}

function aggrFnExec(colExpr, records) {
    const fn = aggrFunctions[colExpr.name.toLowerCase()];
    if (typeof fn === 'function') {
        return fn(colExpr, colExpr.args.distinct ? distinctValues(records) : records);
    }
    throw new UnsupportedError(`${colExpr.name} function not yet supported`);
}

function fnArgumentToString(expr) {
    let str = '';

    if (expr.type === 'binary_expr') {
        str += `${fnArgumentToString(expr.left)}${expr.operator}${fnArgumentToString(expr.right)}`;
    } else if (expr.type === 'column_ref') {
        str += expr.column;
    } else if (expr.type === 'single_quote_string') {
        str += `'${expr.value}'`;
    } else if (expr.type === 'double_quote_string') {
        str += `"${expr.value}"`;
    } else {
        str += expr.value;
    }

    if (expr.parentheses) {
        str = `(${str})`;
    }

    return str;
}

function fnToString(expression) {
    const params = (Array.isArray(expression.args) ? expression.args : expression.args.value).map((item) => {
        return fnArgumentToString(item);
    });
    const toStr = `${expression.name}(${params})`;
    return toStr;
}

function aggrFnToString(expression) {
    const distinctStr = expression.args.distinct ? `${expression.args.distinct} ` : '';
    return `${expression.name}(${distinctStr}${fnArgumentToString(expression.args.expr)})`;
}

export default function evalExpression(expression, row, data, asKey, conditions = {}) {
    let key;
    let value;

    if (expression) {
        if (expression.type === 'function') {
            key = asKey || fnToString(expression);
            value = fnExec(expression, row);
        } else if (expression.type === 'aggr_func') {
            key = asKey || aggrFnToString(expression);
            value = aggrFnExec(expression, data);
        } else {
            if (expression.type === 'column_ref' && typeof conditions.column_ref === 'function') {
                if (!conditions.column_ref(expression)) {
                    return false;
                }
            }
            key = asKey || expression.column;
            value = parseValue(expression, row);
        }
    }

    return {
        key,
        value,
    };
}
