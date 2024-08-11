const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
const dbopen = sqlite.open({ filename: './data/youtube.db', driver: sqlite3.Database });

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS youtubeChannels(
            channelName TEXT NOT NULL,
            guildID TEXT NOT NULL,
            discordChanID TEXT NOT NULL,
            ytchannel TEXT NOT NULL,
            mentionRoleID TEXT,
            UNIQUE(discordChanID, ytchannel)
        )
    `);
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS posts(
            ytchannel TEXT NOT NULL,
            postID TEXT NOT NULL PRIMARY KEY
        )
    `);
})

exports.addYoutubeChannel = async function(channelName, guildID, discordChanID, ytchannel, mentionRoleID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE 
        INTO youtubeChannels (channelName, guildID, discordChanID, ytchannel, mentionRoleID)
        VALUES (${channelName}, ${guildID}, ${discordChanID}, ${ytchannel}, ${mentionRoleID})
    `);
    return statement.changes;
}

exports.removeYoutubeChannel = async function(discordChanID, channelName) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        DELETE FROM youtubeChannels
        WHERE discordChanID = ${discordChanID} AND channelName = ${channelName}
    `);
    return statement.changes;
} 

exports.getYoutubeChannel = async function(discordChanID) {
    const db = await dbopen;

    let row = await db.get(SQL`
        SELECT * FROM youtubeChannels 
        WHERE discordChanID = ${discordChanID}
    `);
    return row;
}

exports.getGuildYoutubeChannels = async function(guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM youtubeChannels WHERE guildID = ${guildID}`);
    return rows;
}

exports.getAllYoutubeChannels = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM youtubeChannels`);
    return rows;
}

exports.toggleYoutube = async function(discordChanID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        UPDATE OR IGNORE youtubeChannels 
        SET RPICK = ~RPICK & 1 
        WHERE discordChanID = ${discordChanID}
    `);

    let toggle = 0;
    if (statement.changes) {
        let row = await db.get(SQL`SELECT RPICK FROM youtubeChannels WHERE discordChanID = ${discordChanID}`);
        toggle = row ? row.RPICK : 0;
    }
    return toggle;
}

exports.addPost = async function(ytchannel, postID) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO posts (ytchannel, postID) VALUES (${ytchannel}, ${postID})`);
    return statement.changes;
}

exports.getYTPosts = async function(ytchannel) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM posts WHERE ytchannel = ${ytchannel}`);
    return rows;
}

exports.getAllYTPosts = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM posts`);
    return rows;
}