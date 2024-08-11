const { checkPermissions, embedPages, withTyping, errorEmbed, confirmEmbed, helpBuilder } = require("../functions/discord.js");
const { bot } = require("../bot.js");

const axios = require("axios");
const { MessageEmbed } = require("discord.js");

const database = require("../db_queries/reddit_db.js");

exports.onCommand = async function (message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "reddit":
            switch (args[1]) {
                case "noti":
                case "notif":
                case "notifs":
                case "notification":
                    switch (args[2]) {
                        case "add":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, redditNotifAdd, [message, args.slice(3)]);
                            break;
                        case "remove":
                        case "delete":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, redditNotifRemove, [message, args.slice(3)]);
                            break;
                        case "list":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, redditNotifList, [message]);
                            break;
                    }
                    break;
                case "help":
                default:
                    withTyping(channel, redditHelp, [message, '<@840436275190431744> ']);
                    break;
            }
            break;
    }

}

async function redditNotifAdd(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(.+)?\s+<?#?(\d{8,})>?\s*((<@&)?(.+?)(>)?)?$/i);
    if (!formatMatch) {
        const embed = errorEmbed(`Incorrect formatting.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let subreddit = formatMatch[1];
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
        response = await axios.get(`https://reddit.com/r/${subreddit}/new.json?limit=10`);
    } catch (e) {
        switch (e.response.status) {
            case 404:
            case 403:
                const embed = errorEmbed(`**[r/${subreddit}](https://reddit.com/r/${subreddit})** is an invalid subreddit.`)
                message.channel.send({ embeds: [embed] });
                break;
            case 429:
                const embed1 = errorEmbed(`API limit exceeded.`)
                message.channel.send(embed1);
                break;
            default:
                const embed2 = errorEmbed(`Unknown error occured.`)
                message.channel.send(embed2);
                break;
        }
        return;
    }

    let data = response.data.data.children;

    let recentPosts = await data.map(edge => edge.data);

    let oldPosts = await database.getSubPosts(subreddit);
    let oldPostIDs = oldPosts.map(p => p.postID);

    let newPosts = recentPosts.filter(post => !oldPostIDs.includes(post.id)).sort((a, b) => a.created - b.created) /*sort posts in date order*/

    for (let post of newPosts) {

        let { id } = post;

        await database.addPost(subreddit, id);

    }

    let added;
    try {
        added = await database.addRedditChannel(guild.id, channel.id, subreddit, role ? role.id : null)
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Unknown error occured.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (added) {
        const embed = confirmEmbed(`${role ? `${role}` : 'You'} will now be notified when **[r/${subreddit}](https://reddit.com/r/${subreddit})** posts in ${channel}.`)
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`${channel} is already set up to be notified when **[r/${subreddit}](https://reddit.com/r/${subreddit})** posts.`)
        message.channel.send({ embeds: [embed] });
    }

}

async function redditNotifRemove(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(.+)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        const embed = errorEmbed(`Incorrect formatting.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let subreddit = formatMatch[1];
    let channelID = formatMatch[2];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed(`The channel provided does not exist in this server.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let deleted;
    try {
        deleted = await database.removeRedditChannel(channel.id, subreddit);
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Error occured.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (deleted) {
        const embed = confirmEmbed(`You will no longer be notified when **[r/${subreddit}](https://reddit.com/r/${subreddit})** posts in ${channel}.`)
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Reddit notifications for **[r/${subreddit}](https://reddit.com/r/${subreddit})** are not set up in ${channel} on this server.`)
        message.channel.send({ embeds: [embed] });
    }

}

async function redditNotifList(message) {

    let { guild } = message;

    let notifs = await database.getGuildRedditChannels(guild.id)
    if (notifs.length < 1) {
        const embed = errorEmbed(`There are no Reddit notifications set up in this server.`)
        message.channel.send({ embeds: [embed] });
        return;
    }
    notifString = notifs.sort((a, b) => a.subreddit.localeCompare(b.subreddit)).map(x => `<#${x.discordChanID}> - [r/${x.subreddit}](https://www.reddit.com/r/${x.subreddit}) ${x.mentionRoleID ? ` <@&${x.mentionRoleID}>` : ``}`).join('\n');

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
                name: "Reddit notifications", icon_url: 'https://www.sharethis.com/wp-content/uploads/2017/05/Reddit.png'
            },
            description: desc,
            color: 0xff4500,
            footer: {
                text: `Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function redditHelp(message, prefix) {

    const embed = new MessageEmbed();
    embed.setAuthor(`Reddit`, 'https://www.sharethis.com/wp-content/uploads/2017/05/Reddit.png');
    embed.setColor(0xFF5700);
    embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
    embed.addFields(
        { name: `${prefix}reddit notification/noti add [subreddit] [channel] (mention role)`, value: 'Adds a Reddit account to be notified for new posts in the provided channel. If a mention role is provided, that role will be mentioned for notifications.' },
        { name: `${prefix}reddit notification/noti remove [subreddit] [channel]`, value: 'Removes a Reddit account notification from the given channel.' },
        { name: `${prefix}reddit notification/noti list`, value: 'Shows a list of all the Reddit notifications you have in the server.' }
    );

    message.channel.send({ embeds: [embed] });

}