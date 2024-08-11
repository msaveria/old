const { MessageEmbed } = require("discord.js");
const serverSettings = require("../utils/server_settings.js");
const { withTyping, resolveMember, checkPermissions, confirmEmbed, errorEmbed, helpBuilder } = require("../functions/discord.js");
const { parseChannelID } = require("../functions/functions.js");
const { bot } = require("../bot.js");

//Regex for detecting URLs in message
const IMAGE_URL_REGEX = /((http(s?):)?([/|.|\w|\s|-])*\.(?:jpg|gif|png|jpeg)(:(orig|large))?)/g;

exports.onCommand = async function (message, args) {

    let { channel, member, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('starboard' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "starboard":
        case "sb":
            switch (args[1]) {
                /*case "emoji":
                    withTyping(channel, setStarboardEmoji, [message, args[2]]);
                    break;*/
                case "number":
                    if (checkPermissions(member, ["BAN_MEMBERS"]))
                        withTyping(channel, setStarboardNumber, [message, args[2]]);
                    break;
                case "channel":
                    if (checkPermissions(member, ["BAN_MEMBERS"]))
                        withTyping(channel, setStarboardChannel, [message, args[2]]);
                    break;
                case "toggle":
                    if (checkPermissions(member, ["BAN_MEMBERS"]))
                        withTyping(channel, toggleStarboard, [message]);
                    break;
                case "help":
                default:
                    prefix = await serverSettings.get(message.guild.id, "prefix");
                    var embed = await helpBuilder("starboard", prefix);
                    channel.send(embed);
                    break;
            }
            break;
    }
}

exports.onStar = async function (reaction) {
    starboardUpdate(reaction)
}

async function starboardUpdate(reaction) {
    let message = reaction.message;
    const {
        guild,
        author,
        attachments,
        channel,
        id
    } = message;

    let starboardOn = await serverSettings.get(guild.id, "starboardOn");
    let starboardChannelID = await serverSettings.get(guild.id, "starboardChannelID");
    let starboardNumber = await serverSettings.get(guild.id, "starboardNumber");

    //Don't pin if starboard is not toggled
    if (!starboardOn) return;

    //If the defined starboard channel doesn't exist, don't pin
    let boardChannel = bot.channels.cache.get(starboardChannelID);
    if (!boardChannel) return;

    //Only pin if the right emoji is used and there are enough of them
    if (reaction.count < starboardNumber) return;

    //Don't allow pinning of messages from the starboard itself
    if (channel == boardChannel) return;

    let messageContent = message.cleanContent;
    let messageAttachments = Array.from([...message.attachments.values()]);
    let embedImage = messageAttachments.size > 0 ? messageAttachments.shift(0).url : '';

    //Extract Excess Image URLs out of post and send directly in Starboard outside the embed so that previews appear
    let extraImages = getExtraImages(messageAttachments, messageContent);

    //If image URL present, but no attachment, set the first image as the RichEmbed's image
    if (embedImage == '' && extraImages.length > 0) {
        embedImage = extraImages.shift(0);
    }

    let embed = await createEmbed(author, channel, reaction, message, guild, id, messageContent, embedImage);
    sendOrUpdateEmbed(boardChannel, message, embed, reaction, author, extraImages, channel, guild);
};

async function considerApplyingUserRoleColorToEmbed(guild, author, embed) {
    //Set embed color to the member's main role color if applicable 
    return await resolveMember(guild, author.id).then(guildMember => {
        //Set embed color to the member's main role color if applicable 
        if (guildMember.displayColor != null) {
            embed.setColor(guildMember.displayColor);
        }
    });
}

function considerSendingExcessImageAttachments(extraImages, boardChannel) {
    if (extraImages.length > 0) {
        extraImages.forEach(image => boardChannel.send(image));
    }
}

async function createEmbed(author, channel, reaction, message, guild, id, messageContent, embedImage) {
    let embed = new MessageEmbed()
        .setColor(author ? author.displayColor || 0x303135 : 0x303135)
        .setAuthor({ name: `${author.tag}`, icon_url: author.displayAvatarURL(), url: `https://discordapp.com/channels/${guild.id}/${channel.id}/${message.id}` })
        .setURL(`https://discordapp.com/channels/${guild.id}/${channel.id}/${message.id}`)
        .addField(`${reaction.count} ⭐`, `[View message](https://discordapp.com/channels/${guild.id}/${channel.id}/${id})`, false)
        .setFooter(`#${message.channel.name}`)
        .setTimestamp(new Date())
        .setDescription(`${messageContent}`)
        .setImage(embedImage);
    await considerApplyingUserRoleColorToEmbed(guild, author, embed);
    return embed;
}

function getExtraImages(messageAttachments, messageContent) {
    let extraImages = [];
    messageAttachments.forEach(attachment => extraImages.push(attachment.url));
    messageContent.replace(IMAGE_URL_REGEX, function (url) {
        extraImages.push(url);
        return url;
    });
    return extraImages;
}

async function getExistingPinnedMessageIds(boardChannel, id) {
    let existing = [];

    await boardChannel.messages.fetch({
        limit: 100
    }).then((msgs) => {
        msgs.forEach(msg => {
            if (msg.embeds.length > 0 && msg.embeds[0].url && msg.embeds[0].url.includes(id)) {
                existing.push(msg.id);
            }
        });
    });

    return existing;
}

async function sendOrUpdateEmbed(boardChannel, message, embed, reaction, author, extraImages, channel, guild) {
    //If the message has already been pinned to starboard, simply update the number of stars
    let existingPinnedMessageIds = await getExistingPinnedMessageIds(boardChannel, message.id);
    if (existingPinnedMessageIds.length == 0) {
        boardChannel.send({ embeds: [embed] });
        considerSendingExcessImageAttachments(extraImages, boardChannel);
        return;
    }

    let existingPinnedMessageId = existingPinnedMessageIds.shift();
    deleteDuplicates(boardChannel, existingPinnedMessageIds);

    boardChannel.messages.fetch(existingPinnedMessageId)
        .then(existingMessage => updateExistingPin(existingMessage, reaction, author, boardChannel, channel, guild))
        .then(() => deleteDuplicates(boardChannel, getExistingPinnedMessageIds(boardChannel, message.id)));
}

function deleteDuplicates(boardChannel, existingPinnedMessageIds) {
    for (let i = 0; i < existingPinnedMessageIds.length; i++) {
        boardChannel.messages.fetch(existingPinnedMessageIds[i])
            .then(message => message.delete().catch(console.error));
    }
}

async function setStarboardNumber(message, args) {
    if (args.length < 0 || isNaN(args)) {
        const embed = errorEmbed("Please enter a valid number.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    const newNumber = args;
    await serverSettings.set(message.guild.id, "starboardNumber", newNumber);
    const embed = confirmEmbed(`Starboard has been set to \`${newNumber}\`.`);
    message.channel.send({ embeds: [embed] });
    return;
};

async function setStarboardChannel(message, channelArg) {

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

    await serverSettings.set(message.guild.id, "starboardChannelID", channelID);
    const embed = confirmEmbed(`Starboard channel set to <#${channelID}>.`);
    message.channel.send({ embeds: [embed] });

};

async function updateExistingPin(existingPinnedMessage, reaction, author, boardChannel, channel, guild) {
    let message = reaction.message;
    const pinnedEmbed = existingPinnedMessage.embeds[0];
    const priorImage = reaction.message.attachments.size > 0 ? reaction.message.attachments.array()[0].url : '';

    const editedEmbed = new MessageEmbed()
        .setColor(pinnedEmbed.color)
        .setDescription(pinnedEmbed.description ? pinnedEmbed.description : '')
        .setURL(`https://discordapp.com/channels/${guild.id}/${channel.id}/${message.id}`)
        .setAuthor({ name: `${author.tag}`, icon_url: author.displayAvatarURL(), url: `https://discordapp.com/channels/${guild.id}/${channel.id}/${message.id}` })
        .addField(`${reaction.count} ⭐`, `[View message](https://discordapp.com/channels/${guild.id}/${channel.id}/${message.id})`, false)
        .setFooter(`#${message.channel.name}`)
        .setTimestamp()
        .setImage(priorImage);

    const pinnedMessage = await boardChannel.messages.fetch(existingPinnedMessage.id);

    await pinnedMessage.edit(editedEmbed).catch(console.error);
}

async function toggleStarboard(message) {

    let tog = await serverSettings.toggle(message.guild.id, "starboardOn");
    if (tog) {
        const embed = confirmEmbed(`Starboard turned **on**.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Starboard turned **off**.`);
        message.channel.send({ embeds: [embed] });
    }

}