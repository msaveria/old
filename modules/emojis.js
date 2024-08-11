const { MessageEmbed } = require("discord.js");
const { withTyping, errorEmbed, helpBuilder, embedPages, checkPermissions } = require("../functions/discord.js");
const { getImgColours } = require("../functions/colours.js");
const { bot } = require("../bot.js");
const serverSettings = require("../utils/server_settings.js");

const axios = require("axios");

exports.onCommand = async function (message, args) {

    let { channel, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('emoji' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "emojis":
        case "emoji":
        case "e":
            switch (args[1]) {
                case "list":
                    withTyping(channel, listEmojis, [message]);
                    break;
                case "steal":
                    withTyping(channel, stealEmojis, [message, args.slice(2)]);
                    break;
                case "search":
                    withTyping(channel, searchEmojis, [message, args[2]]);
                    break;
                case "help":
                    prefix = await serverSettings.get(message.guild.id, "prefix");
                    var embed = await helpBuilder("emoji", prefix);
                    channel.send(embed);
                    break;
                default:
                    withTyping(channel, largeEmoji, [message, args])
                    break;
            }
            break;
    }
}

async function listEmojis(message) {

    const { author, channel, guild } = message
    let emojis = [...bot.emojis.cache.values()]
    let p = guild.name[guild.name.length - 1].toLowerCase() == 's' ? "'" : "'s";

    if (emojis.length < 1) {
        const embed = errorEmbed(`There are no emojis added to this server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }
    emojis = emojis.filter(x => x['_roles'].length < 1);
    let staticEmojis = emojis.filter(x => !x.animated).sort((a, b) => a.name.localeCompare(b.name));
    let animatedEmojis = emojis.filter(x => x.animated).sort((a, b) => a.name.localeCompare(b.name));
    let emojiString = staticEmojis.concat(animatedEmojis).map(x => `<${x.animated ? 'a' : ''}:${x.name}:${x.id}> \`:${x.name}:\`` + (x.animated ? ` (animated)` : ``)).join('\n');

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
                name: `${guild.name + p} emojis`, icon_url: 'https://pics.freeicons.io/uploads/icons/png/2450266281585493764-512.png'
            },
            description: desc,
            color: 0xd3d4ed,
            footer: {
                text: `${emojis.length} total • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function searchEmojis(message, query) {

    const { author, channel, guild } = message

    if (!query) {
        const embed = errorEmbed(`Please provide a search query.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let emojis = [...bot.emojis.cache.values()].filter(x => x.name.toLowerCase().includes(query.toLowerCase()));

    if (emojis.length < 1) {
        const embed = errorEmbed(`No results were found searching for "${query}".`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let emojiString = emojis.sort((a, b) => a.name.localeCompare(b.name)).sort((a, b) => {
        let diff = query.length / b.name.length - query.length / a.name.length;
        if (diff == 0) return a.name.indexOf(query.toLowerCase()) - b.name.indexOf(query.toLowerCase());
        else return diff;
    }).map(x => `<${x.animated ? 'a' : ''}:${x.name}:${x.id}> \`:${x.name}:\`` + (x.animated ? ` (animated)` : ``)).join('\n');

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
                name: `"${query.slice(0, 30)}"`, icon_url: 'https://i.imgur.com/hIpmRU2.png'
            },
            description: desc,
            color: 0xffcc4d,
            footer: {
                text: `${emojis.length} results • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function largeEmoji(message, args) {

    if (args[0] == "emoji" && args.length < 2) {
        const embed = errorEmbed(`Please provide an emoji to enlarge.`);
        message.channel.send({ embeds: [embed] });
        return;
    } else if (message.mentions.length < 1 || args.length < 2) {
        return;
    }

    let emojiMatch = args[1].match(/<(a)?:([^<>:]+):(\d+)>/i);

    if (!emojiMatch) {
        if (args[0] == "emoji") {
            const embed = errorEmbed(`Invalid emoji provided!`);
            message.channel.send({ embeds: [embed] });
        }
        return;
    }

    let animated = emojiMatch[1];
    let emojiName = emojiMatch[2];
    let emojiID = emojiMatch[3];

    let imageUrl = `https://cdn.discordapp.com/emojis/${emojiID}.${animated ? 'gif' : 'png'}?size=128`;
    let response = await axios.head(imageUrl);
    let imageType = response.headers['content-type'].split('/')[1];
    let imageSize = Math.max(Math.round(response.headers['content-length'] / 10) / 100, 1 / 100);

    let embedColor = await getImgColours(imageUrl);
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    let embed = new MessageEmbed({
        image: { url: imageUrl },
        color: embedColorFinal
    });

    embed.setFooter(`Type: ${imageType.toUpperCase()} • Size: ${imageSize}KB`);

    if (animated) {
        embed.setDescription(`\`<a:${emojiName}:${emojiID}>\``);
    } else {
        embed.setDescription(`\`<:${emojiName}:${emojiID}>\``);
    }

    message.channel.send({ embeds: [embed] });

}

async function stealEmojis(message, args) {

    for (let emoji of args) {
        let emojiMatch = emoji.match(/<(a)?:([^<>:]+):(\d+)>/i);

        if (!emojiMatch) {
            const embed3 = errorEmbed(`You did not provide a valid emoji!`);
            message.channel.send({ embeds: [embed3] });
            return;
        }

        let animated = emojiMatch[1];
        let emojiName = emojiMatch[2];
        let emojiID = emojiMatch[3];

        let imageUrl = `https://cdn.discordapp.com/emojis/${emojiID}.${animated ? 'gif' : 'png'}?size=128`;
        let added = await message.guild.emojis.create(imageUrl, emojiName).catch(e => {
            const embed2 = errorEmbed(`Discord error: ${e}`);
            message.channel.send({ embeds: [embed2] });
            return;
        });

        let embedColor = await getImgColours(imageUrl);
        embedColor.sort((a, b) => {
            let bAltRgb = b.rgb().sort((a, b) => b - a);
            let aAltRgb = a.rgb().sort((a, b) => b - a);
            let bAltSat = bAltRgb[0] / bAltRgb[2];
            let aAltSat = aAltRgb[0] / aAltRgb[2];
            return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
        });
        let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

        let embed = new MessageEmbed({
            color: embedColorFinal
        });

        if (animated) {
            embed.setDescription(`<a:${added.name}:${added.id}> was added to the server.`);
        } else {
            embed.setDescription(`<:${added.name}:${added.id}> was added to the server.`);
        }

        message.channel.send({ embeds: [embed] });
    }

}
