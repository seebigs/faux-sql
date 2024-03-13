# faux-sql
A local JSON database using standard MySQL queries. The fastest way to get a database into your project.

- Human readable, easy to edit data files
- Super easy to swap out for a real DB connection whenever you're ready
- Database files can be checked-in with git/svn for easy collaboration

## Install
```sh
$ npm install faux-sql
```

## Get started via command line
```sh
$ npx faux-sql "CREATE TABLE users (id int AUTO_INCREMENT, name varchar(100), age int)"
$ npx faux-sql "INSERT INTO users VALUES (1, 'Bill', 17), (2, 'Ted', 21)"
$ npx faux-sql "SELECT * FROM users"
[
  { id: 1, name: 'Bill', age: 17 },
  { id: 2, name: 'Ted', age: 21 },
]
```

## Use in code
```js
import FauxSQL from 'faux-sql';

const sql = new FauxSQL();

(async () => {
    await sql('INSERT INTO users (name, age) VALUES ("Neo", 33)');
    const results = await sql('SELECT * FROM users');
    console.log(results);
})();
```
or
```js
import FauxSQL from 'faux-sql';

const sql = new FauxSQL();

sql('INSERT INTO users (name, age) VALUES ("Neo", 33)')
    .then(results => sql('SELECT * FROM users'))
    .then((results) => {
        console.log(results);
    });
```

## Data Files
Each table gets saved into its own JSON file. The default file path for these files is `<root>/database`, however, the file path can be customized in the constructor's Options if desired.

## Options
```js
new FauxSQL({
    filePath: `${process.cwd()}/special/path`,
})
```

## Multiple Databases
Each table's data file will be stored in the default database at the root of the database directory `./database/users.json` unless a database name is specified in the query.

For example:

```js
sql('CREATE TABLE p2.users (id int, name varchar(100))');
sql('INSERT INTO p2.users VALUES (1, "Bill"), (2, "Ted")');
sql('SELECT * FROM p2.users');
```
The above data will instead be stored at `./database/p2/users.json` and is distinct from any data stored in the default database.


======

# Supported Query Types
In most cases, you can just use MySQL as you would normally and everything will just work

## SELECT
```js
sql(`
SELECT age, count(*) as total
FROM users
WHERE age > 18 AND name != NULL
GROUP BY age
ORDER BY age DESC
LIMIT 10
`)
```

## CREATE
```js
sql(`
CREATE TABLE users (
id int AUTO_INCREMENT,
name varchar(100),
age int
)`)
```

## INSERT
```js
sql(`
INSERT INTO users (name, age)
VALUES ('Bill', 17), ('Ted', 21)
`)
```

## DELETE
```js
sql(`
DELETE FROM users
WHERE id > 1
`)
```

## UPDATE
```js
sql(`
UPDATE users
SET age = 23
WHERE id = 2
`)
```

## TRUNCATE
```js
sql(`
TRUNCATE TABLE users
`)
```

## ALTER
```js
sql(`
ALTER TABLE users
ADD email varchar(255) PRIMARY KEY
`)

sql(`
ALTER TABLE users
DROP name
`)
```

## DROP
```js
sql(`
DROP TABLE users
`)
```

## SHOW
```js
sql(`
SHOW DATABASES
`)

sql(`
SHOW TABLES
`)
```

## INNER JOIN
```js
sql(`
SELECT t1.name, t2.fav_animal, t2.fav_food AS snack
FROM users t1
INNER JOIN favorites t2
ON t1.id = t2.user_id
`)
```

# Currently Unsupported
There are some MySQL features that are not yet supported. Please create an issue if you'd like to see a certain feature added.

- OUTER JOINS
- UNION
- HAVING
- DELETE/UPDATE using ORDER BY and LIMIT
- ...
