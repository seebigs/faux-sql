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

    each(from, ({ as: fromAlias, table: fromTable, join: joinType }) => {
        if (joinType === 'LEFT JOIN') {
            const tableKey = from[0].as || from[0].table;
            each(loadedTables[tableKey].data, (row) => {
                if (!joinedRecords.some((elem) => { return elem[tableKey] === row; })) {
                    const newRecord = {};
                    newRecord[tableKey] = row;
                    joinedRecords.push(newRecord);
                }
            });
        } else if (joinType === 'RIGHT JOIN') {
            const tableKey = fromAlias || fromTable;
            each(loadedTables[tableKey].data, (row) => {
                if (!joinedRecords.some((elem) => { return elem[tableKey] === row; })) {
                    const newRecord = {};
                    newRecord[tableKey] = row;
                    joinedRecords.push(newRecord);
                }
            });
        }
    });

    return {
        joinedRecords,
        loadedTables,
    };
}
