const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
//const dbopen = sqlite.open({ filename: './data/roles.db', driver: sqlite3.Database });
const dbopen = sqlite.open('./data/roles.db');

dbopen.then(async db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS reactionRoles(
            emoji TEXT NOT NULL,
            roleID TEXT NOT NULL,
            roleName TEXT NOT NULL,
            guildID TEXT NOT NULL,
            channelID TEXT NOT NULL,
            messageID TEXT NOT NULL,
            requiredRole TEXT NOT NULL,
            UNIQUE(guildID, channelID, messageID, emoji, requiredRole)
        )
    `);
})

exports.addRole = async function(emoji, roleID, roleName, guildID, channelID, messageID, requiredRole) {
    const db = await dbopen;

    let statement = await db.run(SQL`INSERT OR IGNORE INTO reactionRoles (emoji, roleID, roleName, guildID, channelID, messageID, requiredRole)
    VALUES (${emoji}, ${roleID}, ${roleName}, ${guildID}, ${channelID}, ${messageID}, ${requiredRole})`);
    return statement.changes;
}

exports.removeRole = async function(emoji, guildID, channelID, messageID) {
    const db = await dbopen;
    
    let statement = await db.run(SQL`DELETE FROM reactionRoles WHERE emoji = ${emoji} AND guildID = ${guildID} AND channelID = ${channelID} AND messageID = ${messageID}`);
    return statement.changes;
}

exports.getReactionRole = async function(guildID, channelID, messageID, emoji) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT roleID FROM reactionRoles WHERE guildID = ${guildID} AND channelID = ${channelID} AND messageID = ${messageID} AND emoji = ${emoji}`);
    return rows;
}

exports.getRequiredRole = async function(guildID, channelID, messageID, emoji) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT requiredRole FROM reactionRoles WHERE guildID = ${guildID} AND channelID = ${channelID} AND messageID = ${messageID} AND emoji = ${emoji}`);
    return rows;
}

