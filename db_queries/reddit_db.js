const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open({ filename: './data/reddit.db', driver: sqlite3.Database });

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS redditChannels(
            guildID TEXT NOT NULL,
            discordChanID TEXT NOT NULL,
            subreddit TEXT NOT NUll,
            mentionRoleID TEXT,
            UNIQUE(discordChanID, subreddit)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS rposts(
            subreddit TEXT NOT NULL,
            postID TEXT NOT NULL PRIMARY KEY
        )
    `);
})

exports.addRedditChannel = async function (guildID, discordChanID, subreddit, mentionRoleID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE 
        INTO redditChannels (guildID, discordChanID, subreddit, mentionRoleID)
        VALUES (${guildID}, ${discordChanID}, ${subreddit}, ${mentionRoleID})
    `);
    return statement.changes;
}

exports.removeRedditChannel = async function (discordChanID, subreddit) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM redditChannels
        WHERE discordChanID = ${discordChanID} AND subreddit = ${subreddit}
    `);
    return statement.changes;
}

exports.getRedditChannel = async function (discordChanID) {
    const db = await dbopen;

    let row = await db.get(SQL`
        SELECT * FROM redditChannels 
        WHERE discordChanID = ${discordChanID}
    `);
    return row;
}

exports.getGuildRedditChannels = async function (guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM redditChannels WHERE guildID = ${guildID}`);
    return rows;
}

exports.getAllRedditChannels = async function () {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM redditChannels`);
    return rows;
}

exports.addPost = async function (subreddit, postID) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO rposts (subreddit, postID) VALUES (${subreddit}, ${postID})`);
    return statement.changes;
}

exports.getSubPosts = async function (subreddit) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM rposts WHERE subreddit = ${subreddit}`);
    return rows;
}

exports.getAllSubPosts = async function () {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM rposts`);
    return rows;
}