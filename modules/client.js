const { MessageEmbed } = require("discord.js");
const { resolveMember, withTyping, errorEmbed, embedPages, checkPermissions } = require("../functions/discord.js");
const { bot } = require("../bot.js");

const serverSettings = require("../utils/server_settings.js");
const { getDelta } = require("../functions/functions.js");

exports.onCommand = async function (message, args) {
    let { channel, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('client' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {

        case "botinfo":
        case "binfo":
        case "botinfo":
            withTyping(channel, botInfo, [message]);
            break
        case "serverlist":
        case "guildlist":
            if (message.author.id === "219991496793915394")
                withTyping(channel, serverList, [message]);
            break;

    }

}

async function botInfo(message) {

    let { guild } = message;

    let botMember = await resolveMember(guild, bot.user.id);
    if (!botMember) {
        errorEmbed(`Could not locate bot as a member. Please try again in a few moments.`);
        return;
    }

    let uptime = getDelta(bot.uptime, 'days');
    let uptimeString = "";
    if (uptime.days) uptimeString += `${uptime.days}d `;
    if (uptime.hours) uptimeString += `${uptime.hours}h `;
    if (uptime.minutes) uptimeString += `${uptime.minutes}m `;
    if (uptime.seconds) uptimeString += `${uptime.seconds}s `;

    let serverCount = [...bot.guilds.cache.values()].length.toLocaleString();
    let cachedUsers = [...bot.users.cache.values()].length.toLocaleString();

    let embed = new MessageEmbed({
        author: { name: `${bot.user.username}'s info` },
        thumbnail: { url: bot.user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        color: botMember.displayColor || 0x303135,
        fields: [
            { name: 'Creator', value: '<@219991496793915394>', inline: true },
            { name: 'Uptime', value: uptimeString, inline: true },
            { name: 'Ping', value: `${Math.floor(bot.ws.ping)}ms`, inline: true },
            { name: 'Server Count', value: serverCount, inline: true },
            { name: 'Cached Users', value: cachedUsers, inline: true }
        ],
        footer: { text: `Type ${serverSettings.get(guild.id, `prefix`)}help for help with ${bot.user.username}`, icon_url: message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) }
    });

    message.channel.send({ embeds: [embed] });

}

async function serverList(message) {

    let guildString = [...bot.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount).map(guild => `**${guild.name}** \`(${guild.id})\` - ${guild.memberCount.toLocaleString()} members`).join('\n');

    let descriptions = [];
    while (guildString.length > 2048 || guildString.split('\n').length > 25) {
        let currString = guildString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        guildString = guildString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(guildString);

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: { name: `${bot.user.username} servers`, icon_url: bot.user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
            description: desc,
            color: 0x303135,
            footer: {
                text: `Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}