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
    if (def.unique_or_primary === 'unique') {
        column.unique = true;
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

    if (def.unique_or_primary === 'primary key') {
        table.primary = columnName;
    }

    table.columns[columnName] = column;
}

export function addConstraint(table, constraint) {
    if (constraint.constraint_type.indexOf('primary') >= 0) {
        [table.primary] = constraint.definition; // TODO when more than one column is primary
    }
}

export function dropColumn(table, name) {
    if (table.primary === name) {
        table.primary = null;
    }
    each(table.data, (record) => {
        delete record[name];
    });
    delete table.columns[name];
}

export function dropKey(table, keyword) {
    if (keyword.indexOf('primary') >= 0) {
        table.primary = null;
    }
}
/* eslint-enable no-param-reassign */
