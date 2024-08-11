const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open({ filename: './data/instagram.db', driver: sqlite3.Database });

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS instaChannels(
            guildID TEXT NOT NULL,
            channelID TEXT NOT NULL,
            username TEXT NOT NUll,
            mentionRoleID TEXT,
            stories INT DEFAULT 1,
            UNIQUE(channelID, username)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS posts(
            username TEXT NOT NULL,
            postID TEXT NOT NULL PRIMARY KEY
        )
    `);
})

exports.addInstaChannel = async function (guildID, channelID, username, mentionRoleID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE 
        INTO instaChannels (guildID, channelID, username, mentionRoleID)
        VALUES (${guildID}, ${channelID}, ${username}, ${mentionRoleID})
    `);
    return statement.changes;
}

exports.removeInstaChannel = async function (channelID, username) {
    const db = await dbopen;

    let statement = await db.run(SQL`DELETE FROM instaChannels WHERE channelID = ${channelID} AND username = ${username} `);
    return statement.changes;
}

exports.getInstaChannel = async function (channelID, username) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT * FROM instaChannels WHERE channelID = ${channelID} AND username = ${username}`);
    return row;
}

exports.getGuildInstaChannels = async function (guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM instaChannels WHERE guildID = ${guildID}`);
    return rows;
}

exports.getAllInstaChannels = async function () {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM instaChannels`);
    return rows;
}

exports.addPost = async function (username, postID) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO posts (username, postID) VALUES (${username}, ${postID})`);
    return statement.changes;
}

exports.getAccountPosts = async function (username) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM posts WHERE username = ${username}`);
    return rows;
}

exports.getAllPosts = async function () {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM posts`);
    return rows;
}