import { parseValue } from './values.js';

export default function limitResults(results, limit) {
    if (limit && limit.value && limit.value.length) {
        const { value, separator: properSpelling, seperator: mispelled } = limit;
        const separator = properSpelling || mispelled; // node-sql-parser mispells this property as "seperator"
        let rowStart = 0;

        if (separator) {
            let rowLength;
            if (separator === 'offset') {
                rowStart = parseValue(value[1]);
                rowLength = parseValue(value[0]);
            } else if (separator === ',') {
                rowStart = parseValue(value[0]);
                rowLength = parseValue(value[1]);
            } else {
                throw new Error(`Invalid limit separator: ${separator}`);
            }
            return results.slice(rowStart, rowStart + rowLength);
        }

        return results.slice(rowStart, parseValue(value[0]));
    }

    return results;
}
