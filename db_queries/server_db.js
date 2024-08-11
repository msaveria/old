const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const SQL = require("sql-template-strings");
//const dbopen = sqlite.open({ filename: './data/servers.db', driver: sqlite3.Database });
const dbopen = sqlite.open('./data/servers.db');

dbopen.then(db => {
    db.run(SQL`
        CREATE TABLE IF NOT EXISTS serverSettings(
            guildID TEXT NOT NULL PRIMARY KEY,
            prefix TEXT NOT NULL DEFAULT '-',
            autoroleOn INT NOT NULL DEFAULT 0,
            autoroleID TEXT,
            commandsOn INT NOT NULL DEFAULT 1, 
            joinLogsOn INT NOT NULL DEFAULT 0, 
            joinLogsChan TEXT,
            msgLogsOn INT NOT NULL DEFAULT 0,
            msgLogsChan TEXT,
            welcomeOn INT NOT NULL DEFAULT 0,
            welcomeChan TEXT,
            welcomeMsg TEXT,
            starboardOn INT NOT NULL DEFAULT 0,
            starboardChannelID TEXT,
            starboardNumber TEXT,
            rolesOn INT NOT NULL DEFAULT 0,
            muteroleID TEXT
        )
    `);
})

exports.setVal = async function(guildID, col, val) {
    const db = await dbopen;

    let statement = await db.run(`
        INSERT INTO serverSettings (guildID, ${col})
        VALUES (?, ?)
        ON CONFLICT (guildID) DO
        UPDATE SET ${col} = ?`,
        [guildID, val, val]
    );
    return statement.changes;
}

exports.toggle = async function(guildID, col) {
    const db = await dbopen;

    let statement = await db.run(`
        UPDATE OR IGNORE serverSettings
        SET ${col} = ~${col} & 1
        WHERE guildID = ?`, [guildID]  
    );

    let toggle = 0;
    if (statement.changes) {
        let row = await db.get(`SELECT ${col} FROM serverSettings WHERE guildID = ?`, [guildID]);
        toggle = row ? row[col] : 0;
    }
    return toggle;
}

exports.initServer = async function(guildID) {
    const db = await dbopen;

    let statement = await db.run(SQL`
        INSERT OR IGNORE INTO serverSettings 
        (guildID) 
        VALUES (${guildID})
    `);
    return statement.changes;
}

exports.getServers = async function() {
    const db = await dbopen;

    let rows = await db.all(SQL`SELECT * FROM serverSettings`);
    return rows;
}

exports.getServer = async function(guildID) {
    const db = await dbopen;

    let row = await db.get(SQL`SELECT * FROM serverSettings WHERE guildID = ${guildID}`);
    return row;
}