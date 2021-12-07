
export default function parseValue(input, source) {
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
