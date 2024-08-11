const { Client, Intents, Options, Sweepers } = require('discord.js');
const chalk = require('chalk');
const log = console.log;
const Economy = require('discord-economy-super');
const eco = new Economy({
    storagePath: "./resources/JSON/economy.json",
    updater: {
        checkUpdates: false,
        upToDateMessage: false
    },
    dailyAmount: 50,
    workAmount: [5, 20]
});

const bot = new Client({
    allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: true
    },
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGE_TYPING
    ],
    makeCache: Options.cacheWithLimits([{
        MessageManager: 200,
        ThreadManager: {
            sweepInterval: 3600,
            sweepFilter: Sweepers.filterByLifetime({
                getComparisonTimestamp: e => e.archiveTimestamp,
                excludeFromSweep: e => !e.archived,
            }),
        },
    }]),
    partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

module.exports = { bot, eco };

const config = require("./config.json");
const messages = require("./handlers/msg_handler.js");
const border = require("./handlers/border_handler.js");
const checklist = require("./handlers/ready_handler.js");

let initialised = false;

// discord events ☆

bot.once("ready", () => {
    log(chalk.bold.keyword('palevioletred')(`Logged in as: ${bot.user.tag}`));

    if (!initialised) {
        checklist.handleTasks();
        initialised = true;
    }
});

bot.on("error", error => {
    log(chalk.bold.keyword('red')(`Discord error: ${error}`));
});

/*bot.on('interactionCreate', async (interaction) => {
    if (interaction.isButton) {
        messages.onButton(interaction);
    }
})*/

bot.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) {
        // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
        try {
            await reaction.fetch();
        } catch (error) {
            log(chalk.keyword('red')(`Partial fetching error: ${error}`));
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }
    messages.onReaction(reaction, user);
})

bot.on("messageCreate", message => {
    messages.onMessage(message);
})

bot.on("messageDelete", message => {
    messages.onMessageDelete(message);
})

bot.on("messageDeleteBulk", messages => {
    messages.forEach(message => messages.onMessageDelete(message));
})

bot.on("channelCreate", async channel => {
    messages.channelCreateHandler(channel);
})

bot.on("channelDelete", async channel => {
    messages.channelDeleteHandler(channel);
})

bot.on("channelUpdate", (channelbefore, channelafter) => {
    messages.channelUpdateHandler(channelbefore, channelafter);
})

bot.on("emojiCreate", async emoji => {
    messages.emojiCreateHandler(emoji);
})

bot.on("emojiDelete", async emoji => {
    messages.emojiDeleteHandler(emoji);
})

bot.on("roleCreate", async role => {
    messages.roleCreateHandler(role);
})

bot.on("roleDelete", async role => {
    messages.roleDeleteHandler(role);
})

bot.on("roleUpdate", async (rolebefore, roleafter) => {
    messages.roleUpdateHandler(rolebefore, roleafter);
})

bot.on("stickerCreate", async sticker => {
    messages.stickerCreateHandler(sticker);
})

bot.on("stickerDelete", async sticker => {
    messages.stickerDeleteHandler(sticker);
})

bot.on("stickerUpdate", async (oldsticker, newsticker) => {
    messages.stickerUpdateHandler(oldsticker, newsticker);
})

bot.on("messageUpdate", (oldMessage, newMessage) => {
    messages.onMessageEdit(oldMessage, newMessage);
})

bot.on("guildMemberUpdate", (userbefore, userafter) => {
    messages.userUpdateHandler(userbefore, userafter);
})

bot.on("guildMemberAdd", member => {
    border.handleJoins(member);
})

bot.on("guildMemberRemove", member => {
    border.handleLeaves(member);
})

bot.on("guildCreate", guild => {
    border.handleNewGuild(guild);
})

bot.on("guildBanAdd", async (guild, member) => {
    border.banHandler(guild, member);
})

bot.on("guildBanRemove", async (guild, member) => {
    border.unbanHandler(guild, member);
})

bot.on("threadCreate", async threadChannel => {
    // join the thread channel if the bot can
    if (threadChannel.joinable) await threadChannel.join();
    messages.threadCreateHandler(threadChannel);
})

bot.on("threadDelete", async threadChannel => {
    messages.threadDeleteHandler(threadChannel);
})

bot.on("inviteCreate", async invite => {
    messages.inviteCreateHandler(invite);
})

bot.on("inviteDelete", async invite => {
    messages.inviteDeleteHandler(invite);
})

bot.login(config.token);
