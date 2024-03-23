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

// beforeAll(async () => {
//     await fauxSQL(`
//     CREATE TABLE ${testUsers} (
//         id int,
//         name varchar(100) not null,
//         type varchar(100) default 'member',
//         hat varchar(100),
//         height varchar(100),
//         age int
//     );
//     CREATE TABLE ${testFavs} (
//         user_id int primary key,
//         fav_animal varchar(100),
//         fav_food varchar(100)
//     );
//     CREATE TABLE ${testHobbies} (
//         user_id int primary key,
//         hobby varchar(100)
//     );
//     INSERT INTO ${testUsers} VALUES
//         (1, 'Aaron A Aaronson', 'admin', 'red', '_med_tall', 55),
//         (2, 'John Doe', 'admin', 'blue', 'med-tall', 15),
//         (3, 'Sally Ride', 'member', 'red', 'short', 33),
//         (4, 'Willy Wonka', 'member', 'blue', 'med_tall', 22),
//         (5, 'Noah Dupe', 'admin', 'blue', 'short', 15),
//         (5, 'Noah Dupe', 'admin', 'blue', 'short', 15);
//     INSERT INTO ${testFavs} VALUES
//         (1, 'Aardvark', 'Apples'),
//         (2, 'Deer', 'Celery'),
//         (3, null, null),
//         (4, null, 'Candy');
//     INSERT INTO ${testHobbies} VALUES
//         (3, 'reading'),
//         (4, 'hiking'),
//         (2, 'scuba');
//     `);
// });


describe('join_test', () => {

    writeFileSync(testUsersPath, JSON.stringify(testUsersJSON, null, 2));
    writeFileSync(testFavsPath, JSON.stringify(testFavsJSON, null, 2));
    writeFileSync(testHobbiesPath, JSON.stringify(testHobbiesJSON, null, 2));

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
