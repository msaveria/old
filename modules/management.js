const { MessageEmbed } = require("discord.js");
const {
    checkPermissions,
    resolveMember,
    resolveMessage,
    withTyping,
    confirmEmbed,
    denyEmbed,
    errorEmbed } = require("../functions/discord.js");
const { bot } = require("../bot.js");

const serverSettings = require("../utils/server_settings.js");
const { parseChannelID, trimArgs } = require("../functions/functions.js");
const { getImgColours } = require("../functions/colours.js");

const messageUrlRegex = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/i;


exports.onCommand = async function (message, args) {

    let { channel, member, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('management' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "message":
        case "msg":
            switch (args[1]) {
                case "send":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, sendMessage, [message, args]);
                    break;
                case "edit":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, editMessage, [message, args]);
                    break;
                case "get":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, getMessage, [message, args[2]]);
                    break;
            }
            break;
        case "prefix":
            switch (args[1]) {
                case "set":
                    if (checkPermissions(member, ["MANAGE_GUILD"]))
                        withTyping(channel, setPrefix, [message, args[2]]);
                    break;
            }
            break;
        case "settings":
            if (checkPermissions(member, ["MANAGE_GUILD", "MANAGE_ROLES", "MANAGE_CHANNELS"]))
                withTyping(channel, displaySetttings, [message, args[2]]);
            break;
        case "economy":
        case "eco":
            switch (args[1]) {
                case "currency":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, setCurrency, [message, args[2]]);
                    break;
                case "shop":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, shopSettings, [message, args.slice(2)]);
                    break;
                case "settings":
                    if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                        withTyping(channel, ecoSettings, [message, args.slice(2)]);
                    break;
            }
            break;
    }
}

async function sendMessage(message, args) {

    let { guild } = message;

    if (args.length < 3) {
        const embed = errorEmbed("No channel provided to send a message to.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channelID = parseChannelID(args[2]);
    if (!channelID) {
        const embed = errorEmbed("No channel provided to send a message to.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("Invalid channel or the channel is not in the server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botMember = await resolveMember(guild, bot.user.id);
    if (!botMember) {
        const embed = errorEmbed("Error occured.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botPerms = channel.permissionsFor(botMember);
    if (!botPerms.has("VIEW_CHANNEL", true)) {
        const embed = errorEmbed("I cannot see that channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (!botPerms.has("SEND_MESSAGES", true)) {
        const embed = errorEmbed("I cannot send messages to that channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let attachments = [...message.attachments.values()];
    let files = [];
    for (i = 0; i < attachments.length; i++) {
        let attachment = attachments[i];
        let file = { attachment: attachment.url, name: attachment.name };
        files.push(file);
    }

    if (args.length < 3 && files.length < 1) {
        const embed = errorEmbed("No message provided to be sent.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let content = trimArgs(args, 3, message.content);
    await channel.send({ content, files });
    const embed = confirmEmbed(`Message sent to <#${channelID}>.`);
    message.channel.send({ embeds: [embed] });

}

async function editMessage(message, args) {

    let { guild } = message;

    if (args.length < 3) {
        const embed = errorEmbed("No message URL provided.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let messageUrlMatch = args[2].match(messageUrlRegex);
    if (!messageUrlMatch) {
        const embed = errorEmbed("Invalid message URL provided.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let [guildID, channelID, messageID] = messageUrlMatch.slice(1);
    if (guildID != guild.id) {
        const embed = errorEmbed("Provided message URL must link to a message in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("Provided message URL links to an invalid channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botMember = await resolveMember(guild, bot.user.id);
    if (!botMember) {
        const embed = errorEmbed("Error occured.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botPerms = channel.permissionsFor(botMember);
    if (!botPerms.has("VIEW_CHANNEL", true,)) {
        const embed = errorEmbed("I cannot see that channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let msg = await resolveMessage(channel, messageID);
    if (!msg) {
        const embed = errorEmbed("Provided message URL links to an invalid message.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (msg.author.id != bot.user.id) {
        const embed = errorEmbed("Provided message URL links to message sent by another user.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (args.length < 4) {
        const embed = errorEmbed("No content provided to edit with.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let content = trimArgs(args, 3, message.content);
    await msg.edit(content);
    const embed = confirmEmbed(`Message edited in <#${channel.id}>.`);
    message.channel.send({ embeds: [embed] });

}

async function getMessage(message, messageUrl) {

    let { guild } = message;

    if (!messageUrl) {
        const embed = errorEmbed("No message URL provided.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let messageUrlMatch = messageUrl.match(messageUrlRegex);
    if (!messageUrlMatch) {
        const embed = errorEmbed("Invalid message URL provided.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let [guildID, channelID, messageID] = messageUrlMatch.slice(1);
    if (guildID != guild.id) {
        const embed = errorEmbed("Provided message URL must link to a message in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("Provided message URL links to an invalid channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botMember = await resolveMember(guild, bot.user.id);
    if (!botMember) {
        const embed = errorEmbed("Error occured.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botPerms = channel.permissionsFor(botMember);
    if (!botPerms.has("VIEW_CHANNEL", true,)) {
        const embed = errorEmbed("I cannot see that channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let msg = await resolveMessage(channel, messageID);
    if (!msg) {
        const embed = errorEmbed("Provided message URL links to an invalid message.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (msg.content.length < 1) {
        const embed = errorEmbed("Message has no content.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    message.channel.send({ content: `${msg.content.includes('```') ? '` ```‌‌` -> `\'\'\'`\n':''}\`\`\`${msg.content.replace(/```/g, '\'\'\'').slice(0, 1990)}\`\`\`` });


}

async function setPrefix(message, prefix) {

    let { guild } = message;

    if (!prefix) {
        const embed = errorEmbed("Please provide a prefix.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    if (prefix.length > 1) {
        const embed = denyEmbed("Prefix must be a single character.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    if (prefix.match(/^\w+$/)) {
        const embed = denyEmbed("Prefix must not be a letter.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    serverSettings.set(guild.id, "prefix", prefix);
    const embed = confirmEmbed(`Prefix set to \`${prefix}\``);
    message.channel.send({ embeds: [embed] });

}

async function displaySetttings(message) {

    let { guild } = message;
    let settings = serverSettings.getServer(guild.id);
    if (!settings) {
        await serverSettings.initGuild(guild.id);
        settings = serverSettings.getServer(guild.id);
    }

    settings = Object.entries(settings);
    let fieldArrays = [];
    let settingsProcessed = 0;
    let guildString = "";
    let logString = "";
    let miscString = "";

    while (settingsProcessed < settings.length) {
        let fields = [];
        for (let i = 0; i < 18 && settingsProcessed < settings.length; i++) {
            let [setting, value] = settings[settingsProcessed];
            if (setting !== "guildID") {
                let { name, type, category } = serverSettings.template[setting] || [];
                let newValue;
                switch (type) {
                    case "toggle":
                        newValue = value ? '<:success:917540029264445480>' : '<:failure:917540029537062912>';
                        if (category == "Guild") {
                            guildString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Misc") {
                            miscString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Logging") {
                            logString += `**${name}**: ${newValue}\n`;
                        }
                        break;
                    case "channel":
                        let channel = guild.channels.cache.has(value);
                        newValue = channel ? `<#${value}>` : value || "None";
                        if (category == "Guild") {
                            guildString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Misc") {
                            miscString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Logging") {
                            logString += `**${name}**: ${newValue}\n`;
                        }
                        break;
                    case "role":
                        let role = guild.roles.cache.has(value);
                        newValue = role ? `<@&${value}>` : value || "None";
                        if (category == "Guild") {
                            guildString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Misc") {
                            miscString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Logging") {
                            logString += `**${name}**: ${newValue}\n`;
                        }
                        break;
                    case "array":
                        newValue = value ? `${value.join(`, `)}` : value || "None";
                        if (category == "Guild") {
                            guildString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Misc") {
                            miscString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Logging") {
                            logString += `**${name}**: ${newValue}\n`;
                        }
                        break;
                    default:
                        newValue = value || "None";
                        if (category == "Guild") {
                            guildString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Misc") {
                            miscString += `**${name}**: ${newValue}\n`;
                        } else if (category == "Logging") {
                            logString += `**${name}**: ${newValue}\n`;
                        }
                        break;
                }
            }
            settingsProcessed++;
        }
        fields.push({ name: `Guild Settings`, value: guildString, inline: true });
        fields.push({ name: `Logging Settings`, value: logString, inline: true });
        fields.push({ name: `Misc Settings`, value: miscString, inline: true });
        fieldArrays.push(fields);
    }


    let embedColor = await getImgColours(guild.iconURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    let embed = new MessageEmbed({
        author: {
            name: `${guild.name}`, icon_url: guild.iconURL({ format: 'png', dynamic: true })
        },
        color: embedColorFinal,
        fields: fieldArrays
    });

    message.channel.send({ embeds: [embed] });

}