const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
//const dbopen = sqlite.open({ filename: './data/bannedwords.db', driver: sqlite3.Database });
const dbopen = sqlite.open('./data/bannedwords.db');

dbopen.then(async db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS bannedWords(
            guildID TEXT NOT NULL,
            keyword TEXT NOT NULL,
            UNIQUE(guildID, keyword)
        )
    `);
})

exports.addBannedWord = async function(guildID, keyword) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO bannedWords (guildID, keyword)
        VALUES (${guildID}, ${keyword})
    `);
    return statement.changes;
}

exports.removeBannedWord = async function(guildID, keyword) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM bannedWords
        WHERE guildID = ${guildID} AND keyword = ${keyword}
    `);
    return statement.changes;
}

exports.getBannedWords = async function(guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM bannedWords WHERE guildID = ${guildID}`);
    return rows;
}
