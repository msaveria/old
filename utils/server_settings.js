const database = require("../db_queries/server_db.js");

let servers = new Object();

exports.template = {
    "guildID": { name: "Guild ID", type: "ID", category: "Guild" },
    "prefix": { name: "Prefix", type: "text", category: "Guild" },
    "autoroleOn": { name: "Autorole toggle", type: "toggle", category: "Guild" },
    "autoroleID": { name: "Autorole", type: "array", category: "Guild" },
    "commandsOn": { name: "Custom cmds", type: "toggle", category: "Misc" },
    "joinLogsOn": { name: "Mod logs toggle", type: "toggle", category: "Logging" },
    "joinLogsChan": { name: "Mod logs channel", type: "channel", category: "Logging" },
    "msgLogsOn": { name: "Msg logs toggle", type: "toggle", category: "Logging" },
    "msgLogsChan": { name: "Msg logs channel", type: "channel", category: "Logging" },
    "welcomeOn": { name: "Welcome toggle", type: "toggle", category: "Guild" },
    "welcomeChan": { name: "Welcome channel", type: "channel", category: "Guild" },
    "welcomeMsg": { name: "Welcome message", type: "text", category: "Guild" },
    "starboardChannelID": { name: "Starboard channel", type: "channel", category: "Misc" },
    "starboardNumber": { name: "Starboard number", type: "text", category: "Misc" },
    "starboardOn": { name: "Starboard toggle", type: "toggle", category: "Misc" },
    "rolesOn": { name: "Selfrole toggle", type: "toggle", category: "Misc" },
    "muteroleID": { name: "Mute role", type: "role", category: "Misc" },
}

exports.ready = async function () {
    let rows = await database.getServers();
    for (row of rows) {
        servers[row.guildID] = row;
    }
}

exports.initGuild = async function (guildID) {
    await database.initServer(guildID);
    let row = await database.getServer(guildID);
    servers[row.guildID] = row;
}

exports.get = function (guildID, setting) {
    return servers[guildID] ? servers[guildID][setting] : null;
}

exports.getServer = function (guildID) {
    return servers[guildID];
}

exports.set = async function (guildID, setting, value) {

    await database.setVal(guildID, setting, value)
    if (servers[guildID]) {
        servers[guildID][setting] = value;
    } else {
        servers[guildID] = await database.getServer(guildID);
    }

}

exports.toggle = async function (guildID, toggle) {

    let tog = await database.toggle(guildID, toggle)
    if (servers[guildID]) {
        servers[guildID][toggle] = tog;
    } else {
        servers[guildID] = await database.getServer(guildID);
    }
    return tog;

}
