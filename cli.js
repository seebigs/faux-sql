#!/usr/bin/env node

import minimist from 'minimist';
import FauxSQL from './index.js';

const args = minimist(process.argv.slice(2));
const statements = args._;

if (statements.length) {
    const fauxSQL = new FauxSQL(args);
    statements.forEach(async (statement) => {
        try {
            const results = await fauxSQL(statement);
            if (results) {
                console.log(results);
            }
        } catch (err) {
            console.log('\nError:', err);
        }
    });
}
