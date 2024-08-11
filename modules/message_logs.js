const { Discord, MessageEmbed } = require("discord.js");
const { bot } = require("../bot.js");
const { checkPermissions, resolveMember, confirmEmbed, errorEmbed, helpBuilder, withTyping } = require("../functions/discord.js");
const moment = require('moment');

const serverSettings = require("../utils/server_settings.js");
const { parseChannelID } = require("../functions/functions.js");

const permsNormal = {
    "CREATE_INSTANT_INVITE": "Create invite",
    "KICK_MEMBERS": "Kick members",
    "BAN_MEMBERS": "Ban members",
    "ADMINISTRATOR": "Administrator",
    "MANAGE_CHANNELS": "Manage channels",
    "MANAGE_GUILD": "Manage guild",
    "ADD_REACTIONS": "Add reactions",
    "VIEW_AUDIT_LOG": "View audit log",
    "PRIORITY_SPEAKER": "Priority speaker",
    "STREAM": "Stream",
    "VIEW_CHANNEL": "View channel",
    "SEND_MESSAGES": "Send messages",
    "SEND_TTS_MESSAGES": "Send TTS messages",
    "MANAGE_MESSAGES": "Manage messages",
    "EMBED_LINKS": "Embed links",
    "ATTACH_FILES": "Attach files",
    "READ_MESSAGE_HISTORY": "Read message history",
    "MENTION_EVERYONE": "Mention @everyone, @here, and All Roles",
    "USE_EXTERNAL_EMOJIS": "Use external emojis",
    "VIEW_GUILD_INSIGHTS": "View guild insights",
    "CONNECT": "Connect",
    "SPEAK": "Speak",
    "MUTE_MEMBERS": "Mute members",
    "DEAFEN_MEMBERS": "Deafen members",
    "MOVE_MEMBERS": "Move members",
    "USE_VAD": "Use VAD",
    "CHANGE_NICKNAME": "Change nickname",
    "MANAGE_NICKNAMES": "Manage nicknames",
    "MANAGE_ROLES": "Manage roles",
    "MANAGE_WEBHOOKS": "Manage webhooks",
    "MANAGE_EMOJIS_AND_STICKERS": "Manage emojis and stickers",
    "USE_APPLICATION_COMMANDS": "Use slash commands",
    "REQUEST_TO_SPEAK": "Request to speak",
    "MANAGE_THREADS": "Manage threads",
    "CREATE_PUBLIC_THREADS": "Create public threads",
    "CREATE_PRIVATE_THREADS": "Create private threads",
    "USE_EXTERNAL_STICKERS": "Use external stickers",
    "SEND_MESSAGES_IN_THREADS": "Send messages in threads",
    "START_EMBEDDED_ACTIVITIES": "Start embedded activities"
}

exports.onCommand = async function (message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "messagelogs":
        case "msglogs":
            switch (args[1]) {
                case "channel":
                    switch (args[2]) {
                        case "set":
                            if (checkPermissions(member, ["BAN_MEMBERS"]))
                                withTyping(channel, setMsgLogsChannel, [message, args[3]])
                            break;
                    }
                    break;
                case "toggle":
                    if (checkPermissions(member, ["BAN_MEMBERS"]))
                        withTyping(channel, toggleMsgLogs, [message]);
                    break;
                default:
                    prefix = await serverSettings.get(message.guild.id, "prefix");
                    var embed = await helpBuilder("management", prefix);
                    channel.send(embed);
                    break;
            }
            break;
    }

}

exports.onMessageDelete = async function (message) {
    logDeletedMessage(message)
}

exports.onMessageEdit = async function (oldMessage, newMessage) {
    logEditedMessage(oldMessage, newMessage)
}

exports.channelCreateHandler = async function (chan) {
    chanCreateLog(chan)
}

exports.channelDeleteHandler = async function (chan) {
    chanDeleteLog(chan)
}

exports.channelUpdateHandler = async function (channelbefore, channelafter) {
    chanUpdateLog(channelbefore, channelafter)
}

exports.emojiCreateHandler = async function (emoji) {
    emojiCreateLog(emoji)
}

exports.emojiDeleteHandler = async function (emoji) {
    emojiDeleteLog(emoji)
}

exports.roleCreateHandler = async function (role) {
    roleCreateLog(role)
}

exports.roleDeleteHandler = async function (role) {
    roleDeleteLog(role)
}

exports.roleUpdateHandler = async function (rolebefore, roleafter) {
    roleUpdateLog(rolebefore, roleafter)
}

exports.userUpdateHandler = async function (userbefore, userafter) {
    userUpdateLog(userbefore, userafter)
}

exports.threadCreateHandler = async function (threadchan) {
    threadCreateLog(threadchan)
}

exports.threadDeleteHandler = async function (threadchan) {
    threadDeleteLog(threadchan)
}

exports.stickerCreateHandler = async function (sticker) {
    stickerCreateLog(sticker)
}

exports.stickerDeleteHandler = async function (sticker) {
    stickerDeleteLog(sticker)
}

exports.stickerUpdateHandler = async function (oldsticker, newsticker) {
    stickerUpdateLog(oldsticker, newsticker)
}

exports.inviteDeleteHandler = async function (invite) {
    inviteDeleteLog(invite)
}

exports.inviteCreateHandler = async function (invite) {
    inviteCreateLog(invite)
}


async function logDeletedMessage(message) {

    let { author, content, guild } = message;

    let logsOn = serverSettings.get(guild.id, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guild.id, "msgLogsChan");
    let channel = bot.channels.cache.get(logChannelID);
    if (!channel) return;


    let embed = new MessageEmbed({
        color: `#303135`,
        author: {
            name: author.tag + `'s Deleted Message`,
            icon_url: author.displayAvatarURL({ format: 'png', dynamic: true, size: 512 })
        },
        timestamp: message.deletedAt
    })

    if (content.length > 0) {
        embed.setDescription(content.length > 4096 ? content.slice(0, 4093) + '...' : content);
    }

    if (message.attachments.size > 0) {
        embed.addFields({ name: 'Attachments', value: [...message.attachments.values()].map(file => {
            return `[${file.name}](${file.url})`;
        }).join(', '), inline: false });
    }

    embed.setFooter({ text: `ID: ${author.id} • #${message.channel.name}`, iconURL: null });

    channel.send({ embeds: [embed] });

}

async function logEditedMessage(oldMessage, newMessage) {

    if (oldMessage.content === newMessage.content) return;
    let { author, guild } = oldMessage;

    let logsOn = serverSettings.get(guild.id, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guild.id, "msgLogsChan");
    let channel = bot.channels.cache.get(logChannelID);
    if (!channel) return;

    var embed;
    var embed2;

    if (oldMessage.content.length > 0) {
        embed = new MessageEmbed({
            author: {
                name: author.tag + `'s Edited Message (1/2)`,
                icon_url: author.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }),
                url: newMessage.url,
            },
            color: `#303135`,
            timestamp: newMessage.editedAt,
            description: oldMessage.content,
            footer: {
                text: `ID: ${author.id} • #${newMessage.channel.name}`,
                icon_url: null,
            }
        });
        //embed.addField("Old message", oldMessage.content.length > 1024 ? oldMessage.content.slice(0, 1021) + '...' : oldMessage.content, false);
    }
    if (newMessage.content.length > 0) {
        embed2 = new MessageEmbed({
            author: {
                name: author.tag + `'s Edited Message (2/2)`,
                icon_url: author.displayAvatarURL({ format: 'png', dynamic: true, size: 512 }),
                url: newMessage.url,
            },
            color: `#303135`,
            timestamp: newMessage.editedAt,
            description: newMessage.content,
            footer: {
                text: `ID: ${author.id} • #${newMessage.channel.name}`,
                icon_url: null,
            }
        });
        //embed.addField("New message", newMessage.content.length > 1024 ? newMessage.content.slice(0, 1021) + '...' : newMessage.content, false);
    }

    channel.send({ embeds: [embed, embed2] });

}

async function chanCreateLog(chan) {

    let guildid = chan.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let embed = new MessageEmbed()
        .setAuthor({ name: `${chan.type === 'category' ? 'Category Created' : 'Channel Created'}`, icon_url: `https://i.ibb.co/C73fMmW/channel-Audit-Add.png` })
        .addField("Name", chan.name)
        .setFooter(`${chan.type === 'category' ? 'Category' : 'Channel'} ID: ${chan.id}`)
        .setTimestamp(chan.createdAt);
    let color = "#C2185B";
    embed.setColor(color);
    logChannel.send({ embeds: [embed] });
};

//Channel delete

async function chanDeleteLog(chan) {

    let guildid = chan.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const then = moment(chan.createdAt);
    const time = then.from(moment());
    const ca = then.format("lll");

    let embed = new MessageEmbed()
        .setAuthor({ name: `${chan.type === 'category' ? 'Category Deleted' : 'Channel Deleted'}`, icon_url: `https://i.ibb.co/vmYJcxh/channel-Audit-Delete.png` })
        .addField("Name", chan.name, true)
        .addField(`${chan.type === 'category' ? 'Category created' : 'Channel created'}`, `${ca}\n(${time})`, true)
        .setFooter(`${chan.type === 'category' ? 'Category' : 'Channel'} ID: ${chan.id}`)
        .setTimestamp(chan.createdAt);
    let color = "#9C27B0";
    embed.setColor(color);
    logChannel.send({ embeds: [embed] });
};

//Channel update

async function chanUpdateLog(channelbefore, channelafter) {

    let guildid = channelafter.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let embed = new MessageEmbed()
        .setAuthor({ name: `${channelbefore.type === 'category' ? 'Category Updated' : 'Channel Updated'}`, icon_url: `https://i.ibb.co/PNmBBdS/channel-Audit-Update.png` })
        .setDescription(`<#${channelbefore.id}> (${channelbefore.name})`)
    if (channelbefore.name != channelafter.name) {
        embed.addField(`Name`, `${channelbefore.name} → ${channelafter.name}`);
    }
    // channel topic (description) change
    if (channelbefore.topic != channelafter.topic) {
        embed.addField(`Topic`, `${channelbefore.topic ? channelbefore.topic : 'None'} → ${channelafter.topic ? channelafter.topic : 'None'}`);
    }
    // Check for permission change
    if (channelbefore.permissionOverwrites !== channelafter.permissionOverwrites) {
        let chanAfterPerm = await channelafter.permissionOverwrites.cache;
        let arrayAfter = Array.from(chanAfterPerm);
        let channelOverwrites = arrayAfter[0][1];

        if (channelOverwrites.type == 'role') {
            let role = channelbefore.guild.roles.cache.find(role => role.id == channelOverwrites.id);
            let permBefore = role.permissionsIn(channelbefore).serialize();
            let permAfter = role.permissionsIn(channelafter).serialize();
            let difference = await diff(permBefore, permAfter);
            let final = [];
            for (const [key, value] of Object.entries(difference)) {
                if (!key && !value) return;
                let normal = getValues(permsNormal, key);
                final.push(`**${normal}:** ${value === true ? "<:x_:923466051193290752><:n_:923465292997361674><:_c:923465293081223178>" : "<:x_:923465292930244649><:n_:923465292997361674><:_c:923465292720537611>"}`);
            }
            if (final.length == 0) return;
            let string = final.join(`\n`);
            let fname = "";
            if (role.name == "@everyone") {
                fname = "everyone"
            } else {
                fname = role.name;
            }
            embed.addField(`@${fname} permissions updated`, `${string}`);
        }
        if (channelOverwrites.type == 'member') {
            let member = await channelafter.guild.members.fetch(channelOverwrites.id);
            let permBefore = await member.permissionsIn(channelbefore).serialize();
            let permAfter = await member.permissionsIn(channelafter).serialize();
            let difference = await diff(permBefore, permAfter);
            let final = [];
            for (const [key, value] of Object.entries(difference)) {
                if (!key && !value) return;
                let normal = getValues(permsNormal, key);
                final.push(`**${normal}:** ${value === true ? "<:x_:923466051193290752><:n_:923465292997361674><:_c:923465293081223178>" : "<:x_:923465292930244649><:n_:923465292997361674><:_c:923465292720537611>"}`);
            }
            if (final.length == 0) return;
            let string = final.join(`\n`);
            embed.addField(`${member.user.tag} permissions updated`, `${string}`);
        }
    }
    embed.setFooter(`${channelafter.type === 'category' ? 'Category' : 'Channel'} ID: ${channelbefore.id}`)
    embed.setTimestamp(channelbefore.createdAt);
    let color = "#673AB7";
    embed.setColor(color);
    if (embed.fields.length > 0) logChannel.send({ embeds: [embed] });
};

async function diff(obj1, obj2) {
    const result = {};
    if (Object.is(obj1, obj2)) {
        return undefined;
    }
    if (!obj2 || typeof obj2 !== 'object') {
        return obj2;
    }
    Object.keys(obj1 || {}).concat(Object.keys(obj2 || {})).forEach(key => {
        if (obj2[key] !== obj1[key] && !Object.is(obj1[key], obj2[key])) {
            result[key] = obj2[key];
        }
        if (typeof obj2[key] === 'object' && typeof obj1[key] === 'object') {
            const value = diff(obj1[key], obj2[key]);
            if (value !== undefined) {
                result[key] = value;
            }
        }
    });
    return result;
};

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

//Emoji create :D

async function emojiCreateLog(emoji) {

    let guildid = emoji.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let embed = new MessageEmbed()
        .setAuthor({ name: `Emoji Created`, icon_url: `https://i.ibb.co/0cmrDYD/emoji-Audit-Add.png` })
        .setThumbnail(emoji.url)
        .addField('Name', emoji.name, true)
    if (emoji.animated) {
        embed.addField('Emoji', `\`<a:${emoji.name}:${emoji.id}>\``, true);
    } else {
        embed.addField('Emoji', `\`<:${emoji.name}:${emoji.id}>\``, true);
    }
    embed.addField('Is animated?', (emoji.animated == 'false') ? 'Yes' : 'No', true);
    embed.setFooter(`Emoji ID: ${emoji.id}`);
    embed.setTimestamp(emoji.createdAt);
    let color = "#3F51B5";
    embed.setColor(color);
    logChannel.send({ embeds: [embed] });
};

//Emoji delete D:

async function emojiDeleteLog(emoji) {

    let guildid = emoji.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let embed = new MessageEmbed()
        .setAuthor({ name: `Emoji Deleted`, icon_url: `https://i.ibb.co/GPbb3Cj/emoji-Audit-Delete.png` })
        .setThumbnail(emoji.url)
        .addField('Name', emoji.name, true)
    embed.addField('Is animated?', (emoji.animated == 'false') ? 'Yes' : 'No', true);
    embed.setFooter(`Emoji ID: ${emoji.id}`);
    embed.setTimestamp(emoji.createdAt);
    let color = "#2196F3";
    embed.setColor(color);
    logChannel.send({ embeds: [embed] });
};

//Role create

async function roleCreateLog(role) {

    let guildid = role.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    // Reverse role position
    const position = `${role.guild.roles.cache.size - role.position}/${role.guild.roles.cache.size}`;
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
        .setAuthor({ name: `Role Created`, icon_url: `https://i.ibb.co/3knvDCn/role-Audit-Add.png` })
        .setDescription(`${role}`)
        .addField(`Name`, role.name, true)
        .addField('Position', position, true)
        .addField('Bot role?', (role.managed == 'false') ? '<:confirm:789284150133260338> Yes' : '<:deny:789284150560948224> No', true)
        .setFooter(`Role ID: ${role.id}`, roleimg)
        .setTimestamp();
    let color = "#03A9F4";
    embed.setColor(color);
    logChannel.send({ embeds: [embed] });
};

//Role delete

async function roleDeleteLog(role) {

    let guildid = role.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    const then = moment(role.createdAt);
    const time = then.from(moment());
    const ca = then.format("lll");

    const position = `${role.guild.roles.cache.size - role.position}/${role.guild.roles.cache.size}`;
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

    let embed = new MessageEmbed()
        .setAuthor({ name: `Role Deleted`, icon_url: `https://i.ibb.co/PYR12DF/role-Audit-Delete.png` })
        .addField('Role', role.name, true)
        .addField('Position', position, true)
        .addField('Role created', `${ca}\n(${time})`, true)
        .setFooter(`Role ID: ${role.id}`, roleimg)
        .setTimestamp(role.createdAt);
    let color = "#00BCD4";
    embed.setColor(color);
    logChannel.send({ embeds: [embed] });
};

//Role update

async function roleUpdateLog(rolebefore, roleafter) {

    let guildid = roleafter.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    var decimal = roleafter.color;
    var hex = '#' + decimal.toString(16).toUpperCase();
    if (hex === '#0') {
        var decimal = '7289DA';
        var hex = '#7289DA';
    } else {
        var decimal = roleafter.color;
        var hex = '#' + decimal.toString(16).toUpperCase();
    }
    const roleimg = 'http://via.placeholder.com/30x30/' + decimal.toString(16) + '/' + decimal.toString(16);

    var decimal2 = rolebefore.color;
    var hex2 = '#' + decimal2.toString(16).toUpperCase();
    if (hex2 === '#0') {
        var decimal2 = '7289DA';
        var hex2 = '#7289DA';
    } else {
        var decimal2 = rolebefore.color;
        var hex2 = '#' + decimal2.toString(16).toUpperCase();
    }

    let embed = new MessageEmbed()
    embed.setAuthor({ name: `@${roleafter.name} Role Updated`, icon_url: `https://i.ibb.co/XsZDqnv/role-Audit-Update.png` })
    if (rolebefore.name !== roleafter.name) {
        embed.addField(`Name`, `${rolebefore.name} → ${roleafter.name}`);
    }
    if (rolebefore.color !== roleafter.color) {
        embed.addField(`Color`, `${hex2} → ${hex}`);
    }

    let permBefore = rolebefore.permissions.serialize();
    let permAfter = roleafter.permissions.serialize();
    let difference = await diff(permBefore, permAfter);

    let final = [];
    for (const [key, value] of Object.entries(difference)) {
        if (!key && !value) return;
        let normal = getValues(permsNormal, key);
        final.push(`**${normal}:** ${value === true ? "<:on:926989751221882891>" : "<:off:926989750911533127>"}`);
    }
    if (final.length !== 0) {
        let string = final.join(`\n`);
        if (string.length > 1024) {
            string = string.slice(0, 1021) + `...`;
        }
        embed.addField(`Permissions`, `${string}`);
    }
    
    embed.setFooter(`Role ID: ${rolebefore.id}`, roleimg);
    embed.setTimestamp(rolebefore.createdAt);
    let color = "#009688";
    embed.setColor(color);
    if (embed.fields.length > 0) logChannel.send({ embeds: [embed] });
};

//User update

async function userUpdateLog(userbefore, userafter) {

    let guildid = userbefore.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    if (userbefore.nickname != userafter.nickname) {
        const embed = new MessageEmbed()
            .setAuthor({ name: `${userbefore.user.tag}\nNickname Changed`, icon_url: `https://i.ibb.co/YtjYBgd/user-Audit-Update.png` })
            .setDescription(`**Before:** ${userbefore.nickname ? userbefore.nickname : 'None'}\n**After:** ${userafter.nickname ? userafter.nickname : 'None'}`)
            .setFooter(`User ID: ${userafter.user.id}`)
            .setColor(0x4CAF50)
            .setTimestamp();
        // Send message
        logChannel.send({ embeds: [embed] });
    }
    // Look to see if user has boosted the server
    if (!userbefore.premiumSince && userafter.premiumSince) {
        let { guild } = userbefore;
        guild.members.cache = await guild.members.fetch();
        let boosters = guild.members.cache.filter(member => member.premiumSince);
        if (boosters.size > 1) {
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
        }

        const embed = Discord.MessageEmbed()
            .setAuthor({ name: `Server Boost`, icon_url: `https://emoji.gg/assets/emoji/5167-blank-boost.png` })
            .seDescripition(`${userafter.user} (${userafter.user.tag}) has boosted the server!`)
        if (boosters.size > 1) {
            embed.addField(`Boosters (${boosters.size})`, descriptions)
        }
        embed.setFooter(`User ID: ${userafter.user.id}`)
        embed.setColor(0xf480ff);
        embed.setTimestamp();
        logChannel.send({ embeds: [embed] });
    }
    // Look to see if user has stopped boosted the server
    if (userbefore.premiumSince && !userafter.premiumSince) {
        let { guild } = userbefore;
        guild.members.cache = await guild.members.fetch();
        let boosters = guild.members.cache.filter(member => member.premiumSince);
        if (boosters.size > 1) {
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
        }
        descriptions.push(boosterString);
        const embed = Discord.MessageEmbed()
            .setAuthor({ name: `Server Unboosted`, icon_url: `https://emoji.gg/assets/emoji/5167-blank-boost.png` })
            .seDescripition(`${userafter.user} (${userafter.user.tag}) unboosted the server.`)
        if (boosters.size > 1) {
            embed.addField(`Boosters (${boosters.size})`, descriptions)
        }
        embed.setFooter(`User ID: ${userafter.user.id}`)
        embed.setColor(0xf480ff);
        embed.setTimestamp();
        logChannel.send({ embeds: [embed] });
    }
    // Look to see if user has changed their surname
    if (userbefore.username !== userafter.username) {
        const embed = new MessageEmbed()
            .setAuthor({ name: `${userbefore.user.tag}\nUsername Changed`, icon_url: `https://i.ibb.co/YtjYBgd/user-Audit-Update.png` })
            .setFooter(`User ID: ${userafter.user.id}`)
            .setDescription(`**Before: ${userbefore.username}\n**After:** ${userafter.username}`)
            .setColor(0x4CAF50)
            .setTimestamp();
        // Send message
        logChannel.send({ embeds: [embed] });
    }
    // look for role change
    const rolesAdded = userafter.roles.cache.filter(x => !userbefore.roles.cache.get(x.id));
    const rolesRemoved = userbefore.roles.cache.filter(x => !userafter.roles.cache.get(x.id));
    if (rolesAdded.size != 0 || rolesRemoved.size != 0) {
        const roleAddedString = [];
        for (const role of [...rolesAdded.values()]) {
            roleAddedString.push(role.toString());
        }
        const roleRemovedString = [];
        for (const role of [...rolesRemoved.values()]) {
            roleRemovedString.push(role.toString());
        }
        embedString = ``;
        const embed = new MessageEmbed()
        embed.setAuthor({ name: `${userbefore.user.tag}\nRoles Changed`, icon_url: `https://i.ibb.co/YtjYBgd/user-Audit-Update.png` });
        embed.setFooter(`User ID: ${userafter.user.id}`);
        if (rolesAdded.size > 0) {
            embedString += `**Added:** ${roleAddedString.join(`, `)}`
        }
        if (rolesRemoved.size > 0) {
            embedString += `**Removed:** ${roleRemovedString.join(`, `)}`
        }
        embed.setDescription(embedString);
        embed.setColor(0x4CAF50);
        embed.setTimestamp();
        // Send message
        logChannel.send({ embeds: [embed] });
    }
};

async function threadCreateLog(threadchan) {

    let guildid = threadchan.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let creator = await threadchan.fetchOwner();

    let embed = new MessageEmbed()
        .setAuthor({ name: `Thread Created`, icon_url: `https://i.ibb.co/qCTpTNV/message-Audit-Add.png` })
        .setDescription(`**${threadchan}** was created under ${threadchan.parent} by <@${creator.id}>`)
        .setFooter(`ID: ${threadchan.id}`)
        .setTimestamp(threadchan.createdAt);
    embed.setColor(`#8BC34A`);
    logChannel.send({ embeds: [embed] });
};

async function threadDeleteLog(threadchan) {

    let guildid = threadchan.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let embed = new MessageEmbed()
        .setAuthor({ name: `Thread Deleted`, icon_url: `https://i.ibb.co/nn7c7Xh/message-Audit-Delete.png` })
        .setDescription(`**${threadchan}** was deleted under ${threadchan.parent}`)
        .setFooter(`ID: ${threadchan.id}`)
        .setTimestamp(threadchan.createdAt);
    embed.setColor(`#CDDC39`);
    logChannel.send({ embeds: [embed] });
};

async function stickerCreateLog(sticker) {
    let guildid = sticker.guildID;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let embed = new MessageEmbed()
        .setAuthor({ name: `Sticker Created`, icon_url: `https://i.ibb.co/0cmrDYD/emoji-Audit-Add.png` })
        .setDescription(`**${sticker.name}** was created by ${sticker.user}`)
        .addField(`Description`, sticker.description)
        .setFooter(`ID: ${sticker.id}`)
        .setImage(`https://cdn.discordapp.com/stickers/${sticker.id}.png`)
        .setTimestamp(sticker.createdAt);
    embed.setColor(`#795548`);
    logChannel.send({ embeds: [embed] });
};

async function stickerDeleteLog(sticker) {
    let guildid = sticker.guildID;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let embed = new MessageEmbed()
        .setAuthor({ name: `Sticker Deleted`, icon_url: `https://i.ibb.co/GPbb3Cj/emoji-Audit-Delete.png` })
        .setDescription(`**${sticker.name}** was deleted`)
        .setFooter(`ID: ${sticker.id}`)
        .setImage(`https://cdn.discordapp.com/stickers/${sticker.id}.png`)
        .setTimestamp(sticker.createdAt);
    embed.setColor(`#9E9E9E`);
    logChannel.send({ embeds: [embed] });
};

async function stickerUpdateLog(oldSticker, newSticker) {
    let guildid = newSticker.guildId;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    let embed, updated = false;

    // sticker name change
    if (oldSticker.name != newSticker.name) {
        embed = new MessageEmbed()
            .setAuthor({ name: `Sticker Updated`, icon_url: `https://i.ibb.co/XJR5H2Z/emoji-Audit-Update.png` })
            .setDescription(`Sticker name changed of ${newSticker.name}`)
            .setColor(`#607D8B`)
            .setFooter(`ID: ${newSticker.id}`)
            .addFields(
                { name: 'Old:', value: `${oldSticker.name}`, inline: true },
                { name: 'New:', value: `${newSticker.name}`, inline: true },
            )
            .setTimestamp();
        updated = true;
    }

    // sticker description change
    if (oldSticker.description != newSticker.description) {
        embed = new MessageEmbed()
            .setAuthor({ name: `Sticker Updated`, icon_url: `https://i.ibb.co/XJR5H2Z/emoji-Audit-Update.png` })
            .setDescription(`Sticker description changed of ${newSticker.name}`)
            .setColor(`#607D8B`)
            .setFooter(`ID: ${newSticker.id}`)
            .addFields(
                { name: 'Old', value: `${oldSticker.description}`, inline: true },
                { name: 'New', value: `${newSticker.description}`, inline: true },
            )
            .setTimestamp();
        updated = true;
    }

    // Find channel and send message
    if (updated) {
        logChannel.send({ embeds: [embed] });
    }
};

async function inviteCreateLog(invite) {

    let guildid = invite.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    var unix = Math.round(+new Date(invite.expiresTimestamp) / 1000);

    let embed = new MessageEmbed()
        .setAuthor({ name: `${invite.inviter.tag}\nInvite Created`, icon_url: `https://i.ibb.co/2WLskS8/invite-Audit-Add.png` })
        .setDescription(`**Created by:** ${invite.inviter}\n**Invite:** [${invite.code}](${invite.url})\n**Channel:**${invite.channel}\n**Expires:** <t:${unix}>`)
        .setFooter(`ID: ${invite.code}`)
        .setTimestamp();
    embed.setColor(`#AEEA00`);
    logChannel.send({ embeds: [embed] });
};

async function inviteDeleteLog(invite) {

    let guildid = invite.guild.id;
    let logsOn = serverSettings.get(guildid, "msgLogsOn");
    if (!logsOn) return;
    let logChannelID = serverSettings.get(guildid, "msgLogsChan");
    let logChannel = bot.channels.cache.get(logChannelID);
    if (!logChannel) return;

    var unix = Math.round(+new Date(invite.expiresTimestamp) / 1000);

    let embed = new MessageEmbed()
        .setAuthor({ name: `Invite Deleted`, icon_url: `https://i.ibb.co/Vt4QNZy/invite-Audit-Delete.png` })
        .setDescription(`**Invite:** [${invite.code}](${invite.url})\n**Channel:**${invite.channel}`)
        .setFooter(`ID: ${invite.code}`)
        .setTimestamp();
    embed.setColor(`#DD2C00`);
    logChannel.send({ embeds: [embed] });
};

async function setMsgLogsChannel(message, channelArg) {

    let { guild } = message;

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        const embed = errorEmbed("Invalid channel or channel ID.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channel = guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("Channel doesn't exist in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let member = await resolveMember(guild, bot.user.id);
    if (!member) {
        const embed = errorEmbed("Error occured.");
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

    await serverSettings.set(message.guild.id, "msgLogsChan", channelID);
    const embed = confirmEmbed(`Message logs channel set to <#${channelID}>.`);
    message.channel.send({ embeds: [embed] });

}

async function toggleMsgLogs(message) {

    let tog = await serverSettings.toggle(message.guild.id, "msgLogsOn");
    if (tog) {
        const embed = confirmEmbed(`Message logs turned **on**.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Message logs turned **off**.`);
        message.channel.send({ embeds: [embed] });
    }

}