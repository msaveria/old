const { checkPermissions, embedPages, withTyping, errorEmbed, confirmEmbed, helpBuilder } = require("../functions/discord.js");
const { bot } = require("../bot.js");

const TikTokScraper = require('tiktok-scraper');
const { MessageEmbed } = require("discord.js");

const database = require("../db_queries/tiktok_db.js");

exports.onCommand = async function (message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "tiktok":
            switch (args[1]) {
                case "noti":
                case "notif":
                case "notifs":
                case "notification":
                    switch (args[2]) {
                        case "add":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, tiktokNotifAdd, [message, args.slice(3)]);
                            break;
                        case "remove":
                        case "delete":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, tiktokNotifRemove, [message, args.slice(3)]);
                            break;
                        case "list":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, tiktokNotifList, [message]);
                            break;
                    }
                    break;
                case "help":
                default:
                    withTyping(channel, tiktokHelp, [message, '<@840436275190431744> ']);
                    break;
            }
            break;
    }

}

async function tiktokNotifAdd(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(.+)?\s+<?#?(\d{8,})>?\s*((<@&)?(.+?)(>)?)?$/i);
    if (!formatMatch) {
        const embed = errorEmbed(`Incorrect formatting.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let account = formatMatch[1];
    let discordChanID = formatMatch[2];
    let mentionRole = formatMatch[3];

    let channel = guild.channels.cache.get(discordChanID);
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

    let member;
    try {
        member = await guild.members.fetch(bot.user.id);
    } catch (e) {
        member = null;
    }
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

    let response;
    try {
        response = await TikTokScraper.user(account, {
            number: 10,
            sessionList: ['sid_tt=fa482e3a5c5e53089d9a999c6bd072c1;']
        });
    } catch (e) {
        const embed = errorEmbed(`\`${account}\` is an invalid TikTok account.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let recentPosts = response.collector;
    //console.log(recentPosts);

    let oldPosts = await database.getAccountPosts(account);
    let oldPostIDs = oldPosts.map(p => p.postID);

    let newPosts = recentPosts.filter(post => !oldPostIDs.includes(post.id)).sort((a, b) => a.createTime - b.createTime) /*sort posts in date order*/

    for (let post of newPosts) {

        let { id } = post;

        await database.addPost(account, id);

    }

    let added;
    try {
        added = await database.addTikTokChannel(guild.id, channel.id, account, role ? role.id : null)
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Unknown error occured.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (added) {
        const embed = confirmEmbed(`${role ? `${role}` : 'You'} will now be notified when **[@${account}](https://tiktok.com/@${account})** posts in ${channel}.`)
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`${channel} is already set up to be notified when **[@${account}](https://tiktok.com/@${account})** posts.`)
        message.channel.send({ embeds: [embed] });
    }

}

async function tiktokNotifRemove(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(.+)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        const embed = errorEmbed(`Incorrect formatting.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let account = formatMatch[1];
    let channelID = formatMatch[2];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed(`The channel provided does not exist in this server.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let deleted;
    try {
        deleted = await database.removeTikTokChannel(channel.id, account);
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Error occured.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (deleted) {
        const embed = confirmEmbed(`You will no longer be notified when **[@${account}](https://tiktok.com/@${account})** posts in ${channel}.`)
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`TikTok notifications for **[@${account}](https://tiktok.com/@${account})** are not set up in ${channel} on this server.`)
        message.channel.send({ embeds: [embed] });
    }

}

async function tiktokNotifList(message) {

    let { guild } = message;

    let notifs = await database.getGuildTikTokChannels(guild.id)
    if (notifs.length < 1) {
        const embed = errorEmbed(`There are no TikTok notifications set up in this server.`)
        message.channel.send({ embeds: [embed] });
        return;
    }
    notifString = notifs.sort((a, b) => a.account.localeCompare(b.account)).map(x => `<#${x.discordChanID}> - [@${x.account}](https://www.tiktok.com/@${x.account}) ${x.mentionRoleID ? ` <@&${x.mentionRoleID}>` : ``}`).join('\n');

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
                name: "TikTok notifications", icon_url: 'https://cdn.uconnectlabs.com/wp-content/uploads/sites/7/2021/03/TikTok-App-Icon.png'
            },
            description: desc,
            color: 0x69C9D0,
            footer: {
                text: `Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function tiktokHelp(message, prefix) {

    const embed = new MessageEmbed();
    embed.setAuthor(`TikTok`, 'https://cdn.uconnectlabs.com/wp-content/uploads/sites/7/2021/03/TikTok-App-Icon.png');
    embed.setColor(0x69C9D0);
    embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
    embed.addFields(
        { name: `${prefix}tiktok notification/noti add [tiktok account] [channel] (mention role)`, value: 'Adds a TikTok account to be notified for new posts in the provided channel. If a mention role is provided, that role will be mentioned for notifications.' },
        { name: `${prefix}tiktok notification/noti remove [tiktok account] [channel]`, value: 'Removes a TikTok account notification from the given channel.' },
        { name: `${prefix}tiktok notification/noti list`, value: 'Shows a list of all the TikTok notifications you have in the server.' }
    );

    message.channel.send({ embeds: [embed] });

}