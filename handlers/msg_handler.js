const { resolveMember } = require("../functions/discord.js");
const { bot } = require("../bot.js");

const client = require("../modules/client.js");
const commands = require("../modules/commands.js");
const emojis = require("../modules/emojis.js");
const starboard = require("../modules/starboard.js");
const information = require("../modules/information.js");
const lastfm = require("../modules/lastfm.js");
const levels = require("../modules/levels.js");
const management = require("../modules/management.js");
const media = require("../modules/media.js");
const memberLogs = require("../modules/member_logs.js");
const messageLogs = require("../modules/message_logs.js");
const misc = require("../modules/misc.js");
const games = require("../modules/games.js");
const moderation = require("../modules/moderation.js");
const notifications = require("../modules/notifications.js");
const profiles = require("../modules/profiles.js");
const reps = require("../modules/reps.js");
const roles = require("../modules/roles.js");
const reminders = require("../modules/reminders.js");
const economy = require("../modules/economy.js");

const serverSettings = require("../utils/server_settings.js");

exports.onMessage = async function(message) {

    if (message.system) return;
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;


    let { author, content, guild } = message;
    let prefix = serverSettings.get(guild.id, "prefix");
    if (!prefix || prefix === undefined || prefix === null) {
        await serverSettings.initGuild(guild.id);
        prefix = serverSettings.get(guild.id, "prefix");
    }
    
    if (content.startsWith(prefix)) {
        let args = content.slice(1).split(/\s+/);
        if (!message.member) {
            message.member = await resolveMember(guild, author.id);
        }
        processCommand(message, args);
    }

    if (message.mentions.users.has(bot.user.id)) {
        let args = content.split(/\s+/);
        if (!message.member) {
            message.member = await resolveMember(guild, author.id);
        }
        processMention(message, args);
    }

    processMessage(message);

}

exports.onReaction = async function(reaction, user) {
    if (user.bot) return;
    if (!reaction) return;
    let message = reaction.message;
    if (!serverSettings) return;

    // maybe make a way to add diff emojis for starboard
    if (reaction.emoji.name === '⭐') {
        starboard.onStar(reaction);
    }

    roles.reactionRole(message, reaction, user);
};

/*exports.onButton = async function(interaction) {
    if (interaction.user.bot) return;
    if (!interaction) return;
    let message = interaction.MessageButton.emoji;
    if (!serverSettings) return;

    // maybe make a way to add diff emojis for starboard
    if (reaction.emoji.name === '⭐') {
        starboard.onStar(reaction);
    }

    roles.reactionRole(message, reaction, user);
};*/

exports.onMessageDelete = async function(message) {
    if (message.system) return;
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;
    message.deletedTimestamp = Date.now();
    message.deletedAt = new Date(message.deletedTimestamp);

    processMessageDelete(message);
}

exports.onMessageEdit = async function(oldMessage, newMessage) {
    if (oldMessage.system || newMessage.system) return;
    if (oldMessage.channel.type === "dm" || newMessage.channel.type === "dm") return;

    let { author, content, guild } = newMessage;
    let prefix = serverSettings.get(newMessage.guild.id, "prefix");

    if (content.startsWith(prefix)) {
        let args = content.slice(1).split(/\s+/);
        if (!newMessage.member) {
            newMessage.member = await resolveMember(guild, author.id);
        }
        processCommand(newMessage, args);
    }

    processMessageEdit(oldMessage, newMessage);
}

exports.channelCreateHandler = async function(channel) {
    processChannelCreate(channel);
}

exports.channelDeleteHandler = async function(channel) {
    processChannelDelete(channel);
}

exports.channelUpdateHandler = async function(channelbefore, channelafter) {
    processChannelUpdate(channelbefore, channelafter);
}

exports.emojiCreateHandler = async function(emoji) {
    processEmojiCreate(emoji);
}

exports.emojiDeleteHandler = async function(emoji) {
    processEmojiDelete(emoji);
}

exports.roleCreateHandler = async function(role) {
    processRoleCreate(role);
}

exports.roleDeleteHandler = async function(role) {
    processRoleDelete(role);
}

exports.roleUpdateHandler = async function(rolebefore, roleafter) {
    processRoleUpdate(rolebefore, roleafter);
}

exports.stickerCreateHandler = async function(sticker) {
    processStickerCreate(sticker);
}

exports.stickerDeleteHandler = async function(sticker) {
    processStickerDelete(sticker);
}

exports.stickerUpdateHandler = async function(oldsticker, newsticker) {
    processStickerUpdate(oldsticker, newsticker);
}

exports.userUpdateHandler = async function(userbefore, userafter) {
    processUserUpdate(userbefore, userafter);
}

exports.threadDeleteHandler = async function(threadChannel) {
    processThreadDelete(threadChannel);
}

exports.threadCreateHandler = async function(threadChannel) {
    processThreadCreate(threadChannel);
}

exports.inviteCreateHandler = async function(invite) {
    processInviteCreate(invite);
}

exports.inviteDeleteHandler = async function(invite) {
    processInviteDelete(invite);
}

async function processCommand(message, args) {
    client.onCommand(message, args);
    commands.onCommand(message, args);
    emojis.onCommand(message, args);
    information.onCommand(message, args);
    lastfm.onCommand(message, args);
    levels.onCommand(message, args);
    management.onCommand(message, args);
    media.onCommand(message, args);
    memberLogs.onCommand(message, args);
    messageLogs.onCommand(message, args);
    misc.onCommand(message, args);
    games.onCommand(message, args);
    moderation.onCommand(message, args);
    notifications.onCommand(message, args);
    profiles.onCommand(message, args);
    reps.onCommand(message, args);
    roles.onCommand(message, args);
    reminders.onCommand(message, args);
    starboard.onCommand(message, args);
    economy.onCommand(message, args);
}

async function processMention(message, args) {
    games.onMention(message, args);
}

async function processMessage(message) {
    levels.onMessage(message);
    notifications.onMessage(message);
    moderation.onMessage(message);
}

async function processMessageDelete(message) {
    messageLogs.onMessageDelete(message);
}

async function processMessageEdit(oldMessage, newMessage) {
    messageLogs.onMessageEdit(oldMessage, newMessage);
}

async function processChannelCreate(channel) {
    messageLogs.channelCreateHandler(channel);
}

async function processChannelDelete(channel) {
    messageLogs.channelDeleteHandler(channel);
}

async function processChannelUpdate(channelbefore, channelafter) {
    messageLogs.channelUpdateHandler(channelbefore, channelafter);
}

async function processEmojiCreate(emoji) {
    messageLogs.emojiCreateHandler(emoji);
}

async function processEmojiDelete(emoji) {
    messageLogs.emojiDeleteHandler(emoji);
}

async function processRoleCreate(role) {
    messageLogs.roleCreateHandler(role);
}

async function processRoleDelete(role) {
    messageLogs.roleDeleteHandler(role);
}

async function processRoleUpdate(rolebefore, roleafter) {
    messageLogs.roleUpdateHandler(rolebefore, roleafter);
}

async function processStickerCreate(sticker) {
    messageLogs.stickerCreateHandler(sticker);
}

async function processStickerDelete(sticker) {
    messageLogs.stickerDeleteHandler(sticker);
}

async function processStickerUpdate(oldsticker, newsticker) {
    messageLogs.stickerUpdateHandler(oldsticker, newsticker);
}

async function processUserUpdate(userbefore, userafter) {
    messageLogs.userUpdateHandler(userbefore, userafter);
}

async function processThreadCreate(threadChannel) {
    messageLogs.threadCreateHandler(threadChannel);
}

async function processThreadDelete(threadChannel) {
    messageLogs.threadDeleteHandler(threadChannel);
}

async function processInviteCreate(invite) {
    messageLogs.inviteCreateHandler(invite);
}

async function processInviteDelete(invite) {
    messageLogs.inviteDeleteHandler(invite);
}