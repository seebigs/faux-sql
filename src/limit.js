import { parseValue } from './values.js';

export default function limitResults(results, limit) {
    const limitVal = limit && limit.value;
    if (!limitVal) { return results; }
    if (limitVal.length > 1) {
        const limitLength = parseInt(parseValue(limitVal[0]), 10) + parseInt(parseValue(limitVal[1]), 10);
        return results.slice(parseValue(limitVal[0]), limitLength);
    }
    return results.slice(0, parseValue(limitVal[0]));
}
