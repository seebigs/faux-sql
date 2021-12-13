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

export function filter(collection, iteratee, stopAfter, thisArg) {
    const ret = Array.isArray(collection) ? [] : {};
    let resultCount = 0;
    each(collection, (item, index) => {
        const keep = iteratee.call(thisArg, item, index, collection);
        if (keep) {
            ret[index] = item;
            resultCount += 1;
            if (stopAfter && resultCount >= stopAfter) {
                return false; // drop out of loop
            }
        }
    });
    return ret;
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
