import each from 'seebigs-each';

/* eslint-disable no-param-reassign */
export function removePrimaryKey(table) {
    each(table.columns, (column) => {
        delete column.primary;
    });
    table.primary = null;
}

export function setPrimaryKey(table, key) {
    each(table.columns, (column, columnName) => {
        if (columnName !== key) {
            delete column.primary;
        }
    });
    table.primary = key;
}

export function addColumn(table, def) {
    const columnName = def.column.column;
    const column = {
        type: def.definition.dataType,
    };
    if (def.unique_or_primary === 'primary key') {
        column.primary = true;
        column.not_null = true;
        column.unique = true;
    } else if (def.unique_or_primary === 'unique') {
        column.unique = true;
    }

    if (def.definition.length) {
        column.length = def.definition.length;
    }
    if (def.nullable && def.nullable.value === 'not null') {
        column.not_null = true;
    }
    if (def.auto_increment) {
        column.auto_increment = true;
    }

    const defaultVal = def.default_val && def.default_val.value;
    if (defaultVal) {
        if (defaultVal.type === 'function') {
            column.default = {
                type: 'function',
                name: defaultVal.name.toLowerCase(),
                args: defaultVal.args.value,
            };
        } else {
            column.default = {
                type: 'value',
                value: defaultVal.value,
            };
        }
    }

    if (column.primary) {
        setPrimaryKey(table, columnName);
    }

    table.columns[columnName] = column;
}

export function dropColumn(table, name) {
    if (table.primary === name) {
        removePrimaryKey(table);
    }
    each(table.data, (record) => {
        delete record[name];
    });
    delete table.columns[name];
}
/* eslint-enable no-param-reassign */
