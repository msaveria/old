const { checkPermissions, embedPages, withTyping, confirmEmbed, denyEmbed, errorEmbed, helpBuilder } = require("../functions/discord.js");
const { bot } = require("../bot.js");

const axios = require("axios");

const config = require("../config.json");
const database = require("../db_queries/twitter_db.js");
const { MessageEmbed } = require("discord.js");

const twitter = axios.create({
    baseURL: 'https://api.twitter.com',
    timeout: 10000,
    headers: { 'authorization': 'Bearer ' + config.twt_bearer }
})

exports.onCommand = async function (message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "twitter":
        case "twt":
            switch (args[1]) {
                case "noti":
                case "notif":
                case "notifs":
                case "notification":
                    switch (args[2]) {
                        case "add":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, twitterNotifAdd, [message, args.slice(3)]);
                            break;
                        case "remove":
                        case "delete":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, twitterNotifRemove, [message, args.slice(3)]);
                            break;
                        case "list":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, twitterNotifList, [message]);
                            break;
                    }
                    break;
                case "toggle":
                    switch (args[2]) {
                        case "retweets":
                        case "rts":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, retweetToggle, [message, args.slice(3)]);
                            break;
                    }
                    break;
                case "help":
                default:
                    prefix = await serverSettings.get(message.guild.id, '<@840436275190431744> ');
                    withTyping(channel, twitterHelp, message);
                    break;
            }
            break;
    }

}

async function twitterNotifAdd(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/twitter\.com\/)?@?(.+?)(?:\/media\/?)?\s+<?#?(\d{8,})>?\s*((<@&)?(.+?)(>)?)?$/i);
    if (!formatMatch) {
        const embed = errorEmbed("Incorrect format.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let screenName = formatMatch[1];
    let channelID = formatMatch[2];
    let mentionRole = formatMatch[3];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("This channel does not exist on the server.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    if (channel.type !== "GUILD_TEXT" && channel.type !== "GUILD_NEWS") {
        const embed = errorEmbed("Please provide a text channel.");
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
        const embed = errorEmbed("Error occured.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botCanRead = channel.permissionsFor(member).has("VIEW_CHANNEL", true);
    if (!botCanRead) {
        const embed = errorEmbed("I cannot see this channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let role;
    if (mentionRole) {
        if (formatMatch[4] && formatMatch[6]) {
            role = await guild.roles.fetch(formatMatch[5])
            if (!role) {
                const embed = errorEmbed(`A role with the ID \`${formatMatch[5]}\` does not exist in this server.`);
                message.channel.send({ embeds: [embed] });
                return;
            }
        } else {
            role = guild.roles.cache.find(role => role.name == formatMatch[5]);
            if (!role) {
                const embed = errorEmbed(`The role \`${formatMatch[5]}\` does not exist in this server.`);
                message.channel.send({ embeds: [embed] });
                return;
            }
        }
    }

    let response;
    try {
        response = await twitter.get('/1.1/users/show.json', { params: { screen_name: screenName } })
    } catch (e) {
        switch (e.response.status) {
            case 403:
            case 404:
                const embed = errorEmbed(`**${screenName}** is an invalid Twitter handle.`);
                message.channel.send({ embeds: [embed] });
                break;
            case 429:
                const embed1 = errorEmbed(`API rate limit exceeded.`);
                message.channel.send(embed1);
                break;
            default:
                const embed2 = errorEmbed(`Unknown error occured.`);
                message.channel.send(embed2);
                break;
        }
        return;
    }
    let { id_str, screen_name } = response.data;

    let twitterNotifs = await database.getGuildTwitterChannels(guild.id);
    let twitterIDs = new Set(twitterNotifs.map(x => x.twitterID));
    if (twitterIDs.size >= 3) {
        const embed = errorEmbed(`No more than 3 Twitter accounts can be set up per server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    try {
        response = await twitter.get('/1.1/statuses/user_timeline.json', { params: { user_id: id_str, count: 20, trim_user: 1, exclude_replies: 1 } })
    } catch (e) {
        console.error(e);
        const embed = errorEmbed(`Unknown error occured.`);
        message.channel.send({ embeds: [embed] });
        return;
    }
    let recentTweets = response.data;

    let now = Date.now();
    for (let tweet of recentTweets) {
        let createdAt = new Date(tweet.created_at).getTime();
        if (createdAt > (now - 1000 * 60)) continue; // don't add tweets in last minute; prevent conflicts with task

        await database.addTweet(id_str, tweet.id_str);
    }

    let added;
    try {
        added = await database.addTwitterChannel(guild.id, channel.id, id_str, screen_name, role ? role.id : null)
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Unknown error occured.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (added) {
        const embed = confirmEmbed(`${role ? `${role}` : 'You'} will now be notified when **[@${screen_name}](https://twitter.com/${screen_name})** posts a new tweet in ${channel}.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`${channel} is already set up to be notified when **[@${screen_name}](https://twitter.com/${screen_name})** posts a new tweet.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function twitterNotifRemove(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/twitter\.com\/)?@?(.+?)(?:\/media\/?)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        const embed = errorEmbed("Incorrect format.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let screenName = formatMatch[1];
    let channelID = formatMatch[2];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("The channel provided does not exist in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let response;
    try {
        response = await twitter.get('/1.1/users/show.json', { params: { screen_name: screenName } })
    } catch (e) {
        switch (e.response.status) {
            case 403:
            case 404:
                const embed = errorEmbed(`**${screenName}** is an invalid Twitter handle.`);
                message.channel.send({ embeds: [embed] });
                break;
            case 429:
                const embed1 = errorEmbed(`API rate limit exceeded.`);
                message.channel.send(embed1);
                break;
            default:
                const embed2 = errorEmbed(`Unknown error occured.`);
                message.channel.send(embed2);
                break;
        }
        return;
    }
    let { id_str, screen_name } = response.data;

    let deleted;
    try {
        deleted = await database.removeTwitterChannel(channel.id, id_str);
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Unknown error occured.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (deleted) {
        const embed = confirmEmbed(`You will no longer be notified when **[@${screen_name}](https://twitter.com/${screen_name})** posts a new tweet in ${channel}.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`There are no Twitter notifications for **[@${screen_name}](https://twitter.com/${screen_name})** in ${channel}.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function twitterNotifList(message) {

    let { guild } = message;

    let notifs = await database.getGuildTwitterChannels(guild.id)
    if (notifs.length < 1) {
        const embed = errorEmbed(`There are no Twitter notifications set up in this server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }
    notifString = notifs.sort((a, b) => a.screenName.localeCompare(b.screenName)).map(x => `<#${x.channelID}> - [@${x.screenName}](https://twitter.com/${x.screenName}/)${x.retweets ? ` + <:retweet:799161453696909323>` : ``}${x.mentionRoleID ? ` <@&${x.mentionRoleID}>` : ``}`).join('\n');

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
                name: "Twitter notifications", icon_url: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png'
            },
            description: desc,
            color: 0x1da1f2,
            footer: {
                text: `Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function retweetToggle(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(?:https:\/\/twitter\.com\/)?@?(.+?)(?:\/media\/?)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        const embed = errorEmbed("Incorrect format.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let screenName = formatMatch[1];
    let channelID = formatMatch[2];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("The channel provided does not exist in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let response;
    try {
        response = await twitter.get('/1.1/users/show.json', { params: { screen_name: screenName } })
    } catch (e) {
        switch (e.response.status) {
            case 403:
            case 404:
                const embed = errorEmbed(`**${screenName}** is an invalid Twitter handle.`);
                message.channel.send({ embeds: [embed] });
                break;
            case 429:
                const embed1 = errorEmbed(`API rate limit exceeded.`);
                message.channel.send(embed1);
                break;
            default:
                const embed2 = errorEmbed(`Unknown error occured.`);
                message.channel.send(embed2);
                break;
        }
        return;
    }
    let { id_str, screen_name } = response.data;

    let twitterChannel;
    try {
        twitterChannel = await database.getTwitterChannel(channel.id, id_str);
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Unknown error occured.`);
        message.channel.send({ embeds: [embed] });
        return;
    }
    if (!twitterChannel) {
        const embed = denyEmbed(`Twitter notifications for **[@${screen_name}](https://twitter.com/${screen_name})** are not set up in ${channel} on this server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let toggle;
    try {
        toggle = await database.toggleRetweets(channel.id, id_str)
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Unknown error occured.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (toggle) {
        const embed = confirmEmbed(`You will now be notified for retweets from **[@${screen_name}](https://twitter.com/${screen_name})** in ${channel}.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`You will no longer be notified for retweets from **[@${screen_name}](https://twitter.com/${screen_name})** in ${channel}.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function twitterHelp(message, prefix) {

    const embed = new MessageEmbed();
    embed.setAuthor(`Twitter`, 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png');
    embed.setColor(0x69C9D0);
    embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional\nAliases: **twt**`);
    embed.addFields(
        { name: `${prefix}twitter notification/noti add [twitter account] [channel] (mention role)`, value: 'Adds a Twitter account to be notified for new tweets/retweets from in the provided channel. If a mention role is provided, that role will be mentioned for notifications.' },
        { name: `${prefix}twitter notification/noti remove [twitter account] [channel]`, value: 'Removes a Twitter account notification from the given channel.' },
        { name: `${prefix}twitter notification/noti list`, value: 'Shows a list of all the Twitter notifications you have in the server.' },
        { name: `${prefix}twitter toggle retweets/rts [twitter account] [channel]`, value: 'Toggles notifications from retweets. (on by default)' }
    );

    message.channel.send({ embeds: [embed] });

}