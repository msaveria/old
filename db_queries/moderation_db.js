const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
//const dbopen = sqlite.open({ filename: './data/moderation.db', driver: sqlite3.Database });
const dbopen = sqlite.open('./data/moderation.db');

dbopen.then(async db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS automod(
            guildID TEXT NOT NULL,
            strikes INT NOT NULL,
            punishment TEXT NOT NULL,
            UNIQUE(guildID, strikes, punishment)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS userHistory(
            guildID TEXT NOT NULL,
            userID TEXT NOT NULL,
            punishment TEXT NOT NULL,
            reason TEXT NOT NULL,
            UNIQUE(guildID, userID)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS userStrikes(
            guildID TEXT NOT NULL,
            userID TEXT NOT NULL,
            strikes INT NOT NULL,
            UNIQUE(guildID, userID)
        )
    `);
})

exports.addAutoPunishment = async function (guildID, strikes, punishment) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO automod (guildID, strikes, punishment)
        VALUES (${guildID}, ${strikes}, ${punishment})
    `);
    return statement.changes;
}

exports.removeAutoPunishment = async function (punishmentID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM automod
        WHERE punishmentID = ${punishmentID}
    `);
    return statement.changes;
}

exports.getAllAutoPunishments = async function (guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM automod WHERE guildID = ${guildID}`);
    return rows;
}

exports.getAutoPunishment = async function (guildID, strikes) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM automod WHERE guildID = ${guildID} AND strikes = ${strikes}`);
    return rows;
}

exports.addUserHistory = async function (guildID, userID, punishment, reason) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO userHistory (guildID, userID, punishment, reason)
        VALUES (${guildID}, ${userID}, ${punishment}, ${reason})
    `);
    return statement.changes;
}

exports.getUserHistory = async function (guildID, userID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM userHistory WHERE guildID = ${guildID} AND userID = ${userID}`);
    return rows;
}

exports.addUserStrike = async function (guildID, userID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT INTO userStrikes (guildID, userID, strikes)
        VALUES (${guildID}, ${userID}, 1)
        ON CONFLICT (userID) DO
        UPDATE SET strikes = strikes + 1
    `);
    return statement.changes;
}