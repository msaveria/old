const { bot } = require("../bot.js");
const { MessageEmbed } = require("discord.js");
const database = require("../db_queries/bannedwords_db.js");

const { checkPermissions, resolveMember, resolveRole, resolveUser, withTyping, confirmEmbed, denyEmbed, errorEmbed, embedPages, searchMembers } = require("../functions/discord.js");
const { parseUserID, trimArgs } = require("../functions/functions.js");
const { setMuteRolePerms } = require("../functions/moderation.js");

const serverSettings = require("../utils/server_settings.js");
const { getImgColours } = require("../functions/colours.js");

const userIDsRegex = /^(?:<@\D?)?(\d+)(?:>)?\s*,?\s*/;
const channelIDRegex = /^(?:<#\D?)?(\d+)(?:>)?\s*,?\s*/;

const modnote_db = require("../db_queries/modnotes_db.js");
const mod_db = require("../db_queries/moderation_db.js");
const default_db = require("../db_queries/default_db.js");

exports.onMessage = async function (message) {

    bannedWords(message);

}

const notif_nums = {
    'i': '1!',
    'l': '1|',
    'z': '2',
    'e': '3',
    'a': '4@',
    's': '5$',
    'b': '68',
    't': '7',
    'q': '9',
    'g': '9',
    'o': '0'
}

exports.onCommand = async function (message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "ban":
            if (checkPermissions(member, ["BAN_MEMBERS"]))
                withTyping(channel, banUsers, [message, args]);
            else {
                let embed = denyEmbed("You do not have permission to ban users.");
                channel.send(embed);
            }
            break;
        case "purge":
            if (checkPermissions(member, ["MANAGE_ROLES"]))
                withTyping(channel, banUsers, [message, args, 1]);
            else {
                let embed = denyEmbed("You do not have permission to manage messages.");
                channel.send(embed);
            }
            break;
        case "unban":
            if (checkPermissions(member, ["BAN_MEMBERS"]))
                withTyping(channel, unbanUsers, [message, args]);
            else {
                let embed = denyEmbed("You do not have permission to ban users.");
                channel.send(embed);
            }
            break;
        case "kick":
            if (checkPermissions(member, ["KICK_MEMBERS"]))
                withTyping(channel, kickUsers, [message, args]);
            else {
                let embed = denyEmbed("You do not have permission to kick users.");
                channel.send(embed);
            }
            break;
        case "timeout":
            if (checkPermissions(member, ["MODERATE_MEMBERS"]))
                withTyping(channel, timeoutUsers, [message, args]);
            else {
                let embed = denyEmbed("You do not have permission to timeout users.");
                channel.send(embed);
            }
            break;
        case "untimeout":
            if (checkPermissions(member, ["MODERATE_MEMBERS"]))
                withTyping(channel, untimeoutUsers, [message, args]);
            else {
                let embed = denyEmbed("You do not have permission to timeout users.");
                channel.send(embed);
            }
            break;
        case "mute":
            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                withTyping(channel, muteUsers, [message, args]);
            else {
                let embed = denyEmbed("You do not have permission to manage channels.");
                channel.send(embed);
            }
            break;
        case "unmute":
            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                withTyping(channel, unmuteUsers, [message, args]);
            else {
                let embed = denyEmbed("You do not have permission to manage channels.");
                channel.send(embed);
            }
            break;
        case "modnote":
        case "mn":
        case "note":
            switch (args[1]) {
                case "add":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, addModNote, [message, args.slice(1)]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
                case "remove":
                case "delete":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, removeModNote, [message, args.slice(1)]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
                case "list":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, listModNotes, [message]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
                case "get":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, getModNotes, [message, args.slice(1)]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
            }
            break;
        case "bannedword":
        case "bw":
            switch (args[1]) {
                case "add":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, addBannedWords, [message, args]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
                case "remove":
                case "delete":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, removeBannedWords, [message, args]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
                case "list":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, listBannedWords, [message]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
            }
            break;
        case "default":
        case "df":
            switch (args[1]) {
                case "add":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, addDefault, [message, args]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
                case "remove":
                case "delete":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, removeDefault, [message, args]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
                case "list":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, listBannedWords, [message]);
                    else {
                        let embed = denyEmbed("You do not have permission to manage messages.");
                        channel.send(embed);
                    }
                    break;
            }
            break;

    }

}

async function banUsers(message, args, days = 7) {

    let botMember = await resolveMember(message.guild, bot.user.id);
    if (!checkPermissions(botMember, ["BAN_MEMBERS"])) {
        const embed = denyEmbed("I do not have permission to ban users.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (args.length < 2) {
        const embed = errorEmbed("Please provide someone to ban.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let banString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = banString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        const embed = errorEmbed("Please provide someone to ban.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    const isOwner = message.member.id == message.guild.ownerID;
    let reason = banString.slice(userIDEnd) || ``;
    let bans = await message.guild.bans.fetch();

    let banCount = 0;
    let bannedUsers = []; // users that have been banned
    let alreadyBanned = []; // users who are already banned
    let botBanErrors = []; // users who the bot is unable to ban
    let userBanErrors = []; // users who the banner is unable to ban
    let invalidIDs = []; // IDs that cannot be resolved into users
    let banErrors = []; // generic unknown ban errors
    for (let userID of userIDs) {
        let member = await resolveMember(message.guild, userID);
        let user = member ? member.user : await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (bans.has(user.id)) {
            alreadyBanned.push(user.tag);
        } else if (member && !member.bannable) {
            botBanErrors.push(user.id == message.author.id ? "you" : user.id == bot.user.id ? "myself" : user.tag);
        } else if (!isOwner && member && message.member.roles.highest.position <= member.roles.highest.position) {
            userBanErrors.push(user.id == message.author.id ? "yourself" : user.tag);
        } else if (banCount < 5) {
            try {
                await message.guild.members.ban(user.id, { days, reason });
                await mod_db.addUserHistory(message.guild.id, user.id, 'Ban', reason);
                bannedUsers.push(user.tag);
                banCount++;
            } catch (e) {
                banErrors.push(user.tag);
            }
        }
    }

    let replyString = ``;

    const embed = new MessageEmbed()
    //embed.setAuthor(`Bans`, message.guild.iconURL({ format: 'png', dynamic: true }));
    embed.setColor(0xE74C3C);
    if (userIDs.size > 5) {
        replyString += `<:failure:917540029537062912> You may not ban more than 5 users in a single command.\n`;
    }
    if (bannedUsers.length > 0) {
        replyString += `<:success:917540029264445480> Banned ${bannedUsers.length == 1 ? `${bannedUsers[0]}` : `${bannedUsers.length} users: ${bannedUsers.map(n => `${n}`).join(", ")}`}.\n`;
        embed.setColor(0x27AE60);
        //embed.addField(`Banned (${bannedUsers.length})`, bannedUsers.map(n => `${n}`).join("\n"), true);
    }
    if (alreadyBanned.length > 0) {
        replyString += `<:failure:917540029537062912> ${alreadyBanned.length == 1 ? `${alreadyBanned[0]} is already banned` : `${alreadyBanned.length} users are already banned: ${alreadyBanned.map(n => `${n}`).join(", ")}`}.\n`
        //embed.addField(`Already banned (${alreadyBanned.length})`, alreadyBanned.map(n => `${n}`).join("\n"), true);
    }
    if (botBanErrors.length > 0) {
        replyString += `<:failure:917540029537062912> I am unable to ban ${botBanErrors.length == 1 ? `${botBanErrors[0]}` : `the following users: ${botBanErrors.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`I cannot ban (${botBanErrors.length})`, botBanErrors.map(n => `${n}`).join("\n"), true);
    }
    if (userBanErrors.length > 0) {
        replyString += `<:failure:917540029537062912> You are unable to ban ${userBanErrors.length == 1 ? `${userBanErrors[0]}` : `the following users: ${userBanErrors.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`You cannot ban (${userBanErrors.length})`, userBanErrors.map(n => `${n}`).join("\n"), true);
    }
    if (invalidIDs.length > 0) {
        replyString += `<:failure:917540029537062912> The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
        //embed.addField(`Invalid users (${invalidIDs.length})`, invalidIDs.map(id => `\`${id}\``).join("\n"), true);
    }
    if (banErrors.length > 5) {
        replyString += `<:error:917540029277040651> Ban errors: ${banErrors.join(", ")}.\n`;
        embed.setColor(0xF39C12);
        //embed.addField(`Error (${banErrors.length})`, banErrors.map(n => `${n}`).join("\n"), true);
    }
    embed.setDescription(replyString);
    message.channel.send({ embeds: [embed] });

}

async function unbanUsers(message, args) {

    let botMember = await resolveMember(message.guild, bot.user.id);
    if (!checkPermissions(botMember, ["BAN_MEMBERS"])) {
        const embed = denyEmbed("I do not have permission to unban users.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (args.length < 2) {
        const embed = errorEmbed("Please provide someone to unban.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let banString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = banString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        const embed = errorEmbed("Please provide someone to unban.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let reason = banString.slice(userIDEnd) || ``;
    let bans = await message.guild.bans.fetch();

    let unbanCount = 0;
    let unbannedUsers = []; // users that have been unbanned
    let notBanned = []; // users who are not already banned
    let invalidIDs = []; // IDs that cannot be resolved into users
    let unbanErrors = []; // generic unknown unban errors
    for (let userID of userIDs) {
        let user = await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (!bans.has(user.id)) {
            notBanned.push(user.tag);
        } else if (unbanCount < 5) {
            try {
                await message.guild.members.unban(user.id, reason);
                await mod_db.addUserHistory(message.guild.id, user.id, 'Unban', reason);
                unbannedUsers.push(user.tag);
                unbanCount++;
            } catch (e) {
                unbanErrors.push(user.tag);
            }
        }
    }

    let replyString = ``;

    const embed = new MessageEmbed()
    embed.setColor(0xE74C3C);
    if (userIDs.size > 5) {
        replyString += `<:failure:917540029537062912> You may not unban more than 5 users in a single command.\n`;
    }
    if (unbannedUsers.length > 0) {
        replyString += `<:success:917540029264445480> Unbanned ${unbannedUsers.length == 1 ? `${unbannedUsers[0]}` : `${unbannedUsers.length} users: ${unbannedUsers.map(n => `${n}`).join(", ")}`}.\n`;
        embed.setColor(0x27AE60);
        //embed.addField(`Unbanned (${unbannedUsers.length})`, unbannedUsers.map(n => `${n}`).join("\n"), true);
    }
    if (notBanned.length > 0) {
        replyString += `<:failure:917540029537062912> ${notBanned.length == 1 ? `${notBanned[0]} Not banned` : `${notBanned.length} users are not banned: ${notBanned.map(n => `${n}`).join(", ")}`}.\n`
        //embed.addField(`Not banned (${notBanned.length})`, notBanned.map(n => `${n}`).join("\n"), true);
    }
    if (invalidIDs.length > 0) {
        replyString += `<:failure:917540029537062912> The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
        //embed.addField(`Invalid users (${invalidIDs.length})`, invalidIDs.map(id => `\`${id}\``).join("\n"), true);
    }
    if (unbanErrors.length > 5) {
        replyString += `<:error:917540029277040651> Unban errors: ${unbanErrors.join(", ")}.\n`;
        embed.setColor(0xF39C12);
        //embed.addField(`Error (${unbanErrors.length})`, unbanErrors.map(n => `${n}`).join("\n"), true);
    }
    embed.setDescription(replyString);
    message.channel.send({ embeds: [embed] });

}

async function kickUsers(message, args) {

    let botMember = await resolveMember(message.guild, bot.user.id);
    if (!checkPermissions(botMember, ["KICK"])) {
        const embed = denyEmbed("I do not have permission to kick users.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (args.length < 2) {
        const embed = errorEmbed("Please provide someone to kick.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let kickString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = kickString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        const embed = errorEmbed("Please provide someone to kick.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    const isOwner = message.member.id == message.guild.ownerID;
    let reason = kickString.slice(userIDEnd) || ``;

    let kickCount = 0;
    let kickedUsers = []; // users that have been kicked
    let notMembers = []; // users who cannot be kicked
    let botKickErrors = []; // users who the bot is unable to kick
    let userKickErrors = []; // users who the banner is unable to kick
    let invalidIDs = []; // IDs that cannot be resolved into users
    let kickErrors = []; // generic unknown kick errors
    for (let userID of userIDs) {
        let member = await resolveMember(message.guild, userID);
        let user = member ? member.user : await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (!member) {
            notMembers.push(user.tag);
        } else if (!member.kickable) {
            botKickErrors.push(user.id == message.author.id ? "you" : user.id == bot.user.id ? "myself" : user.tag);
        } else if (!isOwner && message.member.roles.highest.position <= member.roles.highest.position) {
            userKickErrors.push(user.id == message.author.id ? "yourself" : user.tag);
        } else if (kickCount < 5) {
            try {
                await member.kick(reason);
                await mod_db.addUserHistory(message.guild.id, member.id, 'Kick', reason);
                kickedUsers.push(user.tag);
                kickCount++;
            } catch (e) {
                kickErrors.push(user.tag);
            }
        }
    }

    let replyString = ``;

    const embed = new MessageEmbed()
    embed.setColor(0xE74C3C);
    if (userIDs.size > 5) {
        replyString += `<:failure:917540029537062912> You may not kick more than 5 users in a single command.\n`;
    }
    if (kickedUsers.length > 0) {
        replyString += `<:success:917540029264445480> Kicked ${kickedUsers.length == 1 ? `${kickedUsers[0]}` : `${kickedUsers.length} users: ${kickedUsers.map(n => `${n}`).join(", ")}`}.\n`;
        embed.setColor(0x27AE60);
        //embed.addField(`Kicked (${kickedUsers.length})`, kickedUsers.map(n => `${n}`).join("\n"), true);
    }
    if (notMembers.length > 0) {
        replyString += `<:failure:917540029537062912> ${notMembers.length == 1 ? `${notMembers[0]} are not members` : `${notMembers.length} users are not members: ${notMembers.map(n => `${n}`).join(", ")}`}.\n`
        //embed.addField(`Not in server (${notMembers.length})`, notMembers.map(n => `${n}`).join("\n"), true);
    }
    if (botKickErrors.length > 0) {
        replyString += `<:failure:917540029537062912> I am unable to kick ${botKickErrors.length == 1 ? `${botKickErrors[0]}` : `the following users: ${botKickErrors.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`I cannot kick (${botKickErrors.length})`, botKickErrors.map(n => `${n}`).join("\n"), true);
    }
    if (userKickErrors.length > 0) {
        replyString += `<:failure:917540029537062912> You are unable to kick ${userKickErrors.length == 1 ? `${userKickErrors[0]}` : `the following users: ${userKickErrors.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`You cannot kick (${userKickErrors.length})`, userKickErrors.map(n => `${n}`).join("\n"), true);
    }
    if (invalidIDs.length > 0) {
        replyString += `<:failure:917540029537062912> The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
        //embed.addField(`Invalid users (${invalidIDs.length})`, invalidIDs.map(id => `\`${id}\``).join("\n"), true);
    }
    if (kickErrors.length > 5) {
        replyString += `<:error:917540029277040651> Kick errors: ${kickErrors.join(", ")}.\n`;
        embed.setColor(0xF39C12);
        //embed.addField(`Error (${kickErrors.length})`, kickErrors.map(n => `${n}`).join("\n"), true);
    }
    embed.setDescription(replyString);
    message.channel.send({ embeds: [embed] });

}

async function timeoutUsers(message, args) {

    let botMember = await resolveMember(message.guild, bot.user.id);
    if (!checkPermissions(botMember, ["MODERATE_MEMBERS"])) {
        const embed = denyEmbed("I do not have permission to moderate members.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (args.length < 2) {
        const embed = errorEmbed("Please provide someone to timeout.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let muteString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = muteString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        const embed = errorEmbed("Please provide someone to timeout.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let timeSearch = message.content.search(/(?<!\w)for(?!\w)/i);
    let timeString = await message.content.slice(timeSearch + 3).trim();
    let reason = muteString.slice(userIDEnd, muteString.indexOf('for')) || ``;

    let startTimestamp = Date.now();

    let weeks = timeString.match(/(\d+)\s*w(?:ee)?ks?/i);
    let days = timeString.match(/(\d+)\s*d(?:ays)?/i);
    let hours = timeString.match(/(\d+)\s*h(?:ou)?r?s?/i);
    let minutes = timeString.match(/(\d+)\s*m(?:in(?:ute)?s?)?/i);
    let seconds = timeString.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/i);

    if (!(weeks || days || hours || minutes || seconds)) {
        const embed = errorEmbed("Please provide a time to set your timeout for.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let secondsTimestamp = seconds ? seconds[1] * 1000 : 0;
    let minutesTimestamp = minutes ? minutes[1] * 60000 : 0;
    let hoursTimestamp = hours ? hours[1] * 3600000 : 0;
    let daysTimestamp = days ? days[1] * 86400000 : 0;
    let weeksTimestamp = weeks ? weeks[1] * 604800000 : 0;

    let timeoutTimestamp = startTimestamp + weeksTimestamp + daysTimestamp + hoursTimestamp + minutesTimestamp + secondsTimestamp;
    //let remindTimeString = `${weeks ? `${weeks[1]} weeks ` : ``}${days ? `${days[1]} days ` : ``}${hours ? `${hours[1]} hours ` : ``}${minutes ? `${minutes[1]} minutes ` : ``}${seconds ? `${seconds[1]} seconds` : ``}`.trim();
    let timeDiff = timeoutTimestamp - startTimestamp;

    if (timeDiff < 10000) {
        const embed = errorEmbed("Timeouts must be set more than 10 seconds into the future.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (timeDiff > 2332800000) {
        const embed = errorEmbed("Timeouts cannot be more than 1 month long.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let timeoutCount = 0;
    let timeoutUsers = []; // users that have been banned
    let alreadyTimeout = []; // users who are already banned
    let botTimeoutErrors = []; // users who the banner is unable to ban
    let notMembers = []; // users who are not members
    let invalidIDs = []; // IDs that cannot be resolved into users
    let timeoutErrors = []; // generic unknown ban errors
    for (let userID of userIDs) {
        let member = await resolveMember(message.guild, userID);
        let user = member ? member.user : await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (!member) {
            notMembers.push(user.tag);
        } else if (member && !member.manageable) {
            botTimeoutErrors.push(user.id == message.author.id ? "you" : user.id == bot.user.id ? "myself" : user.tag);
        } else if (timeoutCount < 5) {
            if (member.communicationDisabledUntil > startTimestamp) {
                alreadyTimeout.push(user.tag);
            }
            else {
                try {
                    await member.timeout(timeDiff, reason);
                    await mod_db.addUserHistory(message.guild.id, member.id, 'Timeout', reason);
                    timeoutUsers.push(user.tag);
                    timeoutCount++;
                } catch (e) {
                    timeoutErrors.push(user.tag);
                }
            }
        }
    }

    let replyString = ``;

    const embed = new MessageEmbed()
    embed.setColor(0xE74C3C);
    if (userIDs.size > 5) {
        replyString += `<:failure:917540029537062912> You may not timeout more than 5 users in a single command.\n`;
    }
    if (timeoutUsers.length > 0) {
        replyString += `<:success:917540029264445480> Timed out ${timeoutUsers.length == 1 ? `${timeoutUsers[0]}` : `${timeoutUsers.length} users: ${timeoutUsers.map(n => `${n}`).join(", ")}`}.\n`;
        embed.setColor(0x27AE60);
        //embed.addField(`Muted (${timeoutUsers.length})`, timeoutUsers.map(n => `${n}`).join("\n"), true);
    }
    if (alreadyTimeout.length > 0) {
        replyString += `<:failure:917540029537062912> ${alreadyTimeout.length == 1 ? `${alreadyTimeout[0]} is already timed out` : `${alreadyTimeout.length} users are already timed out: ${alreadyTimeout.map(n => `${n}`).join(", ")}`}.\n`
        //embed.addField(`Already muted (${alreadyTimeout.length})`, alreadyTimeout.map(n => `${n}`).join("\n"), true);
    }
    if (notMembers.length > 0) {
        replyString += `<:failure:917540029537062912> Not members ${notMembers.length == 1 ? `${notMembers[0]}` : `the following users: ${notMembers.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`Not in server (${notMembers.length})`, notMembers.map(n => `${n}`).join("\n"), true);
    }
    if (botTimeoutErrors.length > 0) {
        replyString += `<:failure:917540029537062912> I am unable to timeout ${botTimeoutErrors.length == 1 ? `${botTimeoutErrors[0]}` : `the following users: ${botTimeoutErrors.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`I cannot ban (${botBanErrors.length})`, botBanErrors.map(n => `${n}`).join("\n"), true);
    }
    if (invalidIDs.length > 0) {
        replyString += `<:failure:917540029537062912> The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
        //embed.addField(`Invalid users (${invalidIDs.length})`, invalidIDs.map(id => `\`${id}\``).join("\n"), true);
    }
    if (timeoutErrors.length > 5) {
        replyString += `<:error:917540029277040651> Timeout errors: ${timeoutErrors.join(", ")}.\n`;
        embed.setColor(0xF39C12);
        //embed.addField(`Error (${timeoutErrors.length})`, timeoutErrors.map(n => `${n}`).join("\n"), true);
    }
    embed.setDescription(replyString);
    message.channel.send({ embeds: [embed] });


}

async function muteUsers(message, args) {

    let botMember = await resolveMember(message.guild, bot.user.id);
    if (!checkPermissions(botMember, ["MANAGE_CHANNELS"])) {
        const embed = denyEmbed("I do not have permission to manage channels.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (args.length < 2) {
        const embed = errorEmbed("Please provide someone to mute.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let muteString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = muteString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        const embed = errorEmbed("Please provide someone to mute.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let reason = muteString.slice(userIDEnd) || ``;

    let muteCount = 0;
    let mutedUsers = []; // users that have been muted
    let alreadyMuted = []; // users who are already muted
    let cannotMute = []; // users you cannot mute
    let notMembers = []; // users who are not members
    let invalidIDs = []; // IDs that cannot be resolved into users
    let muteErrors = []; // generic unknown mute errors
    for (let userID of userIDs) {
        let member = await resolveMember(message.guild, userID);
        let user = member ? member.user : await resolveUser(userID);
        let aa = await member.permissionsIn(message.channel).serialize();

        if (!user) {
            invalidIDs.push(userID);
        } else if (!member) {
            notMembers.push(user.tag);
        } else if (aa.SEND_MESSAGES === false) {
            alreadyMuted.push(user.tag);
        } else if (muteCount < 5) {
            try {
                await message.channel.permissionOverwrites.create(user.id, { SEND_MESSAGES: false });
                mutedUsers.push(user.tag);
                muteCount++;
            } catch (e) {
                muteErrors.push(user.tag);
            }
        }
    }

    let replyString = ``;

    const embed = new MessageEmbed()
    embed.setColor(0xE74C3C);
    if (userIDs.size > 5) {
        replyString += `<:failure:917540029537062912> You may not mute more than 5 users in a single command.\n`;
    }
    if (mutedUsers.length > 0) {
        replyString += `<:success:917540029264445480> Muted ${mutedUsers.length == 1 ? `${mutedUsers[0]}` : `${mutedUsers.length} users: ${mutedUsers.map(n => `${n}`).join(", ")}`}.\n`;
        embed.setColor(0x27AE60);
        //embed.addField(`Muted (${mutedUsers.length})`, mutedUsers.map(n => `${n}`).join("\n"), true);
    }
    if (alreadyMuted.length > 0) {
        replyString += `<:failure:917540029537062912> ${alreadyMuted.length == 1 ? `${alreadyMuted[0]} is already muted` : `${alreadyMuted.length} users are already muted: ${alreadyMuted.map(n => `${n}`).join(", ")}`}.\n`
        //embed.addField(`Already muted (${alreadyMuted.length})`, alreadyMuted.map(n => `${n}`).join("\n"), true);
    }
    if (notMembers.length > 0) {
        replyString += `<:failure:917540029537062912> Not members ${notMembers.length == 1 ? `${notMembers[0]}` : `the following users: ${notMembers.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`Not in server (${notMembers.length})`, notMembers.map(n => `${n}`).join("\n"), true);
    }
    if (cannotMute.length > 0) {
        replyString += `<:failure:917540029537062912> You are unable to mute ${cannotMute.length == 1 ? `${cannotMute[0]}` : `the following users: ${cannotMute.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`You cannot mute (${cannotMute.length})`, cannotMute.map(n => `${n}`).join("\n"), true);
    }
    if (invalidIDs.length > 0) {
        replyString += `<:failure:917540029537062912> The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
        //embed.addField(`Invalid users (${invalidIDs.length})`, invalidIDs.map(id => `\`${id}\``).join("\n"), true);
    }
    if (muteErrors.length > 5) {
        replyString += `<:error:917540029277040651> Mute errors: ${muteErrors.join(", ")}.\n`;
        embed.setColor(0xF39C12);
        //embed.addField(`Error (${muteErrors.length})`, muteErrors.map(n => `${n}`).join("\n"), true);
    }
    embed.setDescription(replyString);
    message.channel.send({ embeds: [embed] });


}

async function unmuteUsers(message, args) {

    let botMember = await resolveMember(message.guild, bot.user.id);
    if (!checkPermissions(botMember, ["MANAGE_CHANNELS"])) {
        const embed = denyEmbed("I do not have permission to manage roles.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (args.length < 2) {
        const embed = errorEmbed("Please provide someone to unmute.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let muteString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = muteString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        const embed = errorEmbed("Please provide someone to unmute.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let reason = muteString.slice(userIDEnd) || ``;

    let unmuteCount = 0;
    let unmutedUsers = []; // users that have been muted
    let notMuted = []; // users who are already muted
    let cannotUnmute = []; // users you cannot mute
    let notMembers = []; // users who are not members
    let invalidIDs = []; // IDs that cannot be resolved into users
    let muteErrors = []; // generic unknown mute errors
    for (let userID of userIDs) {
        let member = await resolveMember(message.guild, userID);
        let user = member ? member.user : await resolveUser(userID);
        let aa = await member.permissionsIn(message.channel).serialize();

        if (!user) {
            invalidIDs.push(userID);
        } else if (!member) {
            notMembers.push(user.tag);
        } else if (aa.SEND_MESSAGES === true) {
            notMuted.push(user.tag);
        } else if (unmuteCount < 5) {
            try {
                await message.channel.permissionOverwrites.delete(user.id);
                unmutedUsers.push(user.tag);
                unmuteCount++;
            } catch (e) {
                muteErrors.push(user.tag);
            }
        }
    }

    let replyString = ``;

    const embed = new MessageEmbed()
    embed.setColor(0xE74C3C);
    if (userIDs.size > 5) {
        replyString += `<:failure:917540029537062912> You may not unmute more than 5 users in a single command.\n`;
    }
    if (unmutedUsers.length > 0) {
        replyString += `<:success:917540029264445480> Unmuted ${unmutedUsers.length == 1 ? `${unmutedUsers[0]}` : `${unmutedUsers.length} users: ${unmutedUsers.map(n => `${n}`).join(", ")}`}.\n`;
        embed.setColor(0x27AE60);
        //embed.addField(`Unmuted (${unmutedUsers.length})`, unmutedUsers.map(n => `${n}`).join("\n"), true);
    }
    if (notMuted.length > 0) {
        replyString += `<:failure:917540029537062912> ${notMuted.length == 1 ? `${notMuted[0]} is already unmuted` : `${notMuted.length} users are already unmuted: ${notMuted.map(n => `${n}`).join(", ")}`}.\n`
        //embed.addField(`Not muted (${notMuted.length})`, notMuted.map(n => `${n}`).join("\n"), true);
    }
    if (notMembers.length > 0) {
        replyString += `<:failure:917540029537062912> Not members ${notMembers.length == 1 ? `${notMembers[0]}` : `the following users: ${notMembers.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`Not in server (${notMembers.length})`, notMembers.map(n => `${n}`).join("\n"), true);
    }
    if (cannotUnmute.length > 0) {
        replyString += `<:failure:917540029537062912> You are unable to unmute ${cannotUnmute.length == 1 ? `${cannotUnmute[0]}` : `the following users: ${cannotUnmute.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`You cannot unmute (${cannotUnmute.length})`, cannotUnmute.map(n => `${n}`).join("\n"), true);
    }
    if (invalidIDs.length > 0) {
        replyString += `<:failure:917540029537062912> The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
        //embed.addField(`Invalid users (${invalidIDs.length})`, invalidIDs.map(id => `\`${id}\``).join("\n"), true);
    }
    if (muteErrors.length > 5) {
        replyString += `<:error:917540029277040651> Unmute errors: ${muteErrors.join(", ")}.\n`;
        embed.setColor(0xF39C12);
        //embed.addField(`Error (${muteErrors.length})`, muteErrors.map(n => `${n}`).join("\n"), true);
    }
    embed.setDescription(replyString);
    message.channel.send({ embeds: [embed] });

}

async function untimeoutUsers(message, args) {

    let botMember = await resolveMember(message.guild, bot.user.id);
    if (!checkPermissions(botMember, ["MODERATE_MEMBERS"])) {
        const embed = denyEmbed("I do not have permission to moderate members.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (args.length < 2) {
        const embed = errorEmbed("Please provide someone to remove from timeout.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let startTimestamp = Date.now();
    let muteString = trimArgs(args, 1, message.content);

    let userIDs = [];
    let userIDEnd = 0;
    let userIDMatch;
    while (userIDMatch = muteString.slice(userIDEnd).match(userIDsRegex)) {
        userIDs.push(userIDMatch[1]);
        userIDEnd += userIDMatch[0].length;
    }

    userIDs = new Set(userIDs);
    if (userIDs.size < 1) {
        const embed = errorEmbed("Please provide someone to remove from timeout.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let reason = muteString.slice(userIDEnd) || ``;

    let unmuteCount = 0;
    let unmutedUsers = []; // users that have been muted
    let notMuted = []; // users who are already muted
    let cannotUnmute = []; // users you cannot mute
    let notMembers = []; // users who are not members
    let invalidIDs = []; // IDs that cannot be resolved into users
    let muteErrors = []; // generic unknown mute errors
    for (let userID of userIDs) {
        let member = await resolveMember(message.guild, userID);
        let user = member ? member.user : await resolveUser(userID);

        if (!user) {
            invalidIDs.push(userID);
        } else if (!member) {
            notMembers.push(user.tag);
        } else if (!member.communicationDisabledUntil > startTimestamp || member.communicationDisabledUntil == null) {
            notMuted.push(user.tag);
        } else if (unmuteCount < 5) {
            try {
                await member.timeout(null, reason);
                await mod_db.addUserHistory(message.guild.id, member.id, 'Removed timeout', reason);
                unmutedUsers.push(user.tag);
                unmuteCount++;
            } catch (e) {
                muteErrors.push(user.tag);
            }
        }
    }

    let replyString = ``;

    const embed = new MessageEmbed()
    embed.setColor(0xE74C3C);
    if (userIDs.size > 5) {
        replyString += `<:failure:917540029537062912> You may not remove more than 5 users in a single command from timeout.\n`;
    }
    if (unmutedUsers.length > 0) {
        replyString += `<:success:917540029264445480> Removed from timeout ${unmutedUsers.length == 1 ? `${unmutedUsers[0]}` : `${unmutedUsers.length} users: ${unmutedUsers.map(n => `${n}`).join(", ")}`}.\n`;
        embed.setColor(0x27AE60);
        //embed.addField(`Unmuted (${unmutedUsers.length})`, unmutedUsers.map(n => `${n}`).join("\n"), true);
    }
    if (notMuted.length > 0) {
        replyString += `<:failure:917540029537062912> ${notMuted.length == 1 ? `${notMuted[0]} are not timed out` : `${notMuted.length} users are not timed out: ${notMuted.map(n => `${n}`).join(", ")}`}.\n`
        //embed.addField(`Not muted (${notMuted.length})`, notMuted.map(n => `${n}`).join("\n"), true);
    }
    if (notMembers.length > 0) {
        replyString += `<:failure:917540029537062912> Not members ${notMembers.length == 1 ? `${notMembers[0]}` : `the following users: ${notMembers.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`Not in server (${notMembers.length})`, notMembers.map(n => `${n}`).join("\n"), true);
    }
    if (cannotUnmute.length > 0) {
        replyString += `<:failure:917540029537062912> You are unable to remove ${cannotUnmute.length == 1 ? `${cannotUnmute[0]}` : `the following users from timeout: ${cannotUnmute.map(n => `${n}`).join(', ')}`}.\n`;
        //embed.addField(`You cannot unmute (${cannotUnmute.length})`, cannotUnmute.map(n => `${n}`).join("\n"), true);
    }
    if (invalidIDs.length > 0) {
        replyString += `<:failure:917540029537062912> The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
        //embed.addField(`Invalid users (${invalidIDs.length})`, invalidIDs.map(id => `\`${id}\``).join("\n"), true);
    }
    if (muteErrors.length > 5) {
        replyString += `<:error:917540029277040651> Remove from timeout errors: ${muteErrors.join(", ")}.\n`;
        embed.setColor(0xF39C12);
        //embed.addField(`Error (${muteErrors.length})`, muteErrors.map(n => `${n}`).join("\n"), true);
    }
    embed.setDescription(replyString);
    message.channel.send({ embeds: [embed] });

}

async function bannedWords(message) {

    let { guild, author, content } = message;
    if (!content) return;

    if (checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    let bws = await database.getBannedWords(guild.id);
    if (bws.length < 1) return;

    for (let bw of bws) {
        if (bw.guildID && bw.guildID != guild.id) {
            continue;
        }
        //let plural = ['s','x','ch','sh'].includes(bw.keyword[bw.keyword.length-1]) ? 'es':'s';
        //let regexp = new RegExp(`(^|\\W)${bw.keyword}(?:[\`']s|${plural})?($|\\W)`, 'i');
        //let regexp = new RegExp(bw.keyword, 'i');
        var regexp = bw.keyword;
        let anarch_regex = "";
        for (i = 0; i < regexp.length; i++) {
            let char = regexp[i];
            if (char == '\\') {
                let nextchar = regexp[++i];
                anarch_regex += i < regexp.length - 1 ? `${char + nextchar}+\\W*` : `${char + nextchar}+`;
            } else {
                let num = notif_nums[char];
                let insert = num != null ? `[${char + num}]` : char;
                anarch_regex += i < regexp.length - 1 ? `${insert}+\\W*` : `${insert}+`;
            }
        }
        var regexp = new RegExp(anarch_regex, 'i');

        let match = content.match(regexp);
        if (!match) {
            continue;
        } else if (match) {
            message.delete();
            await message.channel.send({ embeds: [denyEmbed(`${author}, your message did not pass the server's filter system.`)] }).then(embedDelete => {
                setTimeout(() => embedDelete.delete(), 5000)
                //embedDelete.delete()
            })
                .catch();
        }
    }

}

async function addBannedWords(message, args) {

    let { guild } = message;

    if (args.length < 2) {
        const embed = errorEmbed("Please provide a keyword to add.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let replyString = [];
    const embed = new MessageEmbed();

    list = trimArgs(args, 2, message.content);
    let array = list.split(/\n+/);

    for (i = 0; i < array.length; i++) {
        let keyword = array[i].trim();
        if (keyword.length > 128) {
            const embed = errorEmbed("Banned words must not exceed 128 characters in length.");
            message.channel.send({ embeds: [embed] });
            return;
        }
        keyword = keyword.toLowerCase();
        let addedNotif = await database.addBannedWord(guild.id, keyword);
        if (!addedNotif) {
            replyString.push(`<:failure:917540029537062912> \`${keyword}\` is already added to the banned words.`);
            embed.setColor(0xE74C3C);
        } else {
            replyString.push(`<:success:917540029264445480> \`${keyword}\` has been added to the banned words.`);
            embed.setColor(0x27AE60);
        }
    }

    embed.setDescription(replyString.length > 4096 ? replyString.slice(0, 4093) + '...' : replyString.join('\n'));
    message.channel.send({ embeds: [embed] });

}

async function removeBannedWords(message, args) {

    let { guild } = message;

    if (args.length < 2) {
        const embed = errorEmbed("Please provide a banned word to remove.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let replyString = [];
    const embed = new MessageEmbed();

    list = trimArgs(args, 2, message.content);
    let array = list.split(/\n+/);

    for (i = 0; i < array.length; i++) {
        let keyword = array[i].trim();
        if (keyword.length > 128) {
            const embed = errorEmbed("Banned words must not exceed 128 characters in length.");
            message.channel.send({ embeds: [embed] });
            return;
        }
        keyword = keyword.toLowerCase();
        let removedNotif = await database.removeBannedWord(guild.id, keyword);
        if (!removedNotif) {
            replyString.push(`<:failure:917540029537062912> \`${keyword}\` is not a banned word.`);
            embed.setColor(0xE74C3C);
        } else {
            replyString.push(`<:success:917540029264445480> \`${keyword}\` has been removed from the banned words.`);
            embed.setColor(0x27AE60);
        }
    }

    embed.setDescription(replyString.length > 4096 ? replyString.slice(0, 4093) + '...' : replyString.join('\n'));
    message.channel.send({ embeds: [embed] });

}

async function listBannedWords(message) {

    let { guild } = message;
    let bw = await database.getBannedWords(guild.id);

    if (bw.length < 1) {
        const embed = errorEmbed(`There are no banned words in the server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let emojiString = bw.map(x => x.keyword).join('\n');

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
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0xfcfcfc;

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${guild}\nNanned Word${bw.length != 1 ? 's' : ''}`, icon_url: message.guild.iconURL({ format: 'png', dynamic: true })
            },
            description: desc,
            color: embedColorFinal,
            footer: {
                text: `${bw.length} total • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);
}

async function addModNote(message, args) {

    let { guild, author, content } = message;

    if (args < 3) {
        const embed = errorEmbed("Please provide a user and a note.")
        message.channel.send({ embeds: [embed] });
    }

    let target = args[1];
    let member;
    let user;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content)
        let members = await guild.members.fetch();

        member = await searchMembers(members, target)
        if (!member) {
            const embed = errorEmbed("Invalid user or user ID.")
            message.channel.send({ embeds: [embed] });
            return;
        } else {
            userID = member.id;
        }
    }

    member = member || await resolveMember(guild, userID);
    if (member) {
        user = member.user;
    } else {
        user = await resolveUser(userID);
    }

    let note = trimArgs(args, 2, message.content);

    added = await modnote_db.addNote(guild.id, userID, note);
    if (added) {
        const embed = confirmEmbed(`Added a mod note for ${member}: ${note}.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = errorEmbed(`Something went wrong adding a mod note for ${member}. Try again.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function removeModNote(message, args) {

    if (args < 2) {
        const embed = errorEmbed("Please provide a note number to remove.")
        message.channel.send({ embeds: [embed] });
    }

    if (isNaN(args[1])) {
        const embed = denyEmbed(`\`${args[1]}\` is not a number. Check to make sure the number is right.`);
        message.channel.send({ embeds: [embed] });
    } else {
        removed = await modnote_db.removeNote(args[1]);
        if (removed) {
            const embed = confirmEmbed(`Removed mod note \`${args[1]}\`.`);
            message.channel.send({ embeds: [embed] });
        } else {
            const embed = errorEmbed(`Something went wrong removing mod note ${args[1]}. Check to make sure the number is right.`);
            message.channel.send({ embeds: [embed] });
        }
    }

}

async function listModNotes(message) {

    let { guild } = message;
    let bw = await modnote_db.getAllNotes(guild.id);

    if (bw.length < 1) {
        const embed = errorEmbed(`There are no mod notes in the server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let emojiString = bw.map(x => `\`${x.noteID}.\` <@${x.userID}> (${x.userID})\`\`\`${x.note}\`\`\``).join('\n');

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
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0xfcfcfc;

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${guild}\nMod Note${bw.length != 1 ? 's' : ''}`, icon_url: message.guild.iconURL({ format: 'png', dynamic: true })
            },
            description: desc,
            color: embedColorFinal,
            footer: {
                text: `${bw.length} total • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function getModNotes(message, args) {

    let { guild } = message;
    if (args < 2) {
        const embed = errorEmbed("Please provide a user.")
        message.channel.send({ embeds: [embed] });
    }

    let target = args[1];
    let member;
    let user;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content)
        let members = await guild.members.fetch();

        member = await searchMembers(members, target)
        if (!member) {
            const embed = errorEmbed("Invalid user or user ID.")
            message.channel.send({ embeds: [embed] });
            return;
        } else {
            userID = member.id;
        }
    }

    member = member || await resolveMember(guild, userID);
    if (member) {
        user = member.user;
    } else {
        user = await resolveUser(userID);
    }

    let bw = await modnote_db.getUserNotes(guild.id, userID);

    if (bw.length < 1) {
        const embed = errorEmbed(`There are no mod notes for ${member} in the server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let emojiString = bw.map(x => `\`${x.noteID}.\` <@${x.userID}> (${x.userID})\`\`\`${x.note}\`\`\``).join('\n');

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

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${member.user.tag}\nMod Note${bw.length != 1 ? 's' : ''}`, icon_url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 })
            },
            description: desc,
            color: member.displayColor || 0xfcfcfc,
            footer: {
                text: `${bw.length} total • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function getModNotes(message, args) {

    let { guild } = message;
    if (args < 2) {
        const embed = errorEmbed("Please provide a user.")
        message.channel.send({ embeds: [embed] });
    }

    let target = args[1];
    let member;
    let user;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content)
        let members = await guild.members.fetch();

        member = await searchMembers(members, target)
        if (!member) {
            const embed = errorEmbed("Invalid user or user ID.")
            message.channel.send({ embeds: [embed] });
            return;
        } else {
            userID = member.id;
        }
    }

    member = member || await resolveMember(guild, userID);
    if (member) {
        user = member.user;
    } else {
        user = await resolveUser(userID);
    }

    let bw = await modnote_db.getUserNotes(guild.id, userID);

    if (bw.length < 1) {
        const embed = errorEmbed(`There are no mod notes for ${member} in the server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let emojiString = bw.map(x => `\`${x.noteID}.\` <@${x.userID}> (${x.userID})\`\`\`${x.note}\`\`\``).join('\n');

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

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${member.user.tag}\nMod Note${bw.length != 1 ? 's' : ''}`, icon_url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 })
            },
            description: desc,
            color: member.displayColor || 0xfcfcfc,
            footer: {
                text: `${bw.length} total • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function addDefault(message, args) {

    let { guild } = message;

    if (args < 3) {
        const embed = errorEmbed("Please provide a channel and a module.")
        message.channel.send({ embeds: [embed] });
    }

    let channelString = trimArgs(args, 2, message.content);

    let channelIDs = [];
    let channelIDEnd = 0;
    let channelIDMatch;
    while (channelIDMatch = channelString.slice(channelIDEnd).match(channelIDRegex)) {
        channelIDs.push(channelIDMatch[1]);
        channelIDEnd += channelIDMatch[0].length;
    }

    channelIDs = new Set(channelIDs);
    if (channelIDs.size < 1) {
        const embed = errorEmbed("Please a channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let mod = channelString.slice(channelIDEnd) || ``;
    if (mod !== 'all' && mod !== 'client' && mod !== 'commands' && mod !== 'economy' && mod !== 'emoji' && mod !== 'games' && mod !== 'information' && mod !== 'lastfm' && mod !== 'levels' && mod !== 'management' && mod !== 'media' && mod !== 'misc' && mod !== 'notification' && mod !== 'moderation' && mod !== 'profiles' && mod !== 'reminders' && mod !== 'reps' && mod !== 'roles' && mod !== 'starboard') return message.channel.send({ embeds: [errorEmbed(`You did not list a valid module.`)] });
    let channels = await message.guild.channels.fetch();

    let channelSuccess = []; 
    let channelFail = [];
    let invalidIDs = []; 
    let channelErrors = []; 

    for (let channelID of channelIDs) {
        let channel = await message.guild.channels.fetch(channelID);

        if (!channel) {
            invalidIDs.push(channelID);
        } else if (!channels.has(channel.id)) {
            invalidIDs.push(channelID);
        } else {
            try {
                added = await default_db.addDefult(channel.id, guild.id, mod);
                if (added) {
                    channelSuccess.push(channel);
                } else {
                    channelFail.push(channel);
                }
            } catch (e) {
                channelErrors.push(channelID);
            }
        }
    }

    let replyString = ``;

    const embed = new MessageEmbed()
    embed.setColor(0xE74C3C);
    if (channelSuccess.length > 0) {
        replyString += `<:success:917540029264445480> Added ${channelSuccess.length == 1 ? `${channelSuccess[0]}` : `${channelSuccess.length} channels: ${channelSuccess.map(n => `${n}`).join(", ")}`}.\n`;
        embed.setColor(0x27AE60);
        //embed.addField(`Kicked (${kickedUsers.length})`, kickedUsers.map(n => `${n}`).join("\n"), true);
    }
    if (channelFail.length > 0) {
        replyString += `<:failure:917540029537062912> ${channelFail.length == 1 ? `${channelFail[0]} could not be added` : `${channelFail.length} channels could not be added: ${channelFail.map(n => `${n}`).join(", ")}`}.\n`
        //embed.addField(`Not in server (${notMembers.length})`, notMembers.map(n => `${n}`).join("\n"), true);
    }
    if (invalidIDs.length > 0) {
        replyString += `<:failure:917540029537062912> The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
        //embed.addField(`Invalid users (${invalidIDs.length})`, invalidIDs.map(id => `\`${id}\``).join("\n"), true);
    }
    if (channelErrors.length > 5) {
        replyString += `<:error:917540029277040651> Errors: ${channelErrors.join(", ")}.\n`;
        embed.setColor(0xF39C12);
        //embed.addField(`Error (${kickErrors.length})`, kickErrors.map(n => `${n}`).join("\n"), true);
    }
    embed.setDescription(replyString);
    message.channel.send({ embeds: [embed] });

}

async function removeDefault(message, args) {

    let { guild } = message;

    if (args < 3) {
        const embed = errorEmbed("Please provide a channel and a module.")
        message.channel.send({ embeds: [embed] });
    }

    let channelString = trimArgs(args, 2, message.content);

    let channelIDs = [];
    let channelIDEnd = 0;
    let channelIDMatch;
    while (channelIDMatch = channelString.slice(channelIDEnd).match(channelIDRegex)) {
        channelIDs.push(channelIDMatch[1]);
        channelIDEnd += channelIDMatch[0].length;
    }

    channelIDs = new Set(channelIDs);
    if (channelIDs.size < 1) {
        const embed = errorEmbed("Please a channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let mod = channelString.slice(channelIDEnd) || ``;
    if (mod !== 'all' && mod !== 'client' && mod !== 'commands' && mod !== 'economy' && mod !== 'emoji' && mod !== 'games' && mod !== 'information' && mod !== 'lastfm' && mod !== 'levels' && mod !== 'management' && mod !== 'media' && mod !== 'misc' && mod !== 'notification' && mod !== 'moderation' && mod !== 'profiles' && mod !== 'reminders' && mod !== 'reps' && mod !== 'roles' && mod !== 'starboard') return message.channel.send({ embeds: [errorEmbed(`You did not list a valid module.`)] });
    let channels = await message.guild.channels.fetch();

    let channelSuccess = []; // users that have been banned
    let channelFail = []; // users who are already banned
    let invalidIDs = []; // IDs that cannot be resolved into users
    let channelErrors = []; // generic unknown ban errors

    for (let channelID of channelIDs) {
        let channel = await message.guild.channels.fetch(channelID);

        if (!channel) {
            invalidIDs.push(channel);
        } else if (!channels.has(channel.id)) {
            invalidIDs.push(channel);
        } else {
            try {
                removed = await default_db.removeDefault(mod, channel.id);
                if (removed) {
                    channelSuccess.push(channel);
                } else {
                    channelFail.push(channel);
                }
            } catch (e) {
                channelErrors.push(channel);
            }
        }
    }

    let replyString = ``;

    const embed = new MessageEmbed()
    embed.setColor(0xE74C3C);
    if (channelSuccess.length > 0) {
        replyString += `<:success:917540029264445480> Removed ${channelSuccess.length == 1 ? `${channelSuccess[0]}` : `${channelSuccess.length} channels: ${channelSuccess.map(n => `${n}`).join(", ")}`}.\n`;
        embed.setColor(0x27AE60);
        //embed.addField(`Kicked (${kickedUsers.length})`, kickedUsers.map(n => `${n}`).join("\n"), true);
    }
    if (channelFail.length > 0) {
        replyString += `<:failure:917540029537062912> ${channelFail.length == 1 ? `${channelFail[0]} could not be removed` : `${channelFail.length} channels could not be removed: ${channelFail.map(n => `${n}`).join(", ")}`}.\n`
        //embed.addField(`Not in server (${notMembers.length})`, notMembers.map(n => `${n}`).join("\n"), true);
    }
    if (invalidIDs.length > 0) {
        replyString += `<:failure:917540029537062912> The following IDs are invalid: ${invalidIDs.map(id => `\`${id}\``)}.\n`;
        //embed.addField(`Invalid users (${invalidIDs.length})`, invalidIDs.map(id => `\`${id}\``).join("\n"), true);
    }
    if (channelErrors.length > 5) {
        replyString += `<:error:917540029277040651> Errors: ${channelErrors.join(", ")}.\n`;
        embed.setColor(0xF39C12);
        //embed.addField(`Error (${kickErrors.length})`, kickErrors.map(n => `${n}`).join("\n"), true);
    }
    embed.setDescription(replyString);
    message.channel.send({ embeds: [embed] });

}