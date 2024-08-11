const { Discord, MessageEmbed } = require("discord.js");
const {
    getMemberNumber,
    searchMembers,
    resolveMember,
    resolveUser,
    withTyping,
    errorEmbed,
    checkPermissions } = require("../functions/discord.js");
const { bot, eco } = require("../bot.js");

const axios = require("axios");

const ecodb = require("../db_queries/economy_db.js");
const repsdb = require("../db_queries/reps_db.js");
const levelsdb = require("../db_queries/levels_db.js");
const levels = require("../functions/levels.js");

const { parseUserID, trimArgs } = require("../functions/functions.js");
const { Image } = require("../functions/images.js");
const { getImgColours } = require("../functions/colours.js");
const moment = require("moment");
const permissions = require('../utils/permissions.json');

exports.onCommand = async function (message, args) {

    let { channel, member, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('information' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "userinfo":
        case "uinfo":
        case "memberinfo":
        case "user":
        case "member":
            withTyping(channel, userInfo, [message, args]);
            break;
        case "avatar":
        case "ava":
            withTyping(channel, userAvatar, [message, args]);
            break;
        case "serverinfo":
        case "sinfo":
        case "guildinfo":
        case "server":
        case "guild":
            withTyping(channel, guildInfo, [message, args[1]]);
            break;
        case "serverboosters":
        case "boosters":
        case "boosts":
            withTyping(channel, serverBoosters, [message]);
            break;
        case "roleinfo":
        case "rinfo":
        case "role":
            withTyping(channel, roleInfo, [message, args]);
            break;
    }
}

async function userInfo(message, args) {

    let { author, guild } = message;
    let target = args[1];
    let member;
    let user;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content)
        let members = await guild.members.fetch();

        member = await searchMembers(members, target)
        if (!member) {
            const embed = errorEmbed("Invalid user or user ID.")
            message.channel.send({ embeds: [embed] });
            return;
        } else {
            userID = member.id;
        }
    }

    member = member || await resolveMember(guild, userID);
    if (member) {
        user = member.user;
    } else {
        user = await resolveUser(userID);
    }

    if (member) {
        let embed = await memberEmbed(author, member);
        message.channel.send({ embeds: [embed] });
    } else if (user) {
        let embed = await userEmbed(guild, user);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = errorEmbed("Invalid user.")
        message.channel.send({ embeds: [embed] });
    }

}

async function memberEmbed(author, member) {

    let { user, guild } = member;
    let memNo = await getMemberNumber(member, guild);
    member = await guild.members.fetch(user.id);

    let status = {
        "online": "https://i.ibb.co/K58d1Qm/8312-online.png",
        "offline": "https://i.ibb.co/j5vb2cY/2311-offline.png",
        "idle": "https://i.ibb.co/PzYfdGr/9231-idle.png",
        "dnd": "https://i.ibb.co/8DmzfPK/7013-do-not-disturb.png"
    }

    const activitiesA = [];
    let customStatus;
    if (member.presence !== null) {
        if ([...member.presence.activities.values()]) {
            for (const activity of [...member.presence.activities.values()]) {
                switch (activity.type) {
                    case 'PLAYING':
                        if (member.user.bot) activitiesA.push(`🤖 Playing **${activity.name}**`);
                        activitiesA.push(`🎮 Playing **${activity.name}**`);
                        break;
                    case 'LISTENING':
                        if (member.user.bot) activitiesA.push(`🤖 Listening to **${activity.name}**`);
                        else activitiesA.push(`🎵 Listening to **[${activity.details}](https://www.last.fm/music/${encodeURIComponent(activity.state)}/_/${encodeURIComponent(activity.details)})** by **[${activity.state}](https://www.last.fm/music/${encodeURIComponent(activity.state)})**`);
                        break;
                    case 'WATCHING':
                        if (member.user.bot) activitiesA.push(`🤖 Watching **${activity.name}**`);
                        activitiesA.push(`📺 Watching **${activity.name}**`);
                        break;
                    case 'STREAMING':
                        if (member.user.bot) activitiesA.push(`🤖 Streaming **${activity.name}**`);
                        activitiesA.push(`📡 Streaming **${activity.name}**`);
                        break;
                    case 'CUSTOM':
                        customStatus = activity.state;
                        customStatusEmoji = activity.emoji;
                        break;
                    default:
                        activitiesA.push('');
                        break;
                }
            }
        }
    }

    let response;
    try {
        response = await axios.head(user.displayAvatarURL());
    } catch (e) {
        response = null;
    }

    if (response) {
        let timestamp = new Date(response.headers['last-modified']);
        if (timestamp) {
            avaupload = `\n**Avatar uploaded:** <t:${Math.round(+new Date(timestamp.toUTCString()) / 1000)}:d>`;
        } else {
            avaupload = '';
        }
    }

    let embedColor = await getImgColours(user.displayAvatarURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    if (memNo) {
        //embed.addField(`Member #`, `${memNo} of ${guild.memberCount.toLocaleString()}`, true);
        membernumber = `\n**Member #:** ${memNo} of ${guild.memberCount.toLocaleString()}`
    } else {
        membernumber = '';
    }

    if (member.premiumSince) {
        //embed.addField("", `\n(${moment.utc(member.premiumSince.toUTCString()).fromNow()})`, true);
        boost = `<:nitro:927337776884613200> **Boosting since:** <t:${Math.round(+new Date(member.premiumSinceTimestamp.toUTCString()) / 1000)}:d>\n`;
    } else {
        boost = '';
    }

    const balance = eco.balance.fetch(user.id, guild.id);
    let userReps = await repsdb.getRepProfile(user.id);
    let userGuildXp = await levelsdb.getGuildXp(user.id, guild.id);
    let userGuildRank = levels.guildRank(userGuildXp);

    let ecoSet = await ecodb.getEcoSettings(guild.id);
    if (ecoSet.length < 1) {
        await ecodb.initGuild(guild.id);
        ecoSet = await ecodb.getEcoSettings(guild.id);
    }
    ecoSet = ecoSet[0];

    let embed = new MessageEmbed({
        author: { name: user.tag },
        url: user.displayAvatarURL(),
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        color: member.displayColor || embedColorFinal,
        fields: [
            { name: "👤 Account info", value: `**Created:** <t:${Math.round(+new Date(user.createdAt.toUTCString()) / 1000)}:d>\n**ID:** \`${user.id}\`${avaupload}`, inline: true },
            { name: "🌐 Server info", value: `${boost}**Joined:** <t:${Math.round(+new Date(member.joinedAt.toUTCString()) / 1000)}:d>${membernumber}\n**Balance:** ${balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${ecoSet.currencyEmoji}\n**Level:** ${userGuildRank.lvl.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || 1}\n**Rep:** ${userReps ? userReps.rep.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 0}`, inline: true }
        ]
    });

    if (activitiesA.length !== null) embed.setDescription(activitiesA.join('\n'));
    if (customStatus) {
        embed.setFooter(customStatus, customStatusEmoji ? customStatusEmoji.url : ``);
    }

    if ([...member.roles.cache.values()].length > 1) {
        let allRoles = [...member.roles.cache.values()].sort((a, b) => b.comparePositionTo(a)).slice(0, -1);
        var roles = [];

        for (let role of allRoles) {
            roles.push(role);
        }

        var roles = removeElement(roles, member.guild.roles.everyone);

        if (roles.length > 0) {
            roles = roles.join(', ');
            if (roles.length > 1024) {
                roles = roles.substring(0, 1024);
                roles = roles.substring(0, roles.lastIndexOf('>') + 1);
                roles += '.'.repeat(roles.length > 1021 ? 1024 - roles.length : 3);
            }
            embed.addField("Roles", roles, false);
        }
    }

    return embed;

}

async function roleInfo(message, args) {
    if (args.length < 1) {
        const embed = errorEmbed("Please provide a role name.")
        message.channel.send({ embeds: [embed] });
        return;
    }

    let roleName = trimArgs(args, 1, message.content);
    let role = message.guild.roles.cache.find(role => role.name.toUpperCase() == roleName.toUpperCase());

    if (!role) {
        const embed = errorEmbed("This role does not exist on the server.")
        message.channel.send({ embeds: [embed] });
        return;
    }

    // Get role permissions
    const rolePermissions = role.permissions.toArray();
    const finalPermissions = [];
    for (const permission in permissions) {
        if (rolePermissions.includes(permission)) finalPermissions.push(`${permissions[permission]}`);
        //else finalPermissions.push(`- ${permissions[permission]}`);
    }

    // Reverse role position
    const position = `${message.guild.roles.cache.size - role.position}/${message.guild.roles.cache.size}`;
    var decimal = role.color;
    var hex = '#' + decimal.toString(16).toUpperCase();
    if (hex === '#0') {
        var decimal = '7289DA';
        var hex = '#7289DA';
    } else {
        var decimal = role.color;
        var hex = '#' + decimal.toString(16).toUpperCase();
    }

    const roleimg = 'http://via.placeholder.com/30x30/' + decimal.toString(16) + '/' + decimal.toString(16);

    const embed = new MessageEmbed()
        .setAuthor({ name: `@${role.name}` })
        .setDescription(`**ID:** \`${role.id}\`\n**Position:** ${position}\n**Member count:** ${role.members.size.toLocaleString()}\n**Created on:** ${moment(role.createdAt).format('LL')}\n**Mentionable:** ${role.mentionable.toString() === 'true' ? "Yes" : "No"}`)
        .setFooter(`${hex}`, roleimg)
        .setColor(hex);
    message.channel.send({ embeds: [embed] });
}

async function userEmbed(guild, user) {

    let status = {
        "online": "https://i.ibb.co/K58d1Qm/8312-online.png",
        "offline": "https://i.ibb.co/j5vb2cY/2311-offline.png",
        "idle": "https://i.ibb.co/PzYfdGr/9231-idle.png",
        "dnd": "https://i.ibb.co/8DmzfPK/7013-do-not-disturb.png"
    }

    let response;
    try {
        response = await axios.head(user.displayAvatarURL());
    } catch (e) {
        response = null;
    }

    if (response) {
        let timestamp = new Date(response.headers['last-modified']);
        if (timestamp) {
            avaupload = `\n**Avatar uploaded:** <t:${Math.round(+new Date(timestamp.toUTCString()) / 1000)}:d>`;
        } else {
            avaupload = '';
        }
    }

    let embedColor = await getImgColours(user.displayAvatarURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    let embed = new MessageEmbed({
        author: { name: user.tag },
        url: user.displayAvatarURL(),
        thumbnail: { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }) },
        color: embedColorFinal,
        fields: [
            { name: "👤 Account info", value: `**Created:** <t:${Math.round(+new Date(user.createdAt.toUTCString()) / 1000)}:d>\n**ID:** \`${user.id}\`${avaupload}`, inline: true }
        ],
        footer: { text: `User not in ${guild.name}`, icon_url: guild.iconURL({ format: 'png', dynamic: true }) },
    });

    return embed;

}

async function userAvatar(message, args) {

    let { author, guild } = message;
    let target = args[1];
    let member;
    let user;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content)
        let members = await guild.members.fetch();

        member = await searchMembers(members, target)
        if (!member) {
            const embed = errorEmbed("Invalid user or user ID.")
            message.channel.send({ embeds: [embed] });
            return;
        } else {
            userID = member.id;
        }
    }

    member = member || await resolveMember(guild, userID);
    if (member) {
        user = member.user;
    } else {
        user = await resolveUser(userID);
    }

    if (!user) {
        const embed = errorEmbed("Invalid user.")
        message.channel.send({ embeds: [embed] });
        return;
    }

    let res;
    try {
        res = await axios.get(user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }), { responseType: 'arraybuffer' });
    } catch (e) {
        const embed = errorEmbed(`Error fetching avatar:\n${user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 })}`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let img_size = Math.max(Math.round(res.headers['content-length'] / 10000) / 100, 1 / 100);
    let img_type = res.headers['content-type'].split('/')[1];
    let timestamp = new Date(res.headers['last-modified']);

    let img = new Image(res.data);
    let dims = img.dimensions;
    let username = user.username;
    let p = username.toLowerCase().endsWith('s') ? "'" : "'s";
    let embedColor = await getImgColours(user.displayAvatarURL({ format: 'png', dynamic: false, size: 2048 }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    let embed = new Discord.MessageEmbed({
        author: {
            name: `${username + p} avatar`,
            url: user.displayAvatarURL(),
            icon_url: guild.iconURL({ format: 'png', dynamic: true })
        },
        color: embedColorFinal
    });

    if (dims[0] < 150) {
        embed.thumbnail = { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }) };
        embed.setDescription(`Type: ${img_type.toUpperCase()}\nSize: ${img_size}MB`)
        embed.timestamp = timestamp;
    } else {
        embed.image = { url: user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 }) };
        //embed.setFooter(`Type: ${img_type.toUpperCase()} Size: ${img_size}MB Dimensions: ${dims.join('x')}`)
        embed.setFooter(`Type: ${img_type.toUpperCase()} • Size: ${img_size}MB`)
        embed.timestamp = timestamp;
    }

    message.channel.send({ embed });

}

async function guildInfo(message, target) {

    let guild;
    if (!target || message.author.id != '219991496793915394') {
        guild = message.guild;
    } else {
        let match = target.match(/^\d+$/);
        if (!match) {
            const embed = errorEmbed(`Invalid server.`)
            message.channel.send({ embeds: [embed] });
            return;
        }
        guild = bot.guilds.cache.get(match[0])
        if (!guild) {
            const embed = errorEmbed(`Invalid server or the bot is not in it.`)
            message.channel.send({ embeds: [embed] });
            return;
        }
    }

    let embed = await serverEmbed(guild);
    message.channel.send({ embeds: [embed] });

}

async function serverEmbed(guild) {

    let regions = {
        "amsterdam": ":flag_nl: Amsterdam",
        "brazil": ":flag_br: Brazil",
        "europe": ":flag_eu: Europe",
        "eu-central": ":flag_eu: EU Central",
        "eu-west": ":flag_eu: EU West",
        "frankfurt": ":flag_de: Frankfurt",
        "hongkong": ":flag_hk: Hong Kong",
        "india": ":flag_in: India",
        "japan": ":flag_jp: Japan",
        "london": ":flag_gb: London",
        "russia": ":flag_ru: Russia",
        "singapore": ":flag_sg: Singapore",
        "southafrica": ":flag_za: South Africa",
        "south-korea": ":flag_kr: South Korea",
        "sydney": ":flag_au: Sydney",
        "us-central": ":flag_us: US Central",
        "us-east": ":flag_us: US East",
        "us-south": ":flag_us: US South",
        "us-west": ":flag_us: US West"
    }

    let statusObj = {
        online: { emoji: "<:online:953879422996480060>", count: 0 },
        idle: { emoji: "<:idle:953879422748987433>", count: 0 },
        dnd: { emoji: "<:dnd:953879422866427944>", count: 0 },
        invisible: { emoji: "<:offline:953879422845452319>", count: 0 }
    }

    let boostLvl = {
        "NONE": "0",
        "TIER_1": "1",
        "TIER_2": "2",
        "TIER_3": "3",
    }

    let boostLvlEmojis = {
        "NONE": "<:lvl0:953881889628901386>",
        "TIER_1": "<:lvl1:953881889544998972>",
        "TIER_2": "<:lvl2:953881889574375474>",
        "TIER_3": "<:lvl3:953881889536626699>",
    }

    guild.presences.cache.forEach(p => statusObj[p.status].count += 1);
    let statusData = Object.values(statusObj);
    statusObj.invisible.count = guild.memberCount - statusData.slice(0, 3).reduce((a, c) => a + c.count, 0);
    let statuses = statusData.map(d => d.emoji + ' ' + d.count.toLocaleString()).join(' • ');
    let embedColor = await getImgColours(guild.iconURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    let owner = await guild.fetchOwner();
    var unix = Math.round(+new Date(guild.createdTimestamp) / 1000);

    let embed = new MessageEmbed({
        author: { name: guild.name, icon_url: owner.user.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }) },
        thumbnail: { url: guild.iconURL({ format: 'png', dynamic: true, size: 512 }) },
        color: embedColorFinal,
        fields: [
            { name: "Owner", value: `<@${owner.id}>\n(${owner.user.tag})`, inline: true },
            { name: "Members", value: guild.memberCount.toLocaleString(), inline: true },
            { name: "Roles", value: `${[...guild.roles.cache.values()].length}`, inline: true },
            { name: "Channels", value: `<:text:953878845960892456> ${[...guild.channels.cache.values()].filter(c => c.type == 'GUILD_TEXT').length} text\n<:voice:953878845956694046> ${[...guild.channels.cache.values()].filter(c => c.type == 'GUILD_VOICE').length} voice`, inline: true },
            { name: "Emojis", value: `${[...guild.emojis.cache.values()].length} static\n${[...guild.emojis.cache.values()].filter(e => e.animated).length} animated`, inline: true },
            { name: "Created on", value: `<t:${unix}:F> (<t:${unix}:R>)`, inline: false },
            { name: "Statuses", value: statuses, inline: false },
            { name: "Level", value: `${boostLvlEmojis[guild.premiumTier]} ${boostLvl[guild.premiumTier]}`, inline: true },
            { name: "Boosters", value: `<:nitro:927337776884613200> ${guild.premiumSubscriptionCount}`, inline: true }
        ],
        footer: { text: `ID: ${guild.id}` }
    })

    let bannerURL = guild.bannerURL({ format: 'png', dynamic: true, size: 2048 })
    if (bannerURL) {
        embed.setImage(bannerURL);
    }

    console.log(guild);

    return embed;

}

async function serverBoosters(message) {

    let { guild } = message;
    guild.members.cache = await guild.members.fetch();
    let boosters = guild.members.cache.filter(member => member.premiumSince);

    if (boosters.size < 1) {
        const embed = errorEmbed(`Nobody is boosting the server!`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let boosterString = boosters.sort((a, b) => {
        return a.premiumSinceTimestamp - b.premiumSinceTimestamp;
    }).map(member => {
        return `<@${member.id}> (${member.user.tag})`;
    }).join('\n');

    let descriptions = [];
    while (boosterString.length > 2048 || boosterString.split('\n').length > 25) {
        let currString = boosterString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        boosterString = boosterString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(boosterString);

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
                name: `${guild.name} boosters (${boosters.size})`, icon_url: message.guild.iconURL({ format: 'png', dynamic: true })
            },
            description: desc,
            color: embedColorFinal,
            footer: {
                text: `Boosts: ${descriptions.length > 1 ? `• Page ${i + 1} of ${descriptions.length}` : ``}`
            }
        })
    });

    embedPages(message, pages);

}

function removeElement(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}