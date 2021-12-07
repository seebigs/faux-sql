
export function coerceValue(value, type) {
    if (type === 'INTEGER'
        || type === 'INT'
        || type === 'BIGINT'
        || type === 'SMALLINT'
        || type === 'TINYINT'
        || type === 'MEDIUMINT'
    ) {
        return parseInt(value, 10);
    }
    if (type === 'VARCHAR'
        || type === 'CHAR'
        || type === 'TEXT'
        || type === 'BLOB'
    ) {
        return `${value}`;
    }
    if (type === 'FLOAT'
        || type === 'DOUBLE'
        || type === 'DECIMAL'
        || type === 'NUMERIC'
    ) {
        return parseFloat(value);
    }
    if (type === 'DATE'
        || type === 'TIME'
        || type === 'DATETIME'
        || type === 'TIMESTAMP'
        || type === 'YEAR'
    ) {
        return `${value}`; // just store as a string for now
    }
    return value; // store JSON etc
}

export function parseValue(input, source) {
    if (input) {
        const {
            type,
            value,
            column,
            operator,
        } = input;
        if (type === 'number') {
            return Number(value);
        }
        if (type === 'column_ref') {
            return source[column];
        }
        if (type === 'null') {
            return null;
        }
        if (type === 'binary_expr') {
            if (operator === '*') {
                return parseValue(input.left, source) * parseValue(input.right, source);
            }
            if (operator === '/') {
                return parseValue(input.left, source) / parseValue(input.right, source);
            }
            if (operator === '+') {
                return parseValue(input.left, source) + parseValue(input.right, source);
            }
            if (operator === '-') {
                return parseValue(input.left, source) - parseValue(input.right, source);
            }
        }
        return value;
    }
}
