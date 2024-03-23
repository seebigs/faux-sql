import { existsSync, mkdirSync, writeFileSync } from 'fs';
import FauxSQL from '../../index.js';
import testUsersJSON from './join_users.spec.json';
import testFavsJSON from './join_favs.spec.json';
import testHobbiesJSON from './join_hobbies.spec.json';

const filePath = `${process.cwd()}/tmp`;
const fauxSQL = new FauxSQL({
    filePath,
});

const testUsers = 'join_users';
const testFavs = 'join_favs';
const testHobbies = 'join_hobbies';

const otherDatabaseName = 'other';
const otherTableDir = `${filePath}/${otherDatabaseName}`;
if (!existsSync(otherTableDir)) {
    mkdirSync(otherTableDir);
}

const testUsersPath = `${filePath}/${testUsers}.json`;
const testFavsPath = `${otherTableDir}/${testFavs}.json`;
const testHobbiesPath = `${filePath}/${testHobbies}.json`;

describe('join_test', () => {

    writeFileSync(testUsersPath, JSON.stringify(testUsersJSON, null, 2));
    writeFileSync(testFavsPath, JSON.stringify(testFavsJSON, null, 2));
    writeFileSync(testHobbiesPath, JSON.stringify(testHobbiesJSON, null, 2));

    describe('INNER JOIN', () => {

        it('handles a basic inner join', async () => {
            expect.assertions(1);
            const results = await fauxSQL(
                `
                SELECT name, ${testFavs}.fav_animal
                FROM ${testUsers}
                INNER JOIN ${otherDatabaseName}.${testFavs}
                ON ${testUsers}.id = ${testFavs}.user_id
                `,
            );
            expect(results).toEqual([
                {
                    name: 'Aaron A Aaronson',
                    fav_animal: 'Aardvark',
                },
                {
                    name: 'John Doe',
                    fav_animal: 'Deer',
                },
                {
                    name: 'Sally Ride',
                    fav_animal: null,
                },
                {
                    name: 'Willy Wonka',
                    fav_animal: null,
                },
            ]);
        });

        it('handles a more complex inner join', async () => {
            expect.assertions(1);
            const results = await fauxSQL(
                `
                SELECT name, t2.fav_animal, t2.fav_food AS snack, ${testHobbies}.hobby
                FROM ${testUsers} t1
                INNER JOIN ${otherDatabaseName}.${testFavs} t2
                ON t1.id = t2.user_id
                INNER JOIN ${testHobbies}
                ON t2.user_id = ${testHobbies}.user_id
                ORDER BY 4
                LIMIT 2
                `,
            );
            expect(results).toEqual([
                {
                    name: 'Willy Wonka',
                    fav_animal: null,
                    snack: 'Candy',
                    hobby: 'hiking',
                },
                {
                    name: 'Sally Ride',
                    fav_animal: null,
                    snack: null,
                    hobby: 'reading',
                },
            ]);
        });

        it('joins with select from multiple tables', async () => {
            expect.assertions(1);
            const results = await fauxSQL(
                `
                SELECT t1.name, t2.fav_animal, t2.fav_food AS snack
                FROM ${testUsers} t1, ${otherDatabaseName}.${testFavs} t2
                WHERE t1.id = t2.user_id
                ORDER BY t1.name desc
                `,
            );
            expect(results).toEqual([
                {
                    name: 'Willy Wonka',
                    fav_animal: null,
                    snack: 'Candy',
                },
                {
                    name: 'Sally Ride',
                    fav_animal: null,
                    snack: null,
                },
                {
                    name: 'John Doe',
                    fav_animal: 'Deer',
                    snack: 'Celery',
                },
                {
                    name: 'Aaron A Aaronson',
                    fav_animal: 'Aardvark',
                    snack: 'Apples',
                },
            ]);
        });

    });

    describe('CROSS JOIN', () => {

        it('handles a basic cross join', async () => {
            expect.assertions(1);
            const results = await fauxSQL(
                `
                SELECT t2.fav_animal, t2.fav_food AS snack, t3.hobby
                FROM ${otherDatabaseName}.${testFavs} t2
                CROSS JOIN ${testHobbies} t3
                `,
            );
            expect(results).toEqual([
                {
                    fav_animal: 'Aardvark',
                    snack: 'Apples',
                    hobby: 'reading',
                },
                {
                    fav_animal: 'Aardvark',
                    snack: 'Apples',
                    hobby: 'hiking',
                },
                {
                    fav_animal: 'Aardvark',
                    snack: 'Apples',
                    hobby: 'scuba',
                },
                {
                    fav_animal: 'Aardvark',
                    snack: 'Apples',
                    hobby: 'dancing',
                },
                {
                    fav_animal: 'Deer',
                    snack: 'Celery',
                    hobby: 'reading',
                },
                {
                    fav_animal: 'Deer',
                    snack: 'Celery',
                    hobby: 'hiking',
                },
                {
                    fav_animal: 'Deer',
                    snack: 'Celery',
                    hobby: 'scuba',
                },
                {
                    fav_animal: 'Deer',
                    snack: 'Celery',
                    hobby: 'dancing',
                },
                {
                    fav_animal: null,
                    snack: null,
                    hobby: 'reading',
                },
                {
                    fav_animal: null,
                    snack: null,
                    hobby: 'hiking',
                },
                {
                    fav_animal: null,
                    snack: null,
                    hobby: 'scuba',
                },
                {
                    fav_animal: null,
                    snack: null,
                    hobby: 'dancing',
                },
                {
                    fav_animal: null,
                    snack: 'Candy',
                    hobby: 'reading',
                },
                {
                    fav_animal: null,
                    snack: 'Candy',
                    hobby: 'hiking',
                },
                {
                    fav_animal: null,
                    snack: 'Candy',
                    hobby: 'scuba',
                },
                {
                    fav_animal: null,
                    snack: 'Candy',
                    hobby: 'dancing',
                },
            ]);
        });

        it('handles a cross join on', async () => {
            expect.assertions(1);
            const results = await fauxSQL(
                `
                SELECT t1.name, t3.hobby
                FROM ${testUsers} t1
                CROSS JOIN ${testHobbies} t3
                ON t1.id = t3.user_id
                `,
            );
            expect(results).toEqual([
                {
                    name: 'John Doe',
                    hobby: 'scuba',
                },
                {
                    name: 'Sally Ride',
                    hobby: 'reading',
                },
                {
                    name: 'Willy Wonka',
                    hobby: 'hiking',
                },
            ]);
        });

    });

    describe('LEFT JOIN', () => {

        it('handles a basic left outer join', async () => {
            expect.assertions(1);
            const results = await fauxSQL(
                `
                SELECT t1.name, t3.hobby
                FROM ${testUsers} t1
                LEFT JOIN ${testHobbies} t3
                ON t1.id = t3.user_id
                ORDER BY 1
                `,
            );
            expect(results).toEqual([
                {
                    name: 'Aaron A Aaronson',
                },
                {
                    name: 'John Doe',
                    hobby: 'scuba',
                },
                {
                    name: 'Noah Dupe',
                },
                {
                    name: 'Noah Dupe',
                },
                {
                    name: 'Sally Ride',
                    hobby: 'reading',
                },
                {
                    name: 'Willy Wonka',
                    hobby: 'hiking',
                },
            ]);
        });

    });

    describe('RIGHT JOIN', () => {

        it('handles a basic right outer join', async () => {
            expect.assertions(1);
            const results = await fauxSQL(
                `
                SELECT t1.name, t3.hobby
                FROM ${testUsers} t1
                RIGHT JOIN ${testHobbies} t3
                ON t1.id = t3.user_id
                ORDER BY 2
                `,
            );
            expect(results).toEqual([
                {
                    hobby: 'dancing',
                },
                {
                    name: 'Willy Wonka',
                    hobby: 'hiking',
                },
                {
                    name: 'Sally Ride',
                    hobby: 'reading',
                },
                {
                    name: 'John Doe',
                    hobby: 'scuba',
                },
            ]);
        });

    });

});
