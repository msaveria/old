const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open({ filename: './data/tiktok.db', driver: sqlite3.Database });

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS tiktokChannels(
            guildID TEXT NOT NULL,
            discordChanID TEXT NOT NULL,
            account TEXT NOT NULL,
            mentionRoleID TEXT,
            UNIQUE(discordChanID, account)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS posts(
            account TEXT NOT NULL,
            postID TEXT NOT NULL PRIMARY KEY
        )
    `);
})

exports.addTikTokChannel = async function (guildID, discordChanID, account, mentionRoleID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE 
        INTO tiktokChannels (guildID, discordChanID, account, mentionRoleID)
        VALUES (${guildID}, ${discordChanID}, ${account}, ${mentionRoleID})
    `);
    return statement.changes;
}

exports.removeTikTokChannel = async function (discordChanID, account) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM tiktokChannels
        WHERE discordChanID = ${discordChanID} AND account = ${account}
    `);
    return statement.changes;
}

exports.getTikTokChannel = async function (discordChanID) {
    const db = await dbopen;

    let row = await db.get(SQL`
        SELECT * FROM tiktokChannels 
        WHERE discordChanID = ${discordChanID}
    `);
    return row;
}

exports.getGuildTikTokChannels = async function (guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM tiktokChannels WHERE guildID = ${guildID}`);
    return rows;
}

exports.getAllTikTokChannels = async function () {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM tiktokChannels`);
    return rows;
}

exports.toggleTikTok = async function (discordChanID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        UPDATE OR IGNORE tiktokChannels 
        SET RPICK = ~RPICK & 1 
        WHERE discordChanID = ${discordChanID}
    `);

    let toggle = 0;
    if (statement.changes) {
        let row = await db.get(SQL`SELECT RPICK FROM tiktokChannels WHERE discordChanID = ${discordChanID}`);
        toggle = row ? row.RPICK : 0;
    }
    return toggle;
}

exports.addPost = async function (account, postID) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO posts (account, postID) VALUES (${account}, ${postID})`);
    return statement.changes;
}

exports.getAccountPosts = async function (account) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM posts WHERE account = ${account}`);
    return rows;
}

exports.getAllAccountPosts = async function () {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM posts`);
    return rows;
}