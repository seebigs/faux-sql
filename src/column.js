import each from 'seebigs-each';

/* eslint-disable no-param-reassign */
export function addColumn(table, def) {
    const columnName = def.column.column;
    const column = {
        type: def.definition.dataType,
    };

    if (def.definition.length) {
        column.length = def.definition.length;
    }
    if (def.unique === 'unique') {
        column.unique = true;
    }
    if (def.nullable && def.nullable.value === 'not null') {
        column.not_null = true;
    }
    if (def.auto_increment) {
        column.auto_increment = true;
    }

    if (def.primary_key === 'primary key') {
        column.primary_key = true;
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

    table.columns[columnName] = column;
}

export function addConstraint(table, constraint) {
    if (constraint.constraint_type === 'primary key') {
        const columnNames = constraint.definition.map((x) => x.column);
        each(columnNames, (name) => {
            if (table.columns[name]) {
                table.columns[name].primary_key = true;
            }
        });
    }
}

export function dropColumn(table, name) {
    each(table.data, (record) => {
        delete record[name];
    });
    delete table.columns[name];
}

export function dropKey(table, keyword) {
    if (keyword.indexOf('primary') >= 0) {
        each(table.columns, (column) => {
            delete column.primary_key;
        });
    }
}
/* eslint-enable no-param-reassign */
