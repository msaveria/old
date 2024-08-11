const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
//const dbopen = sqlite.open({ filename: './data/economy.db', driver: sqlite3.Database });
const dbopen = sqlite.open('./data/economy.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS ecoSettings(
            guildID TEXT NOT NULL PRIMARY KEY,
            currencyName TEXT NOT NULL DEFAULT "Dollars",
            currencySymbol TEXT NOT NULL DEFAULT "$",
            currencyEmoji TEXT NOT NULL DEFAULT ":dollar:"
        )
    `);
})

exports.initGuild = async function(guildID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT INTO ecoSettings (guildID, currencyName, currencySymbol, currencyEmoji) 
        VALUES (${guildID}, "Dollars", "$", ":dollar:")
    `);
    return statement.changes;
}

exports.setName = async function(guildID, name) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT INTO ecoSettings (guildID, currencyName) 
        VALUES (${guildID}, ${name})
        ON CONFLICT (guildID) DO 
        UPDATE SET currencyName = ${name}
    `);
    return statement.changes;
}

exports.setEmoji = async function(guildID, currencyEmoji) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT INTO ecoSettings (guildID, currencyEmoji) 
        VALUES (${guildID}, ${currencyEmoji})
        ON CONFLICT (guildID) DO 
        UPDATE SET currencyEmoji = ${currencyEmoji}
    `);
    return statement.changes;
}

exports.setSymbol = async function(guildID, currencySymbol) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT INTO ecoSettings (guildID, currencySymbol) 
        VALUES (${guildID}, ${currencySymbol})
        ON CONFLICT (guildID) DO 
        UPDATE SET currencySymbol = ${currencySymbol}
    `);
    return statement.changes;
}


exports.getEcoSettings = async function(guildID) {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM ecoSettings WHERE guildID = ${guildID}`);
    return rows;
}