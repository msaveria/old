const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
//const dbopen = sqlite.open({ filename: './data/modnotes.db', driver: sqlite3.Database });
const dbopen = sqlite.open('./data/modnotes.db');

dbopen.then(async db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS modNotes(
            noteID INTEGER PRIMARY KEY AUTOINCREMENT,
            guildID TEXT NOT NULL,
            userID TEXT NOT NULL,
            note TEXT NOT NULL,
            UNIQUE(guildID, userID, note)
        )
    `);
})

exports.addNote = async function(guildID, userID, note) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO modNotes (guildID, userID, note)
        VALUES (${guildID}, ${userID}, ${note})
    `);
    return statement.changes;
}

exports.removeNote = async function(noteID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM modNotes
        WHERE noteID = ${noteID}
    `);
    return statement.changes;
}

exports.getAllNotes = async function(guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM modNotes WHERE guildID = ${guildID}`);
    return rows;
}

exports.getUserNotes = async function(guildID, userID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM modNotes WHERE guildID = ${guildID} AND userID = ${userID}`);
    return rows;
}