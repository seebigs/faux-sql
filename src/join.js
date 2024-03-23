import each from 'seebigs-each';
import { loadTable } from './database.js';
import whereFilter from './where.js';

function cartesian(...arr) {
    return arr.reduce((a, b) => {
        return a.flatMap((d) => {
            return b.map((e) => {
                return [d, e].flat();
            });
        });
    });
}

// const cartesian = (...arr) => arr.reduce((a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())));

export default async function getJoinedRecords(from, filePath) {
    const loadedTables = {};

    const tableData = [];
    for (const parsedFrom of from) {
        const table = await loadTable(filePath, parsedFrom);

        each(table.data, (record, index) => {
            Object.defineProperty(record, 'fauxsqlTableIndex', {
                value: index,
                enumerable: false,
            });
        });

        loadedTables[parsedFrom.as || parsedFrom.table] = table;
        tableData.push(table.data);
    }

    const joinedRecords = [];
    if (from.length > 1) {
        const cartesianRecords = cartesian(...tableData);

        // console.log('cartesianRecords[0]', cartesianRecords[0]);

        // FIXME: This is just INNER JOIN
        each(cartesianRecords, (record) => {
            const sourceData = {};
            each(record, (recordItem, recordIndex) => {
                const recordTableKey = from[recordIndex].as || from[recordIndex].table;
                sourceData[recordTableKey] = recordItem;
            });
            let matchesAllFilters = true;
            each(from, ({ on: joinOn }) => {
                if (joinOn) {
                    if (!whereFilter(joinOn, sourceData)) {
                        matchesAllFilters = false;
                    }
                }
            });
            if (matchesAllFilters) {
                const newRecord = {};
                each(sourceData, (row, tableName) => {
                    newRecord[tableName] = row;
                    // each(row, (val, key) => {
                    //     if (typeof val !== 'undefined') {
                    //         newRecord[`${tableName}.${key}`] = val;
                    //     }
                    // });
                });
                joinedRecords.push(newRecord);
            }
        });

    } else {
        const tableName = from[0].as || from[0].table;
        each(tableData[0], (row) => {
            const newRecord = {};
            newRecord[tableName] = row;
            joinedRecords.push(newRecord);
        });
    }

    return {
        joinedRecords,
        loadedTables,
    };
}
