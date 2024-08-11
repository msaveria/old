const { embedPages, resolveUser, withTyping, checkPermissions, confirmEmbed, denyEmbed, errorEmbed, resolveMember, resolveRole } = require("../functions/discord.js");
const { trimArgs } = require("../functions/functions.js");
const { MessageEmbed } = require("discord.js");

const database = require("../db_queries/levels_db.js");
const { globalRank, guildRank, cleanMsgCache } = require("../functions/levels.js");
const { getImgColours } = require("../functions/colours.js");
const { bot } = require("../bot.js");

let lastMsgCache = new Map();
setInterval(cleanMsgCache, 300000, lastMsgCache);

exports.onMessage = function (message) {

    updateUserXp(message);

}

exports.onCommand = async function (message, args) {

    let { channel, member, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('levels' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "leaderboard":
            switch (args[1]) {
                case "global":
                    withTyping(channel, leaderboard, [message, false]);
                    break;
                case "local":
                default:
                    withTyping(channel, leaderboard, [message, true]);
                    break;
            }
            break;

        case "reward":
        case "rewards":
            switch (args[1]) {
                case "add":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, addLevelRole, [message, args]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
                case "remove":
                case "delete":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, removeLevelRole, [message, args]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
                case "list":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, listLevelRole, [message]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
            }
            break;
    }
}

async function updateUserXp(message) {

    let { author, guild, createdTimestamp } = message;

    let addXp = 5;
    let wordcount = message.content.split(/\s+/).length;
    if (wordcount > 12) {
        addXp += 10;
    } else if (wordcount > 3) {
        addXp += 5;
    }
    if (message.attachments.size > 0) {
        addXp += 10;
    }

    if (createdTimestamp - lastMsgCache.get(author.id) < 15000) {
        addXp = Math.floor(addXp / 5);
    }

    lastMsgCache.set(author.id, createdTimestamp);
    database.updateGlobalXp(author.id, addXp);
    database.updateGuildXp(author.id, guild.id, addXp);

    let userGuildXp = await database.getGuildXp(author.id, guild.id);
    let userGuildRank = await guildRank(userGuildXp).lvl;
    if (!userGuildRank) {
        userGuildRank = 0;
    }

    let allroles = await database.getLevelRoles(guild.id);
    for (let testlvl of allroles) {
        if (testlvl.level < userGuildRank || testlvl.level == userGuildRank) {
            if (!guild.roles.cache.has(testlvl.roleID)) {
                return;
            }
            let botMember = await resolveMember(guild, bot.user.id);
            if (checkPermissions(botMember, ["MANAGE_ROLES"])) {
                let role = await resolveRole(guild, testlvl.roleID);
                if (message.member.roles.cache.has(testlvl.roleID)) return;
                if (role) message.member.roles.add(role);
                const embed = new MessageEmbed()
                embed.setColor(role.color || 0x7289DA);
                embed.setDescription(`${author}, you have unlocked the ${role} role!`);
                message.channel.send({ embeds: [embed] });
            } else return;
        }
    }

}

async function leaderboard(message, local) {

    let { guild } = message;
    let ranks = local ? await database.getAllGuildXp(guild.id) :
        await database.getAllGlobalXp();

    let entries = ranks.length;
    ranks = ranks.sort((a, b) => b.xp - a.xp).slice(0, 100); // show only top 100
    for (let i = 0; i < ranks.length; i++) {
        let rank = ranks[i]
        let user = await resolveUser(rank.userID);
        let name = user ? user.username.replace(/([\`\*\~\_])/g, "\\$&") : rank.userID;
        ranks[i] = {
            userID: rank.userID, name: name,
            lvl: local ? guildRank(rank.xp).lvl : globalRank(rank.xp).lvl, xp: rank.xp
        }
    }

    let rankString = ranks.sort((a, b) => a.name.localeCompare(b.name)).sort((a, b) => b.xp - a.xp).map((data, i) => `\`${i + 1}.\` **${data.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}** (Lvl ${data.lvl} - ${data.xp.toLocaleString()} XP)`).join('\n');

    let descriptions = [];
    while (rankString.length > 2048 || rankString.split('\n').length > 25) {
        let currString = rankString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        rankString = rankString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(rankString);

    let embedColor = await getImgColours(guild.iconURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${local ? guild.name : `global`}\nleaderboard`, icon_url: message.guild.iconURL()
            },
            description: desc,
            color: embedColorFinal,
            footer: {
                text: `Total: ${entries} • Avg. Lvl: ${Math.round(ranks.reduce((acc, curr) => acc + curr.lvl, 0) / ranks.length)} • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function addLevelRole(message, args) {

    if (args.length < 3) {
        const embed = errorEmbed("Please provide a level and role to add.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    lvl = args[2];
    roleName = trimArgs(args, 3, message.content);

    let lvlInt = parseInt(lvl);
    if (!lvlInt) {
        const embed = errorEmbed("Level must be a number.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let role = message.guild.roles.cache.find(role => role.name == roleName);
    if (!role) {
        const embed = errorEmbed("This role does not exist on the server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let { guild } = message;
    let addedNotif = await database.addLevelRole(guild.id, role.id, lvlInt);
    if (!addedNotif) {
        const embed = errorEmbed("Error adding level role.");
        message.channel.send({ embeds: [embed] });
        return;
    } else {
        const embed = confirmEmbed(`Reward role ${role} added for level \`${lvlInt}\`.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

}

async function removeLevelRole(message, args) {

    if (args.length < 3) {
        const embed = errorEmbed("Please provide a level and role to remove.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    lvl = args[2];
    roleName = trimArgs(args, 3, message.content);

    let lvlInt = parseInt(lvl);
    if (!lvlInt) {
        const embed = errorEmbed("Level must be a number.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let role = message.guild.roles.cache.find(role => role.name == roleName);
    if (!role) {
        const embed = errorEmbed("This role does not exist on the server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let { guild } = message;
    let addedNotif = await database.removeLevelRole(guild.id, role.id, lvlInt);
    if (!addedNotif) {
        const embed = errorEmbed("Error removing level role.");
        message.channel.send({ embeds: [embed] });
        return;
    } else {
        const embed = confirmEmbed(`Reward role ${role} removed for level \`${lvlInt}\`.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

}

async function listLevelRole(message) {

    let { guild } = message;
    let rewardRoles = await database.getLevelRoles(guild.id);

    if (rewardRoles.length < 1) {
        const embed = errorEmbed(`There are no reward roles in the server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let emojiString = rewardRoles.sort((a, b) => a.level - b.level).map(x => `\`Level ${x.level}\` - <@&${x.roleID}>`).join('\n');

    let descriptions = [];
    while (emojiString.length > 2048 || emojiString.split('\n').length > 25) {
        let currString = emojiString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        emojiString = emojiString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(emojiString);

    let embedColor = await getImgColours(message.guild.iconURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${guild} reward roles${rewardRoles.length != 1 ? 's' : ''}`, icon_url: message.guild.iconURL({ format: 'png', dynamic: true })
            },
            description: desc,
            color: embedColorFinal,
            footer: {
                text: `Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);
}