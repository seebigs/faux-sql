/* eslint-disable max-classes-per-file */

/**
 * Used when a query violates a constraint
 */
export class ConstraintError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'ConstraintError';
    }
}

/**
 * Used when a dulicate record already exists
 */
export class DuplicateError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'DuplicateError';
    }
}

/**
 * Used when a table, column, or database is not found
 */
export class SchemaError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'SchemaError';
    }
}

/**
 * Used to notify when a feature is not yet supported
 */
export class UnsupportedError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'UnsupportedError';
    }
}
