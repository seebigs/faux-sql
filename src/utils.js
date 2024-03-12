import each from 'seebigs-each';

export function distinctValues(results) {
    let distinct;
    let setValue;
    if (Array.isArray(results)) {
        distinct = [];
        setValue = (value) => {
            distinct.push(value);
        };
    } else {
        distinct = {};
        setValue = (value, key) => {
            distinct[key] = value;
        };
    }
    const map = new Map();
    each(results, (record, index) => {
        const objstr = JSON.stringify(record); // crude but simplest
        if (!map.has(objstr)) {
            map.set(objstr, 1);
            setValue(record, index);
        }
    });
    return distinct;
}

export function eachReverse(collection, iteratee, thisArg) {
    for (let i = collection.length - 1; i >= 0; i -= 1) {
        if (iteratee.call(thisArg, collection[i], i, collection) === false) {
            return;
        }
    }
}

export function getSortFn(order, sortOpt) {
    const sort = sortOpt && sortOpt.toLowerCase();

    function sortAsc(a, b) {
        if (a[order] < b[order]) { return -1; }
        if (a[order] > b[order]) { return 1; }
        return 0;
    }

    function sortDesc(a, b) {
        if (a[order] > b[order]) { return -1; }
        if (a[order] < b[order]) { return 1; }
        return 0;
    }

    return sort === 'desc' ? sortDesc : sortAsc;
}
