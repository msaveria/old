const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
//const dbopen = sqlite.open({ filename: './data/default.db', driver: sqlite3.Database });
const dbopen = sqlite.open('./data/default.db');

dbopen.then(async db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS defaultCmds(
            cmdMod TEXT PRIMARY KEY NOT NULL,
            channelID TEXT NOT NULL,
            guildID TEXT NOT NULL,
            UNIQUE(cmdMod, channelID)
        )
    `);
})

exports.addDefult = async function(channelID, guildID, cmdMod) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO defaultCmds (cmdMod, channelID, guildID)
        VALUES (${cmdMod}, ${channelID}, ${guildID})
    `);
    return statement.changes;
}

exports.removeDefault = async function(cmdMod, channelID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM defaultCmds
        WHERE cmdMod = ${cmdMod} AND channelID = ${channelID}
    `);
    return statement.changes;
}

exports.getAllDefaults = async function(guildID, channelID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM defaultCmds WHERE guildID = ${guildID} AND channelID = ${channelID}`);
    return rows;
}