const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
//const dbopen = sqlite.open({ filename: './data/levels.db', driver: sqlite3.Database });
const dbopen = sqlite.open('./data/levels.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS globalXp(
            userID TEXT NOT NULL PRIMARY KEY,
            xp INT NOT NULL DEFAULT 0
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS guildXp(
            userID TEXT NOT NULL,
            guildID TEXT NOT NULL,
            xp INT NOT NULL DEFAULT 0,
            UNIQUE(userID, guildID)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS roles(
            guildID TEXT NOT NULL,
            roleID TEXT NOT NULL,
            level INT NOT NULL,
            UNIQUE(guildID, roleID, level)
        )
    `);
})

exports.updateGlobalXp = async function(userID, addXp) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT INTO globalXp VALUES (${userID}, ${addXp})
        ON CONFLICT (userID) DO
        UPDATE SET xp = xp + ${addXp}
    `);
    return statement.changes;
}

exports.updateGuildXp = async function(userID, guildID, addXp) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT INTO guildXp VALUES (${userID}, ${guildID}, ${addXp})
        ON CONFLICT (userID, guildID) DO
        UPDATE SET xp = xp + ${addXp}
    `);
    return statement.changes;
}

exports.getGlobalXp = async function(userID) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT xp FROM globalXp WHERE userID = ${userID}`);
    return row ? row.xp : 0;
}

exports.getGuildXp = async function(userID, guildID) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT xp FROM guildXp WHERE userID = ${userID} AND guildID = ${guildID}`);
    return row ? row.xp : 0;
}

exports.getAllGlobalXp = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM globalXp`);
    return rows;
}

exports.getAllGuildXp = async function(guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM guildXp WHERE guildID = ${guildID}`);
    return rows;
}

exports.getLevelRole = async function(guildID, level) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT roleID FROM roles WHERE guildID = ${guildID} AND level = ${level}`);
    return row ? row : null;
}

exports.addLevelRole = async function(guildID, roleID, level) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO roles (guildID, roleID, level)
        VALUES (${guildID}, ${roleID}, ${level})
    `);
    return statement.changes;
}

exports.removeLevelRole = async function(guildID, roleID, level) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM roles
        WHERE guildID = ${guildID} AND roleID = ${roleID} AND level = ${level}
    `);
    return statement.changes;
}

exports.getLevelRoles = async function(guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM roles WHERE guildID = ${guildID}`);
    return rows;
}