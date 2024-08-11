const Discord = require("discord.js");
const moment = require("moment");
const {
    checkPermissions,
    getMemberNumber,
    resolveMember,
    withTyping,
    embedBuilder,
    confirmEmbed,
    errorEmbed } = require("../functions/discord.js");
const { bot } = require("../bot.js");

const serverSettings = require("../utils/server_settings.js");
const { resolveUsedInvite } = require("../utils/invite_cache.js");
const { parseChannelID, trimArgs } = require("../functions/functions.js");

exports.join = async function (member) {
    welcome(member);
    logJoin(member);
}

exports.leave = async function (member) {
    logLeave(member);
}

exports.kickMsg = async function (member) {
    kickLogMsg(member);
}

exports.banMsg = async function (guild, member) {
    banLogMsg(guild, member);
}

exports.unbanMsg = async function (guild, member) {
    unbanLogMsg(guild, member);
}

exports.onCommand = async function (message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "punishments":
        case "punishmentlog":
            switch (args[1]) {
                case "channel":
                    switch (args[2]) {
                        case "set":
                            if (checkPermissions(member, ["BAN_MEMBERS"]))
                                withTyping(channel, setJoinChannel, [message, args[3]])
                            break;
                    }
                    break;
                case "toggle":
                    if (checkPermissions(member, ["BAN_MEMBERS"]))
                        withTyping(channel, toggleJoin, [message]);
                    break;
                default:
                    message.channel.send(`Help coming soon.`);
                    break;
            }
            break;
        case "greeter":
            switch (args[1]) {
                case "channel":
                    switch (args[2]) {
                        case "set":
                            if (checkPermissions(member, ["BAN_MEMBERS"]))
                                withTyping(channel, setWelcomeChannel, [message, args[3]]);
                            break;
                    }
                    break;
                case "message":
                case "msg":
                    switch (args[2]) {
                        case "set":
                            if (checkPermissions(member, ["BAN_MEMBERS"]))
                                withTyping(channel, setWelcomeMsg, [message, args]);
                            break;
                    }
                    break;
                case "toggle":
                    if (checkPermissions(member, ["BAN_MEMBERS"]))
                        withTyping(channel, toggleWelcome, [message]);
                    break;
                case "embed":
                    if (checkPermissions(member, ["BAN_MEMBERS"]))
                        withTyping(channel, toggleWelcomeEmbed, [message]);
                    break;
            }
            break;
    }

}

async function welcome(member) {

    let { user, guild } = member;

    if (user.bot) return;
    let welcomeOn = serverSettings.get(guild.id, "welcomeOn");
    if (!welcomeOn) return;
    let welcomeChannelID = serverSettings.get(guild.id, "welcomeChan");
    let channel = bot.channels.cache.get(welcomeChannelID)
    if (!channel) return;

    let memberNumber = await getMemberNumber(member);
    let welcomeText = serverSettings.get(guild.id, "welcomeMsg");

    if (welcomeText.startsWith('embed')) {
        let welcomeText2 = await welcomeText.replace('embed', '');
        let welcomeText3 = welcomeText2.replace('$MENTION$', member.toString())
            .replace('$TAG$', member.user.tag)
            .replace('$USERNAME$', member.user.username)
            .replace('$MEMBER_NUMBER$', memberNumber.toLocaleString())
            .replace('$AVATAR$', member.user.displayAvatarURL());

        const embed = await embedBuilder(welcomeText3);

        let welcomeMsg = await channel.send({ embeds: [embed]});
        return welcomeMsg.url;
    } else {
        let welcomeText2 = welcomeText.replace('$MENTION$', member.toString())
            .replace('$TAG$', member.user.tag)
            .replace('$USERNAME$', member.user.username)
            .replace('$MEMBER_NUMBER$', memberNumber.toLocaleString());

        let welcomeMsg = await channel.send(welcomeText2);
        return welcomeMsg.url;
    }

}

async function logJoin(member) {

    let { user, guild } = member;

    let logsOn = serverSettings.get(guild.id, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guild.id, "msgLogsChan");
    let channel = bot.channels.cache.get(logChannelID);
    if (!channel) return;

    let usedInvite = await resolveUsedInvite(guild);
    var unix = Math.round(+new Date(user.createdAt) / 1000);
    var memberCount = guild.memberCount.toLocaleString();

    let embed = new Discord.MessageEmbed()
        .setColor("#6eb048")
        .setAuthor({name: `${member.user.tag} Joined`, icon_url: `https://i.ibb.co/SXvbgNb/user-Audit-Add.png`})
        .setThumbnail(user.displayAvatarURL())
        .setFooter(`User ID: ${user.id}`)
        .setTimestamp(user.joinedAt)

    const accountAge = moment().diff(moment(member.user.createdAt), 'days');
    if (accountAge < 30) {
        embed.addField("Account created", `⚠ New account!\n<t:${unix}:F>`, true);
        embed.addField("Member count", memberCount, true);
    } else {
        embed.addField("Account created", `<t:${unix}:F>`, true);
        embed.addField("Member count", memberCount, true);
    }

    if (usedInvite) {
        embed.addField("Invite", `[${usedInvite.code}](${usedInvite.url})${usedInvite.uses ? ` (${usedInvite.uses.toLocaleString()} uses)` : ``}${usedInvite.inviter ? `\nCreated by ${usedInvite.inviter.tag} (<@${usedInvite.inviter.id}>)` : ``}`, true);
    }

    channel.send({ embeds: [embed]});
}

const logLeave = async function (member) {

    let { user, guild } = member;

    let logsOn = serverSettings.get(guild.id, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guild.id, "msgLogsChan");
    let channel = bot.channels.cache.get(logChannelID);
    if (!channel) return;

    var memberCount = guild.memberCount.toLocaleString();
    var unix = Math.round(+new Date(member.joinedAt) / 1000);

    let embed = new Discord.MessageEmbed()
        .setColor("#b04848")
        .setThumbnail(user.displayAvatarURL())
        .setAuthor({name: `${member.user.tag} Left`, icon_url: `https://i.ibb.co/rK9vbX2/user-Audit-Delete.png`})
        .addField('User', `${member.user}\n${member.user.tag}`, true)
        .addField('Joined on', `<t:${unix}:F>`, true)
        .addField('Member count', memberCount, true)
        .setFooter(`User ID: ${member.id}`);

    channel.send({ embeds: [embed]});

}

const kickLogMsg = async function (member) {

    let { guild } = member;

    let logsOn = serverSettings.get(guild.id, "joinLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guild.id, "joinLogsChan");
    let channel = bot.channels.cache.get(logChannelID);
    if (!channel) return;

    const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: 'MEMBER_KICK',
    });

    const kickLog = fetchedLogs.entries.first();

    var { executor, target, reason } = kickLog;

    if (!reason) {
        reason = "No reason was provided.";
    }

    let embed = new Discord.MessageEmbed()
        .setColor("#b52a2a")
        .setAuthor({name: `${target.tag}\nKicked`, icon_url: `https://i.ibb.co/rK9vbX2/user-Audit-Delete.png`})
        .addField('User', `${target}\n${target.tag}`, true)
        .addField('Executor', `${executor}\n(${executor.tag})`, true)
        .addField('Reason', `${reason}`, true)
        .setFooter(`User ID: ${target.id}`);
    channel.send({ embeds: [embed]}).catch(console.error);

}

const banLogMsg = async function (guild, member) {

    let logsOn = serverSettings.get(guild.id, "joinLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guild.id, "joinLogsChan");
    let channel = bot.channels.cache.get(logChannelID);
    if (!channel) return;

    const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: 'MEMBER_BAN',
    });

    const banLog = fetchedLogs.entries.first();

    var { executor, reason, target } = banLog;

    if (!reason) {
        reason = "No reason was provided.";
    }

    let embed = new Discord.MessageEmbed()
        .setColor("#b52a2a")
        .setAuthor({name: `${target.tag}\nBanned`, icon_url: `https://i.ibb.co/rK9vbX2/user-Audit-Delete.png`})
        .addField('User', `${target}\n${target.tag}`, true)
        .addField('Executor', `${executor}\n(${executor.tag})`, true)
        .addField('Reason', `${reason}`, true)
        .setFooter(`User ID: ${target.id}`);
    channel.send({ embeds: [embed]}).catch(console.error);

}

const unbanLogMsg = async function (guild, member) {

    let logsOn = serverSettings.get(guild.id, "joinLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guild.id, "joinLogsChan");
    let channel = bot.channels.cache.get(logChannelID);
    if (!channel) return;

    const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: 'MEMBER_BAN_REMOVE',
    });

    const unbanLog = fetchedLogs.entries.first();

    const { executor, target } = unbanLog;

    let embed = new Discord.MessageEmbed()
        .setColor("#74b52a")
        .setAuthor({name: `${target.tag}\nUnbanned`, icon_url: `https://i.ibb.co/YtjYBgd/user-Audit-Update.png`})
        .addField('User', `${target}\n${target.tag}`, true)
        .addField('Executor', `${executor}\n(${executor.tag})`, true)
        .setFooter(`User ID: ${target.id}`);
    channel.send({ embeds: [embed]}).catch(console.error);

}

async function setJoinChannel(message, channelArg) {

    let { guild } = message;

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        const embed = errorEmbed("Invalid channel or channel ID.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("Channel doesn't exist in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let member = await resolveMember(guild, bot.user.id);
    if (!member) {
        const embed = errorEmbed("Something went wrong with the bot.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botPerms = channel.permissionsFor(member);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        const embed = errorEmbed("I cannot see this channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    if (!botPerms.has("SEND_MESSAGES", true)) {
        const embed = errorEmbed("I cannot send messages to this channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    await serverSettings.set(message.guild.id, "joinLogsChan", channelID);
    const embed = confirmEmbed(`Punishment log channel set to <#${channelID}>.`);
    message.channel.send({ embeds: [embed] });
}

async function toggleJoin(message) {

    let tog = await serverSettings.toggle(message.guild.id, "joinLogsOn");
    if (tog) {
        const embed = confirmEmbed(`Punishment log turned **on**.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Punishment log turned **off**.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function setWelcomeChannel(message, channelArg) {

    let { guild } = message;

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        const embed = errorEmbed("Invalid channel or channel ID.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("Channel doesn't exist in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let member = await resolveMember(guild, bot.user.id);
    if (!member) {
        const embed = errorEmbed("Error occured.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botPerms = channel.permissionsFor(member);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        const embed = errorEmbed("I cannot see this channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    if (!botPerms.has("SEND_MESSAGES", true)) {
        const embed = errorEmbed("I cannot send messages to this channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    await serverSettings.set(message.guild.id, "welcomeChan", channelID)
    const embed = confirmEmbed(`Welcome channel set to <#${channelID}>.`);
    message.channel.send({ embeds: [embed] });

}

async function setWelcomeMsg(message, args) {

    if (args.length < 4) {
        const embed = errorEmbed("Please provide a message.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let msg = trimArgs(args, 3, message.content);
    await serverSettings.set(message.guild.id, "welcomeMsg", msg);
    const embed = confirmEmbed(`Welcome message set.`);
    message.channel.send({ embeds: [embed] });

}

async function toggleWelcome(message) {

    let tog = await serverSettings.toggle(message.guild.id, "welcomeOn");
    if (tog) {
        const embed = confirmEmbed(`Welcome message turned **on**.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Welcome message turned **off**.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function toggleWelcomeEmbed(message) {

    let tog = await serverSettings.toggle(message.guild.id, "welcomeEmbedOn");
    if (tog) {
        const embed = confirmEmbed(`Welcome embed turned **on**.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Welcome embed turned **off**.`);
        message.channel.send({ embeds: [embed] });
    }

}
