const { Discord, MessageEmbed } = require("discord.js");
const { resolveMember, withTyping, confirmEmbed, denyEmbed, errorEmbed, helpBuilder, checkPermissions } = require("../functions/discord.js");

const database = require("../db_queries/notifications_db.js");
const { trimArgs } = require("../functions/functions.js");
const serverSettings = require("../utils/server_settings.js");

const HashSet = require("hashset");

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

exports.onMessage = async function (message) {

    notify(message);

}

exports.onCommand = async function (message, args) {

    let { channel, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('notifications' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "notifications":
        case "notification":
        case "notify":
        case "notif":
        case "noti":
            switch (args[1]) {
                case "global":
                    switch (args[2]) {
                        case "add":
                            withTyping(channel, addNotification, [message, args, true]);
                            break;
                        case "remove":
                        case "delete":
                            withTyping(channel, removeNotification, [message, args, true]);
                            break;
                        case "clear":
                        case "purge":
                            withTyping(channel, clearNotifications, [message, true]);
                            break;
                        case "list":
                            withTyping(channel, listNotifications, [message, true]);
                            break;
                    }
                    break;
                case "add":
                    withTyping(channel, addNotification, [message, args]);
                    break;
                case "remove":
                case "delete":
                    withTyping(channel, removeNotification, [message, args]);
                    break;
                case "clear":
                case "purge":
                    withTyping(channel, clearNotifications, [message]);
                    break;
                case "donotdisturb":
                case "dnd":
                case "toggle":
                    withTyping(channel, toggleDnD, [message]);
                    break;
                case "list":
                    withTyping(channel, listNotifications, [message]);
                    break;
                case "blacklist":
                case "ignore":
                    switch (args[2]) {
                        case "server":
                            withTyping(channel, ignoreServer, [message]);
                            break;
                        case "channel":
                            withTyping(channel, ignoreChannel, [message, args.slice(3)]);
                            break;
                    }
                    break;
                case "help":
                default:
                    prefix = await serverSettings.get(message.guild.id, "prefix");
                    var embed = await helpBuilder("emoji", prefix);
                    channel.send(embed);
                    break;
            }
            break;
    }
}

async function notify(message) {

    let { guild, channel, author, content, member } = message;
    if (!content) return;

    let locals = await database.getAllLocalNotifs(guild.id);
    let globals = await database.getAllGlobalNotifs();
    let notifs = locals.concat(globals).filter(n => n.userID != author.id);
    if (notifs.length < 1) return;
    let matches = new Map();

    let ignored_channels = await database.getIgnoredChannels();
    let ignored_servers = await database.getIgnoredServers();
    //let dnd_users = await database.getAllDnD();

    let embed = new MessageEmbed({
        author: { name: author.tag, icon_url: author.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        title: `\`Notification\``,
        color: member.displayColor || 0x303135,
        description: content.length < 1025 ? content : content.slice(0, 1021).trim() + '...',
        fields: [
            { name: "Message link", value: `[View message](${message.url})`, inline: true }
        ],
        footer: {
            text: guild.name,
            icon_url: guild.iconURL({ format: 'png', dynamic: true }),
        },
        timestamp: message.createdAt
    });

    for (let notif of notifs) {
        if (notif.guildID && notif.guildID != guild.id) {
            continue;
        }

        let ignored_server = ignored_servers.find(x => x.userID == notif.userID && x.guildID == guild.id);
        if (ignored_server) continue;
        let ignored_channel = ignored_channels.find(x => x.userID == notif.userID && x.channelID == channel.id);
        if (ignored_channel) continue;
        //let doNotDisturb = dnd_users.find(userID => userID == notif.userID);
        //if (doNotDisturb) continue;

        let regexp;
        switch (notif.type) {
            case "NORMAL":
                let plural = ['s', 'x', 'ch', 'sh'].includes(notif.keyexp[notif.keyexp.length - 1]) ? 'es' : 's';
                regexp = new RegExp(`(^|\\W)${notif.keyexp}(?:[\`']s|${plural})?($|\\W)`, 'i');
                break;
            case "STRICT":
                regexp = new RegExp(`(^|\\s)${notif.keyexp}($|\\s)`);
                break;
            case "LENIENT":
                regexp = new RegExp(notif.keyexp, 'i');
                break;
            case "ANARCHY":
                regexp = notif.keyexp;
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
                regexp = new RegExp(anarch_regex, 'i');
                break;
        }

        let match = content.match(regexp);
        if (!match) continue;

        let notif_set = matches.get(notif.userID);
        if (notif_set) {
            notif_set.add(notif.keyword.toLowerCase())
            matches.set(notif.userID, notif_set);
        } else {
            matches.set(notif.userID, new HashSet(notif.keyword.toLowerCase()));
        }
    }

    for (let userID of matches.keys()) {

        let member = await resolveMember(guild, userID);
        if (!member) continue;

        let can_read = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
        if (!can_read) continue;

        let set = matches.get(userID);
        let keywords = set.toArray().sort().join(', ');
        embed.addField(`Keyword(s)`, keywords, true);

        try {
            await member.send(embed);
        } catch (e) {
            if (e.code == 50007) { // Cannot send messages to this user
                database.clearGlobalNotifs(userID);
                database.clearAllLocalNotifs(userID);
                console.log(`Cleared all notifcations for ${member.user.tag}: Cannot send messages to this user`);
            }
        }

    }

}

async function addNotification(message, args, global) {

    if (args.length < (global ? 4 : 3)) {
        const embed = errorEmbed("Please provide a keyword to add.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let type;
    let typeArg = global ? args[3] : args[2];
    let keyword;
    if (["STRICT", "NORMAL", "LENIENT", "ANARCHY"].includes(typeArg.toUpperCase()) && args.length > (global ? 4 : 3)) {
        type = typeArg.toUpperCase();
        keyword = trimArgs(args, global ? 4 : 3, message.content);
    } else {
        type = "NORMAL";
        keyword = trimArgs(args, global ? 3 : 2, message.content);
    }

    if (keyword.length > 128) {
        const embed = errorEmbed("Keywords must not exceed 128 character in length.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let keyrgx = keyword.replace(/([\\\|\[\]\(\)\{\}\.\^\$\?\*\+])/g, "\\$&");
    keyword = keyword.toLowerCase();

    let { guild, author } = message;
    let addedNotif = global ? await database.addGlobalNotif(author.id, keyword, keyrgx, type)
        : await database.addLocalNotif(guild.id, author.id, keyword, keyrgx, type);
    if (!addedNotif) {
        const embed = errorEmbed("Notification with this keyword already added.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    try {
        const embedA = confirmEmbed(`You will now be notified when \`${keyword}\` is mentioned ${global ? `globally` : `in \`${guild.name}\``} with \`${type}\` search mode.`);
        await author.send(embedA);
        const embed = confirmEmbed("Notification added.");
        message.channel.send({ embeds: [embed] });
    } catch (e) {
        if (e.code == 50007) {
            const embed = errorEmbed("I cannot send DMs to you. Please check your privacy settings and try again.");
            message.channel.send({ embeds: [embed] });
            global ? database.removeGlobalNotif(author.id, keyword) : database.removeLocalNotif(guild.id, author.id, keyword);
        }
    }

}

async function removeNotification(message, args, global) {

    if (args.length < (global ? 4 : 3)) {
        const embed = errorEmbed("Please provide a keyword to remove.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let keyphrase = trimArgs(args, global ? 3 : 2, message.content);

    let { guild, author } = message;
    let removed = global ? await database.removeGlobalNotif(author.id, keyphrase)
        : await database.removeLocalNotif(guild.id, author.id, keyphrase);
    if (!removed) {
        const embed = errorEmbed(`Notification \`${keyphrase}\` does not exist.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    try {
        const embedA = confirmEmbed(`You will no longer be notified when \`${keyphrase}\` is mentioned${!global ? ` in \`${guild.name}\`.` : `.`}`);
        await author.send(embedA);
        const embed = confirmEmbed("Notification removed.");
        message.channel.send({ embeds: [embed] });
    } catch (e) {
        if (e.code == 50007) {
            const embed = errorEmbed("I cannot send DMs to you. Please check your privacy settings and try again.");
            message.channel.send({ embeds: [embed] });
        }
    }

}

async function clearNotifications(message, global) {

    let { author, guild } = message;
    let cleared;
    if (global) {
        cleared = await database.clearGlobalNotifs(author.id);
        if (cleared) {
            const embed = confirmEmbed(`All global notifications cleared.`);
            message.channel.send({ embeds: [embed] });
        } else {
            const embed = denyEmbed(`No notifications to clear.`);
            message.channel.send({ embeds: [embed] });
        }
    } else {
        cleared = await database.clearLocalNotifs(guild.id, author.id);
        if (cleared) {
            const embed = confirmEmbed(`All **${guild.name}** notifications cleared.`);
            message.channel.send({ embeds: [embed] });
        } else {
            const embed = denyEmbed(`No notifications in **${guild.name}** to clear.`);
            message.channel.send({ embeds: [embed] });
        }
    }

}

async function listNotifications(message, global) {

    let { author, guild } = message;
    let notifs = global ? await database.getGlobalNotifs(author.id) :
        await database.getLocalNotifs(guild.id, author.id);

    if (notifs.length < 1) {
        const embed = errorEmbed(`You don't have any notifications${!global ? ` in ${message.guild.name}` : ``}.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let notifString = notifs.map(notif => `\`${notif.type}\` - ${notif.keyword.toLowerCase()}`).join('\n');

    let pages = [];
    while (notifString.length > 2048) {
        let currString = notifString.slice(0, 2048);

        let lastIndex = 0;
        while (true) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        notifString = notifString.slice(lastIndex);

        pages.push(currString);
    }
    pages.push(notifString);

    try {
        for (let page of pages) {
            const embed = new MessageEmbed()
            if (global) {
                embed.setAuthor({ name: `Global notifications list`, icon_url: `https://www.internationalcenter.org/wp-content/uploads/2015/09/Emoji_u1f30f.svg_.png` })
            } else {
                embed.setAuthor({ name: `${message.guild.name} notifications list`, icon_url: message.guild.iconURL({ format: 'png', dynamic: false }) })
            }
            embed.setDescription(page)
            embed.setColor(0xba326d);
            await author.send(embed);
        }
        const embed = confirmEmbed(`A list of your notifications has been sent to your DMs.`);
        message.channel.send({ embeds: [embed] });
    } catch (e) {
        if (e.code == 50007) {
            const embed = errorEmbed("I cannot send DMs to you. Please check your privacy settings and try again.");
            message.channel.send({ embeds: [embed] });
        }
    }

}

async function ignoreChannel(message, args) {

    let { author, guild, channel } = message;

    if (args.length >= 1) {
        let channel_id = args[0].match(/<?#?!?(\d+)>?/);
        if (!channel_id) {
            const embed = errorEmbed("Invalid channel or channel ID.");
            message.channel.send({ embeds: [embed] });
            return;
        }
        channel_id = channel_id[1];
        channel = guild.channels.cache.get(channel_id);
    }

    if (!channel) {
        const embed = errorEmbed("Channel doesn't exist in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    if (channel.type != "text") {
        const embed = errorEmbed("Channel must be a text channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let ignored = await database.toggleChannel(author.id, channel.id);
    if (ignored) {
        const embed = confirmEmbed(`You will no longer be sent notifications for messages in ${channel}.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`You will now be sent notifications for messages in ${channel}.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function ignoreServer(message) {

    let { author, guild } = message;
    let ignored = await database.toggleServer(author.id, guild.id);
    if (ignored) {
        const embed = confirmEmbed(`You will no longer be sent notifications for messages in this server.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`You will now be sent notifications for messages in this server.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function toggleDnD(message) {

    let dnd = await database.toggleDnD(message.author.id);
    if (dnd) {
        const embed = confirmEmbed(`Do not disturb turned **on**.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Do not disturb turned **off**.`);
        message.channel.send({ embeds: [embed] });
    }

}