const { checkPermissions, embedPages, resolveMember, withTyping, errorEmbed, confirmEmbed, denyEmbed } = require("../functions/discord.js");
const { bot } = require("../bot.js");
const { MessageEmbed } = require("discord.js");

const database = require("../db_queries/instagram_db.js");
const instagram = require('user-instagram');

exports.onCommand = async function (message, args) {
    let { channel, member } = message;

    switch (args[0]) {
        case "instagram":
        case "insta":
            switch (args[1]) {
                case "noti":
                case "notif":
                case "notifs":
                case "notification":
                    switch (args[2]) {
                        case "add":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, instaNotifAdd, [message, args.slice(3)]);
                            break;
                        case "remove":
                        case "delete":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, instaNotifRemove, [message, args.slice(3)]);
                            break;
                        case "list":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, instaNotifList, [message]);
                            break;
                    }
                    break;
                case "help":
                default:
                    withTyping(channel, instaHelp, [message, '<@840436275190431744> ']);
                    break;
            }
            break;
    }
}

// add insta notification
async function instaNotifAdd(message, args) {
    //get children only for "multiple_picture" type

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/www\.instagram\.com\/)?(.+?)(?:\/)?\s+<?#?(\d{8,})>?\s*((<@&)?(.+?)(>)?)?$/i);
    if (!formatMatch) {
        const embed = errorEmbed(`Incorrect formatting.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let instaUser = formatMatch[1];
    let channelID = formatMatch[2];
    let mentionRole = formatMatch[3];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed(`Please provide a valid channel.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (channel.type !== "GUILD_TEXT" && channel.type !== "GUILD_NEWS") {
        const embed = errorEmbed(`Please provide a valid channel.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let member = await resolveMember(guild, bot.user.id);
    if (!member) {
        const embed = errorEmbed(`Error occured.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botCanRead = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
    if (!botCanRead) {
        const embed = errorEmbed(`I cannot see this channel!`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let role;
    if (mentionRole) {
        if (formatMatch[4] && formatMatch[6]) {
            role = await guild.roles.fetch(formatMatch[5])
            if (!role) {
                const embed = errorEmbed(`A role with the ID \`${formatMatch[5]}\` does not exist in this server.`)
                message.channel.send({ embeds: [embed] });
                return;
            }
        } else {
            role = guild.roles.cache.find(role => role.name == formatMatch[5]);
            if (!role) {
                const embed = errorEmbed(`The role \`${formatMatch[5]}\` does not exist in this server.`)
                message.channel.send({ embeds: [embed] });
                return;
            }
        }
    }

    let instaNotifs = await database.getGuildInstaChannels(guild.id);
    let instaIDs = new Set(instaNotifs.map(x => x.instaID));

    if (message.author.id != '219991496793915394') {
        if (instaIDs.size >= 3) {
            const embed = denyEmbed(`No more than 3 Instagram accounts may be set up for notifications on a server.`)
            message.channel.send({ embeds: [embed] });
            return;
        }
    }

    await instagram.authenticate('mushroomlvr6660', 'mushroomlover123');
    let list = await instagram.getUserData(instaUser).catch(e => {
        const embed = denyEmbed(`I cannot find **@${instaUser}** on Instagram.`)
        message.channel.send({ embeds: [embed] });
    });
    let username = await list.getUsername();
    let medias = await list.getMedias();
    for (let media of medias) {
        var id = await media.getShortcode();
        await database.addPost(username, id);
    }

    let added;
    try {
        added = await database.addInstaChannel(guild.id, channel.id, username, role ? role.id : null);
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Unknown error occured.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (added) {
        const embed = confirmEmbed(`${role ? `${role}` : 'You'} will now be notified when **[@${username}](https://instagram.com/${username})** posts on Instagram in ${channel}.`)
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`${channel} is already set up to be notified when **[@${username}](https://instagram.com/${username})** posts on Instagram.`)
        message.channel.send({ embeds: [embed] });
    }

}

// remove instagram notification
async function instaNotifRemove(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/www\.instagram\.com\/)?(.+?)(?:\/)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        const embed = errorEmbed(`Incorrect formatting.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let username = formatMatch[1];
    let channelID = formatMatch[2];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed(`Please provide a valid channel.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let deleted;
    try {
        deleted = await database.removeInstaChannel(channel.id, username);
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Unknown error occured.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (deleted) {
        const embed = confirmEmbed(`You will no longer be notified when **[@${username}](https://instagram.com/${username})** posts on Instagram in ${channel}.`)
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Instagram notifications for **[@${username}](https://instagram.com/${username})** are not set up in ${channel} on this server.`)
        message.channel.send({ embeds: [embed] });
    }
}

// list insta notifications
async function instaNotifList(message) {

    let { guild } = message;

    let notifs = await database.getGuildInstaChannels(guild.id);
    if (notifs.length < 1) {
        const embed = errorEmbed(`There are no Instagram notifications set up in this server.`)
        message.channel.send({ embeds: [embed] });
        return;
    }
    notifString = notifs.sort((a, b) => a.username.localeCompare(b.username)).map(x => `<#${x.channelID}> - [@${x.username.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.instagram.com/${x.username}/)${x.mentionRoleID ? ` <@&${x.mentionRoleID}>` : ``}`).join('\n');

    let descriptions = [];
    while (notifString.length > 2048 || notifString.split('\n').length > 25) {
        let currString = notifString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        notifString = notifString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(notifString);

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: "Instagram notifications", icon_url: 'https://i.imgur.com/NNzsisb.png'
            },
            description: desc,
            color: 0xE1306C,
            footer: {
                text: `Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function instaHelp(message, prefix) {

    const embed = new MessageEmbed();
    embed.setAuthor(`Instagram`, `https://i.imgur.com/NNzsisb.png`);
    embed.setColor(0xE1306C);
    embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional\nAliases: **insta**`);
    embed.addFields(
        { name: `${prefix}instagram notification/noti add [instagram account] [channel] (mention role)`, value: 'Adds a Instagram account to be notified for new posts in the provided channel. If a mention role is provided, that role will be mentioned for notifications.' },
        { name: `${prefix}instagram notification/noti remove [instagram account] [channel]`, value: 'Removes a Instagram account notification from the given channel.' },
        { name: `${prefix}instagram notification/noti list`, value: 'Shows a list of all the Instagram notifications you have in the server.' }
    );

    message.channel.send({ embeds: [embed] });

}