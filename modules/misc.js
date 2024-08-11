const Discord = require("discord.js");
const { withTyping, resolveMember, embedBuilder, confirmEmbed, errorEmbed, denyEmbed, helpBuilder, checkPermissions, embedPages, searchMembers } = require("../functions/discord.js");
const { parseChannelID, trimArgs } = require("../functions/functions.js");
const { bot } = require("../bot.js");
const { getImgColours } = require("../functions/colours.js");

const axios = require("axios");
const serverSettings = require("../utils/server_settings.js");
const { time } = require("console");
const levels_db = require("../db_queries/levels_db.js");
const { eco } = require("../bot.js");

exports.onCommand = async function (message, args) {

    let { channel, member, guild } = message;

    switch (args[0]) {
        case "help":
        case "h":
            withTyping(channel, help, [message, args.slice(1)]);
            break;

        case "ping":
            withTyping(channel, ping, [message]);
            break;

        case "embed":
            if (checkPermissions(member, ["MANAGE_MESSAGES"]))
                withTyping(channel, embed, [message, args.slice(1)]);
            else {
                let embed = denyEmbed("You do not have permission to manage messages.");
                channel.send(embed);
            }
            break;

        case "computershow":
        case "cs":
            if (member.id == '219991496793915394')
            withTyping(channel, computershow, [message, args.slice(1)]);
            else {
                let embed = denyEmbed("Only <@219991496793915394> can do this command because it can break the bot if used incorrectly lol.");
                channel.send(embed);
            }
            break;

    }

}

function getValues(obj, key) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getValues(obj[i], key));
        } else if (i == key) {
            objects.push(obj[i]);
        }
    }
    return objects;
};

async function ping(message) {
    let embedColor = await getImgColours(message.guild.iconURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;
    let embed = new Discord.MessageEmbed()
        .setColor(embedColorFinal)
        .setDescription(`Checking ping...`);
    message.channel.send({ embeds: [embed] }).then(msg => {
        let ping = msg.createdTimestamp - message.createdTimestamp;
        let embed2 = new Discord.MessageEmbed()
        embed2.setAuthor({name: `Ping`, icon_url: message.guild.iconURL({ format: 'png', dynamic: true })});
        embed2.setDescription(`Bot ping: \`${ping} ms\`\nAPI latency: \`${Math.round(bot.ws.ping)} ms\``);
        embed2.setColor(embedColorFinal);
        message.channel.send({ embeds: [embed2] })
    }).catch((error) => {
        console.log(error);
    });
}

const signColor = {
    Aries: "#22B5D2",
    Taurus: "#217ED1",
    Gemini: "#4821D1",
    Cancer: "#981DCA",
    Leo: "#DE27A8",
    Virgo: "#EF2C31",
    Libra: "#F35908",
    Scorpio: "#F6AC20",
    Sagittarius: "#F4BA00",
    Capricorn: "#F2D815",
    Aquarius: "#BDDF24",
    Pisces: "#2AD828"
};

const signPic = {
    Aries: "https://www.astrology-zodiac-signs.com/images/Aries-w.png",
    Taurus: "https://www.astrology-zodiac-signs.com/images/Taurus-w.png",
    Gemini: "https://www.astrology-zodiac-signs.com/images/Gemini-w.png",
    Cancer: "https://www.astrology-zodiac-signs.com/images/Cancer-w.png",
    Leo: "https://www.astrology-zodiac-signs.com/images/Leo-w.png",
    Virgo: "https://www.astrology-zodiac-signs.com/images/Virgo-w.png",
    Libra: "https://www.astrology-zodiac-signs.com/images/Libra-w.png",
    Scorpio: "https://www.astrology-zodiac-signs.com/images/Scorpio-w.png",
    Sagittarius: "https://www.astrology-zodiac-signs.com/images/Sagittarius-w.png",
    Capricorn: "https://www.astrology-zodiac-signs.com/images/Capricorn-w.png",
    Aquarius: "https://www.astrology-zodiac-signs.com/images/Aquarius-w.png",
    Pisces: "https://www.astrology-zodiac-signs.com/images/Pisces-w.png"
};

async function horoscopeSet(message, args) {
    if (args.length === 1) {
        const embed = errorEmbed("Please provide a valid sun sign.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    let userID = message.author.id;
    let sign1 = args[1].toLowerCase();
    let sunsign = sign1.charAt(0).toUpperCase() + sign1.substr(1);

    if (!(sunsign in signColor)) {
        const embed = errorEmbed("Please provide a valid sun sign.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    try {
        await horoscope.getHoroscopeData(userID);
        await horoscope.setSign(userID, sunsign);
        const embed = confirmEmbed(`${message.author}, your sun sign has been set to **${sunsign}**.`);
        message.channel.send({ embeds: [embed] });
        return;
    } catch (error) {
        console.log(error);
    }

};

async function horoList(message) {
    let embed = new Discord.MessageEmbed()
        .setTitle("List of horoscopes")
        .setColor('#fcfcfc')
        .addFields([
            ":aries: Aries", "March 21 - April 19", true,
            ":taurus: Taurus", "April 20 - May 20", true,
            ":gemini: Gemini", "May 21 - June 20", true,
            ":cancer: Cancer", "June 21 - July 22", true,
            ":leo: Leo", "July 23 - August 22", true,
            ":virgo: Virgo", "August 23 - September 22", true,
            ":libra: Libra", "September 23 - October 22", true,
            ":scorpius: Scorpio", "October 23 - November 21", true,
            ":sagittarius: Sagittarius", "November 22 - December 21", true,
            ":capricorn: Capricorn", "December 22 - January 19", true,
            ":aquarius: Aquarius", "January 20 - February 18", true,
            ":pisces: Pisces", "February 19 - March 20", true
        ])
    message.channel.send({ embeds: [embed] }).catch(console.error);
    return;
};

async function horoInfo(message, time) {
    let userID = message.author.id;
    try {
        let data = await horoscope.getHoroscopeData(userID);
        if (data.sunsign !== null) {
            let sign1 = data.sunsign;
            let sign = sign1.charAt(0).toUpperCase() + sign1.substr(1);
            let url = `https://aztro.sameerkumar.website/?sign=${sign}&day=${time}`;
            let response = await axios.post(url);
            await response;
            makeEmbed(message, response, sign);
        } else {
            const embed = errorEmbed("Please save your sun sign.");
            message.channel.send({ embeds: [embed] });
            return;
        }
    } catch (error) {
        console.log(error);
    }
};

async function makeEmbed(message, response, sign) {
    const date = {
        today: `${response.data.current_date}`,
        tomorrow: `${response.data.current_date}`,
        yesterday: `${response.data.current_date}`
    };

    let p = message.author.username[message.author.username.length - 1].toLowerCase() == 's' ? "'" : "'s";

    let embed = new Discord.MessageEmbed()
        .setAuthor({name: `${message.author.username + p} horoscope`, icon_url: message.author.displayAvatarURL()})
        .setThumbnail(signPic[sign])
        .setColor(signColor[sign])
        .addField("Mood", response.data.mood, true)
        .addField("Compatibility", response.data.compatibility, true)
        .addField("Lucky number", response.data.lucky_number, true)
        .addField("Horoscope", response.data.description, false)
        .setFooter(`${sign} • ${date[time]} • Lucky time: ${response.data.lucky_time}`);
    message.channel.send({ embeds: [embed] });
    return;
};

async function embed(message, args) {
    let { guild } = message;

    if (args[0] == 'variables') {
        let msgString = `\`$MENTION$\` - mentions the user.\n\`$TAG$\` - the user's tag (user#1234).\n\`$USERNAME$\` - the user's username (user).\n\`$MEMBER_NUMBER$\` - the member's join position.\n\`$AVATAR$\` - the user's avatar.`;
        let descriptions = [];
        while (msgString.length > 2048) {
            let currString = msgString.slice(0, 2048);

            let lastIndex = 0;
            for (let i = 0; i < 25; i++) {
                let index = currString.indexOf('\n', lastIndex) + 1;
                if (index) lastIndex = index; else break;
            }
            currString = currString.slice(0, lastIndex);
            msgString = msgString.slice(lastIndex);

            descriptions.push(currString);
        }
        descriptions.push(msgString);

        let embedColor = await getImgColours(message.guild.iconURL({ format: 'png', dynamic: false }));
        embedColor.sort((a, b) => {
            let bAltRgb = b.rgb().sort((a, b) => b - a);
            let aAltRgb = a.rgb().sort((a, b) => b - a);
            let bAltSat = bAltRgb[0] / bAltRgb[2];
            let aAltSat = aAltRgb[0] / aAltRgb[2];
            return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
        });
        let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

        let pages = descriptions.map((desc, i) => {
            return new MessageEmbed({
                author: {
                    name: `Embed variables`, icon_url: message.guild.iconURL({ format: 'png', dynamic: true })
                },
                description: desc,
                color: embedColorFinal,
                footer: {
                    text: `Page ${i + 1} of ${descriptions.length}`
                }
            })
        })
        return embedPages(message, pages);
    }

    let channelID;
    if (!args[0]) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(args[0]);
    }

    if (!channelID) {
        const embed = errorEmbed(`Invalid channel or channel ID.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed(`Channel doesn't exist in this server.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let member = await resolveMember(guild, bot.user.id);
    if (!member) {
        const embed = errorEmbed(`Error occured.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let files = message.attachments.array();
    if (args.length < 2 && files.length < 1) {
        const embed = errorEmbed(`Please provide text or an uploaded file for an embed.`);
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

    let text = trimArgs(args, 1, message.content);
    //let fileUrl = files[0] ? files[0].url : '';
    //console.log(fileUrl);
    //if (fileUrl) {
    //    fileEmbed(fileUrl, message, channel);
    //}

    const embed = await embedBuilder(text);
    if (embed) {
        await channel.send({ embeds: [embed] });
        const embed1 = confirmEmbed(`Embed sent to ${channel}.`);
        message.channel.send({ embeds: [embed1] });
    } else {
        const embed2 = errorEmbed("Please check your embed input.");
        message.channel.send({ embeds: [embed2] });
    }

};

async function help(message, args) {
    let prefix = await serverSettings.get(message.guild.id, "prefix");
    let embedColor = await getImgColours(bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;
    if (!args[0]) {
        let embed = new Discord.MessageEmbed()
            .setAuthor({name: `Help`, icon_url: bot.user.displayAvatarURL({ format: 'png', dynamic: true })})
            .setColor(embedColorFinal)
            .setDescription(`Type **${prefix}help [module]** to see the commands for that module.`)
            .addField(`Modules`, `\`\`\`Commands, Emoji, Games, Information, Last.fm, Levels, Management, Media, Misc, Moderation, Notifications, Reminders, Reps, Starboard\`\`\``);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = await helpBuilder(args[0].toLowerCase(), prefix);
        message.channel.send({ embeds: [embed] });
    }

};

async function computershow(message, args) {
    const { chromium } = require('playwright');
    let { guild } = message;

    let members = await guild.members.fetch();

    const embed1 = confirmEmbed(`Starting transfer process of [https://www.computershow.info/${args[0]}/leaderboard/](https://www.computershow.info/${args[0]}/leaderboard/) for ${args[1]} pages. This may take a while.`);
    message.channel.send({ embeds: [embed1] });

    const browser = await chromium.launch({
        headless: false
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`https://www.computershow.info/${args[0]}/leaderboard/`);
    await page.click('i');

    for (let i = 0; i < args[1]; i++) {
        await page.click('button:has-text("More")');
    }

    for (let i = 0; i < args[1] * 25; i++) {
        let name = await page.textContent(`tr >> nth=${i + 1} >> b`);
        let xps = await page.textContent(`tr >> nth=${i + 1} >> td >> nth=2`);
        let moneys = await page.textContent(`tr >> nth=${i + 1} >> td >> nth=3`);

        let xp = parseInt((xps.replace(',', '')));
        let money = parseInt((moneys.replace(',', '')));

        let user = await searchMembers(members, name);
        if (user) {
            console.log(user.id, xp, money);
            eco.balance.add(money, user.id, guild.id, `CS transfer.`);
            levels_db.updateGuildXp(user.id, guild.id, xp);
        }
    }

    const embed = confirmEmbed(`Finished transferring.`);
    message.channel.send({ embeds: [embed] });

}