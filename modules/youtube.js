const { checkPermissions, embedPages, withTyping, errorEmbed, confirmEmbed, helpBuilder } = require("../functions/discord.js");
const { bot } = require("../bot.js");
const axios = require("axios");
const { trimArgs } = require("../functions/functions.js");
const { MessageEmbed } = require("discord.js");

bot.request = new (require("rss-parser"))();

const database = require("../db_queries/youtube_db.js");

exports.onCommand = async function (message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "youtube":
        case "yt":
            switch (args[1]) {
                case "noti":
                case "notif":
                case "notifs":
                case "notification":
                    switch (args[2]) {
                        case "add":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, youtubeNotifAdd, [message, args.slice(3)]);
                            break;
                        case "remove":
                        case "delete":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, youtubeNotifRemove, [message, args.slice(3)]);
                            break;
                        case "list":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, youtubeNotifList, [message]);
                            break;
                    }
                    break;
                case "search":
                    withTyping(channel, ytPages, [message, args]);
                    break;
                case "help":
                default:
                    withTyping(channel, youtubeHelp, [message, '<@840436275190431744> ']);
                    break;
            }
            break;
    }

}

async function youtubeNotifAdd(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(.+)?\s+<?#?(\d{8,})>?\s*((<@&)?(.+?)(>)?)?$/i);
    if (!formatMatch) {
        const embed = errorEmbed(`Incorrect formatting.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let ytchannel = formatMatch[1];
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

    try {
        response = await bot.request.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${ytchannel}`);
    } catch (e) {
        console.log(e);
        return;
    }

    let recentPosts = response.items;

    let oldPosts = await database.getYTPosts(ytchannel);
    let oldPostIDs = oldPosts.map(p => p.postID);

    let newPosts = recentPosts.filter(post => !oldPostIDs.includes(post.id)).sort((a, b) => a.isoDate - b.isoDate) /*sort posts in date order*/

    for (let post of newPosts) {

        let { id } = post;

        await database.addPost(ytchannel, id);

    }

    let added;
    try {
        added = await database.addYoutubeChannel(response.title, guild.id, channel.id, ytchannel, role ? role.id : null)
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Unknown error occured.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (added) {
        const embed = confirmEmbed(`${role ? `${role}` : 'You'} will now be notified when **[${response.title}](https://www.youtube.com/channel/${ytchannel})** posts in ${channel}.`)
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`${channel} is already set up to be notified when **[${response.title}](https://www.youtube.com/channel/${ytchannel})** posts.`)
        message.channel.send({ embeds: [embed] });
    }

}

async function youtubeNotifRemove(message, args) {

    let { guild } = message;

    let formatMatch = args.join(' ').trim().match(/^(.+)?\s+<?#?(\d{8,})>?/i);
    if (!formatMatch) {
        const embed = errorEmbed(`Incorrect formatting.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channelName = formatMatch[1];
    let channelID = formatMatch[2];

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed(`The channel provided does not exist in this server.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let deleted;
    try {
        deleted = await database.removeYoutubeChannel(channel.id, channelName);
    } catch (e) {
        console.error(Error(e));
        const embed = errorEmbed(`Error occured.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (deleted) {
        const embed = confirmEmbed(`You will no longer be notified when **${channelName}** posts in ${channel}.`)
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Youtube notifications for **${channelName}** are not set up in ${channel} on this server.`)
        message.channel.send({ embeds: [embed] });
    }

}

async function youtubeNotifList(message) {

    let { guild } = message;

    let notifs = await database.getGuildYoutubeChannels(guild.id)
    if (notifs.length < 1) {
        const embed = errorEmbed(`There are no Youtube notifications set up in this server.`)
        message.channel.send({ embeds: [embed] });
        return;
    }
    notifString = notifs.sort((a, b) => a.ytchannel.localeCompare(b.ytchannel)).map(x => `<#${x.discordChanID}> - [${x.channelName}](https://www.youtube.com/channel/${x.ytchannel}) ${x.mentionRoleID ? ` <@&${x.mentionRoleID}>` : ``}`).join('\n');

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
                name: "Youtube notifications", icon_url: 'https://www.vectorico.com/download/social_media/youtube-icon.png'
            },
            description: desc,
            color: 0xFF0000,
            footer: {
                text: `Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function ytVidQuery(query) {

    if (query) {
        let response = await youtube.get('/results', { params: { search_query: query, pbj: 1, sp: 'EgIQAQ==' } });
        let result;
        try {
            result = response.data[1].response.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents[0];
        } catch (e) {
            console.error(e);
            return null;
        }

        return result.videoRenderer ? result.videoRenderer.videoId || null : null;
    }

}

async function ytPages(message, args) {

    const youtube = axios.create({
        baseURL: "https://youtube.com",
        timeout: 5000,
        headers: { "X-YouTube-bot-Name": "1", "X-YouTube-bot-Version": "2.20200424.06.00" }
    });

    if (args.length < 2) {
        const embed = errorEmbed("Please provide a video to search for.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let query = trimArgs(args, 1, message.content);
    let response = await youtube.get('/results', { params: { search_query: query, pbj: 1, sp: 'EgIQAQ==' } });
    let results;
    try {
        results = response.data[1].response.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
    } catch (e) {
        console.error(e);
        return null;
    }

    results = results.filter(result => result.videoRenderer && result.videoRenderer.videoId).map((result, i) => `\`${i + 1}.\` https://youtu.be/${result.videoRenderer.videoId}`);

    if (results.length < 1) {
        const embed = errorEmbed("No results found.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    embedPages(message, results.slice(0, 20), true);

}

exports.ytVidQuery = ytVidQuery;

async function youtubeHelp(message, prefix) {

    const embed = new MessageEmbed();
    embed.setAuthor(`Youtube`, 'https://www.vectorico.com/download/social_media/youtube-icon.png');
    embed.setColor(0xFF0000);
    embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional\nAliases: **yt**\n*You can find the ID of a youtube channel by going [here](https://commentpicker.com/youtube-channel-id.php).*`);
    embed.addFields(
        { name: `${prefix}youtube notification/noti add [youtube channel ID] [channel] (mention role)`, value: 'Adds a Youtube account to be notified for new posts in the provided channel. If a mention role is provided, that role will be mentioned for notifications.' },
        { name: `${prefix}youtube notification/noti remove [youtube channel name] [channel]`, value: 'Removes a Youtube account notification from the given channel.' },
        { name: `${prefix}youtube notification/noti list`, value: 'Shows a list of all the Youtube notifications you have in the server.' },
        { name: `${prefix}youtube search [query]`, value: 'Searches youtube for videos matching your search terms.' }
    );

    message.channel.send({ embeds: [embed] });

}