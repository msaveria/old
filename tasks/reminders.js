const {MessageEmbed} = require("discord.js");
const bot = require("../bot.js").bot;
const chalk = require('chalk');
const { getImgColours } = require("../functions/colours.js");

const database = require("../db_queries/reminders_db.js");

exports.tasks = async function() {

    remindersLoop().catch(console.error);

}

async function remindersLoop() {

    let startTime = Date.now();
    
    let overdueReminders = await database.getOverdueReminders();
    for (let reminder of overdueReminders) {
        let { reminderID, userID, remindContent, reminderSetTime } = reminder;
        let recipient = await bot.users.fetch(userID);
        if (recipient) {
            let embedColor = await getImgColours(recipient.displayAvatarURL({ format: 'png', dynamic: false}));
            embedColor.sort((a,b) => {
                let bAltRgb = b.rgb().sort((a,b) => b - a);
                let aAltRgb = a.rgb().sort((a,b) => b - a);
                let bAltSat = bAltRgb[0] / bAltRgb[2];
                let aAltSat = aAltRgb[0] / aAltRgb[2];
                return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
            });
            let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0xfcfcfc;

            let embed = new MessageEmbed({
                author: { name: `Reminder`, icon_url: recipient.displayAvatarURL({ format: 'png', dynamic: true, size: 128 }) },
                description: remindContent,
                timestamp: reminderSetTime * 1000,
                color: embedColorFinal
            });
            recipient.send({ embeds: [embed] });
        }
        database.removeReminder(reminderID);
    }

    setTimeout(remindersLoop, Math.max(10000 - (Date.now() - startTime), 0));

}