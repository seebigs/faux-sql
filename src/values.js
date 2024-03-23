
export function coerceValue(value, type) {
    if (!value) {
        return value; // don't coerce 0, null, false, '', or undefined
    }
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

export function parseValue(input, sourceData) {
    if (input) {
        const {
            type,
            value,
            table,
            column,
            operator,
        } = input;
        if (type === 'number') {
            return Number(value);
        }
        if (type === 'column_ref') {
            const tableName = table || Object.keys(sourceData)[0];
            return sourceData[tableName] && sourceData[tableName][column];
        }
        if (type === 'null') {
            return null;
        }
        if (type === 'binary_expr') {
            if (operator === '*') {
                return parseValue(input.left, sourceData) * parseValue(input.right, sourceData);
            }
            if (operator === '/') {
                return parseValue(input.left, sourceData) / parseValue(input.right, sourceData);
            }
            if (operator === '+') {
                return parseValue(input.left, sourceData) + parseValue(input.right, sourceData);
            }
            if (operator === '-') {
                return parseValue(input.left, sourceData) - parseValue(input.right, sourceData);
            }
        }
        return value;
    }
}
