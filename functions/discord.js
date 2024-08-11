const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const { bot } = require("../bot.js");
const { getAllGuildXp } = require("../db_queries/levels_db.js");
const { getImgColours } = require("../functions/colours.js");

exports.checkPermissions = function (member, permissions, checkAdmin = true) {
    if (!member) {
        let err = new Error("Invalid member to check permissions for");
        console.error(err);
    } else {
        let hasPerms = permissions.some(p => member.permissions.has(p, { checkAdmin, checkOwner: true }));
        return hasPerms;
    }
}

exports.getMemberNumber = async function (member, guild) {
    if (!member || !member.joinedTimestamp) {
        let err = new Error("Invalid member given.");
        console.error(err);
    } else {
        let members = await guild.members.fetch().catch(console.error);
        if (members) {
            members = members.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
            let array = Array.from(members, ([user]) => ({ user }));
            let memberNumber = array.findIndex(e => e.user == member.id) + 1;
            return memberNumber;
        }
    }
}

exports.resolveUser = async function (userID, cache = false) {
    if (!userID) {
        let err = new Error("No user ID provided.");
        console.error(err);
    } else {
        try {
            let user = await bot.users.fetch(userID, cache);
            return user;
        } catch (e) {
            return null;
        }
    }
}

exports.resolveMember = async function (guild, userID, cache = false) {
    if (!guild || !userID) {
        let err = new Error("Invalid parameters given.");
        console.error(err);
    } else {
        try {
            let member = await guild.members.fetch(userID, [cache]);
            return member;
        } catch (e) {
            return null;
        }
    }
}

exports.resolveMessage = async function (channel, messageID, cache = false) {
    if (!channel || !messageID || channel.messages === undefined) {
        let err = new Error("Invalid parameters given.");
        console.error(err);
    } else {
        try {
            let message = await channel.messages.fetch(messageID, cache);
            return message;
        } catch (e) {
            return null;
        }
    }
}

exports.resolveRole = async function (guild, roleID, cache = false) {
    if (!guild || !roleID) {
        let err = new Error("Invalid parameters given.");
        console.error(err);
    } else {
        try {
            let role = await guild.roles.fetch(roleID);
            return role;
        } catch (e) {
            return null;
        }
    }
}

exports.withTyping = async function (channel, task, args) {
    if (!channel || (channel.type !== "GUILD_TEXT" && channel.type !== "GUILD_NEWS" && channel.type !== "GUILD_NEWS_THREAD" && channel.type !== "GUILD_PUBLIC_THREAD" && channel.type !== "GUILD_PRIVATE_THREAD")) {
        let err = new Error("Invalid channel to type in");
        console.error(err);
    } else {
        let rv = await task(...args).catch(console.error);
        return rv;
    }
}

exports.searchMembers = async function (members, query) {

    query = query.toLowerCase();
    members = Array.from(members.values());

    let member;
    let memberResults = [];

    memberResults = members.filter(m => m.user.tag.toLowerCase() == query.toLowerCase().replace(/^@/, ''));
    if (memberResults.length < 1) {
        memberResults = members.filter(m => m.user.username.toLowerCase() == query);
        if (memberResults.length < 1) {
            memberResults = members.filter(m => m.user.username.toLowerCase().includes(query));
        }
        if (memberResults.length > 1) {
            memberResults = memberResults.sort((a, b) => {
                return a.user.username.localeCompare(b.user.username);
            }).sort((a, b) => {
                let diff = a.user.username.length - b.user.username.length;
                if (diff == 0) return a.user.username.indexOf(query.toLowerCase()) - b.user.username.indexOf(query.toLowerCase());
                else return diff;
            }).filter(m => m.user.username.length <= memberResults[0].user.username.length);
        }
    }

    if (memberResults.length < 1) {
        memberResults = members.filter(m => m.nickname ? m.nickname.toLowerCase() == query : false);
        if (memberResults.length < 1) {
            memberResults = members.filter(m => m.nickname ? m.nickname.toLowerCase().includes(query) : false);
        }
        if (memberResults.length > 1) {
            memberResults = memberResults.sort((a, b) => {
                return a.nickname.localeCompare(b.nickname);
            }).sort((a, b) => {
                let diff = a.nickname.length - b.nickname.length;
                if (diff == 0) return a.nickname.indexOf(query.toLowerCase()) - b.nickname.indexOf(query.toLowerCase());
                else return diff;
            }).filter(m => m.nickname.length <= memberResults[0].nickname.length);
        }
    }

    if (memberResults.length > 1) {
        let ranks = await getAllGuildXp(memberResults[0].guild.id);
        memberResults = memberResults.sort((a, b) => {
            let aMem = ranks.find(x => x.userID == a.id);
            let bMem = ranks.find(x => x.userID == b.id);
            aXp = aMem ? aMem.xp : 0; bXp = bMem ? bMem.xp : 0;
            return bXp - aXp;
        })
    }

    [member] = memberResults;
    return member;

}

exports.progressBar = function (value, maxValue) {
    const percentage = value / maxValue;
    const progress = Math.round((10 * percentage)); 
    const emptyProgress = 10 - progress; 

    const progressText = '<:progress:955692017881600000>'.repeat(progress); 
    const emptyProgressText = '<:empty:955691748942831637>'.repeat(emptyProgress);
    const percentageText = Math.round(percentage * 100) + '%';

    var bar = '<:start:955691749324517400>' + progressText + emptyProgressText;
    if (percentage >= 90) bar += `<:end:955691938105946134> ${percentageText}`; else bar += `<:end:955691748955410483> ${percentageText}`;
    return bar;
}

exports.embedPages = async function ({ channel, author }, pages) {
    const backId = 'back'
    const forwardId = 'forward'
    const backButton = new MessageButton({
        style: 'SECONDARY',
        emoji: '917540193878310972',
        customId: backId
    });
    const forwardButton = new MessageButton({
        style: 'SECONDARY',
        emoji: '917540193861529650',
        customId: forwardId
    });

    let page = 0;
    if (pages.length < 2) {
        await channel.send({
            embeds: [pages[page]]
        })
        return;
    };

    const embedMessage = await channel.send({
        embeds: [pages[page]],
        components: [new MessageActionRow({ components: [forwardButton] })]
    })

    const collector = embedMessage.createMessageComponentCollector({
        filter: ({ user }) => user.id === author.id
    });

    let currentIndex = 0;
    collector.on('collect', async interaction => {
        // Increase/decrease index
        interaction.customId === backId ? (currentIndex -= 1) : (currentIndex += 1);
        // Respond to interaction by updating message with new embed
        await interaction.update({
            embeds: [pages[currentIndex]],
            components: [
                new MessageActionRow({
                    components: [
                        // back button if it isn't the start
                        ...(currentIndex ? [backButton] : []),
                        // forward button if it isn't the end
                        ...(currentIndex + 1 < pages.length ? [forwardButton] : [])
                    ]
                })
            ]
        });
    });
}

exports.contentPages = async function ({ channel, author }, pages) {
    const backId = 'back'
    const forwardId = 'forward'
    const backButton = new MessageButton({
        style: 'SECONDARY',
        emoji: '917540193878310972',
        customId: backId
    });
    const forwardButton = new MessageButton({
        style: 'SECONDARY',
        emoji: '917540193861529650',
        customId: forwardId
    });

    let page = 0;
    if (pages.length < 2) {
        await channel.send({
            content: `${[pages[page]]}`
        })
        return;
    };

    const contentMessage = await channel.send({
        content: `${[pages[page]]}`,
        components: [new MessageActionRow({ components: [forwardButton] })]
    })

    const collector = contentMessage.createMessageComponentCollector({
        filter: ({ user }) => user.id === author.id
    });

    let currentIndex = 0;
    collector.on('collect', async interaction => {
        // Increase/decrease index
        interaction.customId === backId ? (currentIndex -= 1) : (currentIndex += 1);
        await interaction.update({
            content: `${[pages[currentIndex]]}`,
            components: [
                new MessageActionRow({
                    components: [
                        // back button if it isn't the start
                        ...(currentIndex ? [backButton] : []),
                        // forward button if it isn't the end
                        ...(currentIndex + 1 < pages.length ? [forwardButton] : [])
                    ]
                })
            ]
        });
    });
}

exports.embedBuilder = async function (input) {
    if (!_validate(input)) {
        return false;
    }

    const embed = new MessageEmbed();
    const json = typeof input === 'string' ? JSON.parse(input) : typeof input === 'object' ? input : null;

    embed.content = null;

    if (json.hasOwnProperty('author')) {
        if (typeof json.author === 'string') {
            embed.setAuthor({name: json.author || 'invalid-author'});
        } else if (_validate(JSON.stringify(json.author))) {
            embed.setAuthor({name: json.author.name || 'invalid-author', iron_url: json.author.icon_url || null, url: json.author.url || null});
        }
    }

    if (json.hasOwnProperty('color')) {
        if (typeof json.color !== 'object') {
            embed.setColor(json.color);
        }
    }

    if (json.hasOwnProperty('description')) {
        if (typeof json.description === 'string') {
            embed.setDescription(json.description || '-');
        }
    }

    if (json.hasOwnProperty('fields')) {
        if (Array.isArray(json.fields)) {
            json.fields.forEach(field => {
                embed.addField(field.name || '-', field.value || '-', field.inline || null);
            });
        }
    }

    if (json.hasOwnProperty('footer')) {
        if (typeof json.footer === 'string') {
            embed.setFooter(json.footer || 'invalid-footer');
        } else if (_validate(JSON.stringify(json.footer))) {
            embed.setFooter(json.footer.text || 'invalid-footer', json.footer.icon_url || null);
        }
    }

    if (json.hasOwnProperty('image')) {
        if (typeof json.image === 'string') {
            embed.setImage(json.image);
        }
    }

    if (json.hasOwnProperty('thumbnail')) {
        if (typeof json.thumbnail === 'string') {
            embed.setThumbnail(json.thumbnail);
        }
    }

    if (json.hasOwnProperty('title')) {
        if (typeof json.title === 'string') {
            embed.setTitle(json.title);
        }
    }

    if (json.hasOwnProperty('url')) {
        if (typeof json.title === 'string') {
            embed.setURL(json.url);
        }
    }

    if (json.hasOwnProperty('plainText')) {
        if (typeof json.content === 'string') {
            embed.content = json.content;
        }
    }

    return embed;
}

function _validate(string) {
    return string && /^[\],:{}\s]*$/.test(string.replace(/\\["\\\/bfnrtu]/g, '@')
        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''));
}

exports.confirmEmbed = function (text) {
    const embed = new MessageEmbed()
        .setDescription(`<:success:917540029264445480> ${text}`)
        .setColor(0x27AE60);
    return embed;
}

exports.denyEmbed = function (text) {
    const embed = new MessageEmbed()
        .setDescription(`<:failure:917540029537062912> ${text}`)
        .setColor(0xE74C3C);
    return embed;
}

exports.errorEmbed = function (text) {
    const embed = new MessageEmbed()
        .setDescription(`<:error:917540029277040651> ${text}`)
        .setColor(0xF39C12);
    return embed;
}

exports.helpBuilder = async function (input, prefix) {
    const embed = new MessageEmbed();
    let embedColor = await getImgColours(bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0xfcfcfc;
    embed.setColor(embedColorFinal);
    embed.setDescription(`I'll get to this later lol`);
    return embed;
    /*switch (input) {
        case "starboard":
        case "sb":
            embed.setAuthor(`Starboard`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional\nAliases: **sb**`);
            embed.addFields(
                { name: `${prefix}starboard number [number]`, value: 'Sets the required amount of :star:s to be on the starboard.' },
                { name: `${prefix}starboard channel [channel or channel ID]`, value: 'Sets the starboard channel.' },
                { name: `${prefix}starboard toggle`, value: 'Toggles the starboard.' }
            );
            return embed;

        case "commands":
        case "cmd":
            embed.setAuthor(`Custom commands`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional\nAliases: **command** **cmds** **cmd**`);
            embed.addFields(
                { name: `${prefix}commands add [command name] (embed) [content]`, value: 'Adds a custom command under the given command name, to respond with the provided content when used.' },
                { name: `${prefix}commands remove/delete [command name]`, value: 'Removes a command under the given command name.' },
                { name: `${prefix}commands rename [command name] [new name]`, value: 'Renames a command under the given command name to the given new name.' },
                { name: `${prefix}commands edit [command name] (embed) [new content]`, value: 'Edits a command under the given command name\'s content.' },
                { name: `${prefix}commands list`, value: 'Shows a list of all the commands in the server.' },
                { name: `${prefix}commands list raw`, value: 'Sends a JSON file with all the commands in the server.' },
                { name: `${prefix}commands search [search]`, value: 'Shows a list of commands matching the given command query.' },
                { name: `${prefix}commands toggle`, value: 'Toggles the ability to use custom commands on and off. (on by default)' }
            );
            return embed;

        case "emoji":
        case "emoji":
            embed.setAuthor(`Emoji`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional\nAliases: **emojis**`);
            embed.addFields(
                { name: `${prefix}emoji [:emoji:]`, value: 'Shows a custom emoji in full size, and its file size.' },
                { name: `${prefix}emoji list`, value: 'Lists all the custom emojis in the server.' },
                { name: `${prefix}emoji search [search]`, value: 'Lists all the custom emojis matching your query.' }
            );
            return embed;

        case "games":
        case "game":
            embed.setAuthor(`Games`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}cleverbot/cb [text] or @MushroomBot`, value: 'Talk to the bot.' },
                { name: `${prefix}slots`, value: 'Play slots.' },
                { name: `${prefix}quiz boolean/multiple easy/medium/hard`, value: 'Play a game of trivia.' },
                { name: `${prefix}connectfour/cf [@user]`, value: 'Play a game of connect four with someone.' },
                { name: `${prefix}tictactoe/ttt [@user]`, value: 'Play a game of tic tac toe with someone.' }
            );
            return embed;

        case "information":
        case "info":
            embed.setAuthor(`Information`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}userinfo/uinfo/user/memberinfo/member (@user/user ID)`, value: 'Get information on a user or yourself.' },
                { name: `${prefix}avatar/ava (@user/user ID)`, value: 'View your or someone else\'s avatar.' },
                { name: `${prefix}serverinfo/sinfo/server/guildinfo/guild`, value: 'Get information about the server.' },
                { name: `${prefix}serverboosters/boosters/boosts`, value: 'View the server\'s nitro boosters.' },
                { name: `${prefix}permissions/permission/perms (@user/user ID)`, value: 'View the permsissions you or someone else has in the server.' },
                { name: `${prefix}roleinfo/rinfo/role [@role/role name/role ID]`, value: 'View information on a role.' }
            );
            return embed;

        case "lastfm":
        case "last.fm":
        case "last fm":
        case "fm":
            embed.setAuthor(`Last.fm`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}lastfm/fm`, value: 'Shows basic account info.' },
                { name: `${prefix}lastfm/fm set [username]`, value: 'Saves your last.fm username for future use.' },
                { name: `${prefix}(lastfm/fm) nowplaying (last.fm user)`, value: 'Shows the song currently playing.' },
                { name: `${prefix}lastfm/fm recent`, value: 'Shows the most recent songs played.' },
                { name: `${prefix}(lastfm/fm) toptracks [week|month|3month|6month|year|alltime]`, value: 'Shows the top tracks of a certain time period.' },
                { name: `${prefix}(lastfm/fm) topartists [week|month|3month|6month|year|alltime]`, value: 'Shows the top artists of a certain time period.' },
                { name: `${prefix}(lastfm/fm) topalbums [week|month|3month|6month|year|alltime]`, value: 'Shows the top albums of a certain time period.' },
                { name: `${prefix}(lastfm/fm) whoknows/wk [artist]`, value: 'Shows the top listeners for the specified artist.' },
                { name: `${prefix}(lastfm/fm) chart [week|month|3month|6month|year|alltime] [artists/tracks/albums]`, value: 'Shows a collage of your top artists/track/albums of a certain time period.' }
            );
            return embed;

        case "levels":
        case "lvl":
            embed.setAuthor(`Levels`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}leaderboard`, value: 'Shows the level leaderboard.' },
                { name: `${prefix}level/rank (@user/user ID)`, value: 'Shows the level of you or someone else.' },
                { name: `${prefix}rewards add [level] [role name]`, value: 'Adds a level reward role.' },
                { name: `${prefix}rewards remove [level] [role name]`, value: 'Removes a level reward role.' },
                { name: `${prefix}rewards list`, value: 'Lists all the reward roles.' }
            );
            return embed;

        case "moderation":
        case "mod":
            embed.setAuthor(`Moderation`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}autorole set [rolename]`, value: 'Sets a role to be added to a user when they join the server.' },
                { name: `${prefix}ban [@user or user id {up to 5 members}] (reason)`, value: 'Bans a user/users with an optional reason.' },
                { name: `${prefix}unban [@user or user id {up to 5 members}] (reason)`, value: 'Unbans a user/users with an optional reason.' },
                { name: `${prefix}kick [@user or user id {up to 5 members}] (reason)`, value: 'Kicks a user/users with an optional reason.' },
                { name: `${prefix}mute [@user or user id {up to 5 members}] (reason)`, value: 'Mutes a user/users with an optional reason.' },
                { name: `${prefix}muterole set [role/role name/role ID]`, value: 'Sets the role to be used by the mute command. If a role with the provided name does not exist, a role will be created.' },
                { name: `${prefix}muterole update`, value: 'Updates all channels to work with the mute role.' },
                { name: `${prefix}bannedword add [word]`, value: 'Adds a banned word to the server\'s filter system.' },
                { name: `${prefix}bannedword remove [word]`, value: 'Removes a banned word to the server\'s filter system.' },
                { name: `${prefix}bannedword list`, value: 'Lists the banned words on the server\'s filter system.' }
            );
            return embed;

        case "management":
            embed.setAuthor(`Management`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}prefix set [prefix]`, value: 'Sets the server prefix.' },
                { name: `${prefix}greeter channel set [#channel or channel ID]`, value: 'Sets the channel the bot should greeter new members in.' },
                { name: `${prefix}greeter message set (embed) [message]`, value: 'Sets the message the bot says when a new member joins.' },
                { name: `${prefix}messagelogs/msglogs channel set [#channel or channel ID]`, value: 'Sets the message logs channel.' },
                { name: `${prefix}punishments channel set [#channel or channel ID]`, value: 'Sets the punishment logs channel.' },
                { name: `${prefix}punishments toggle`, value: 'Toggles the punishment log.' },
                { name: `${prefix}messagelogs toggle`, value: 'Toggles the message log.' },
                { name: `${prefix}muterole set [role/role name/role ID]`, value: 'Sets the role to be used by the mute command. If a role with the provided name does not exist, a role will be created.' },
                { name: `${prefix}muterole update`, value: 'Updates all channels to work with the mute role.' }
            );
            return embed;

        case "media":
            embed.setAuthor(`Media`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}youtube [search]`, value: 'Searches youtube and returns the results.' },
                { name: `${prefix}letterboxd [search]`, value: 'Searches letterboxd and returns the results.' }
            );
            return embed;

        case "notifications":
        case "notification":
        case "noti":
        case "notifs":
        case "notif":
            embed.setAuthor(`Notifications`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional\nAliases: **notif** **noti**`);
            embed.addFields(
                { name: `${prefix}notification add (type) [word]`, value: 'Adds a keyword to be notified of when mentioned by a user in the server.' },
                { name: `${prefix}notification remove [word]`, value: 'Removes a keyword you were notified of in the server.' },
                { name: `${prefix}notification list`, value: 'DMs you a list of keywords for the server.' },
                { name: `${prefix}notification clear`, value: 'Clears all keywords you are notified of in the server.' },
                { name: `Notification types`, value: '\`STRICT\` - will only notify you for whole words, case sensitive, no plurals.\n\`NORMAL\` - will only notify you for whole words, case insensitive, includes plurals. (default)\n\`LENIENT\` - case insensitive, includes plurals, letter-number replacements.\n\`ANARCHY\` repeating characters, non-letters between characters and letter-number swaps.' }
            );
            return embed;

        case "reminders":
        case "reminder":
        case "remind":
            embed.setAuthor(`Reminders`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}remind me to [reminder] in [time]`, value: 'Sets a reminder to be sent to you through DMs in the given time.' },
                { name: `${prefix}reminder list`, value: 'Sends you a list of your reminders.' },
                { name: `${prefix}reminders clear`, value: 'Deletes all of the pending reminders you have set.' }
            );
            return embed;

        case "reputation":
        case "rep":
        case "reps":
            embed.setAuthor(`Reputation`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}rep [@user]`, value: 'Gives a user a reputation point. Your available reps to give out will be restored to 3 every day at midnight UTC.' },
                { name: `${prefix}streaks`, value: 'Shows the rep streaks you currently have with other users.' },
                { name: `${prefix}repboard`, value: 'Shows the top users in the server based on reps.' },
                { name: `${prefix}streakboard`, value: 'Shows the top users in the server based on rep streaks.' }
            );
            return embed;

        case "misc":
            embed.setAuthor(`Misc`, bot.user.displayAvatarURL({ format: 'png', dynamic: true }));
            embed.setDescription(`\`[]\` = mandatory\n\`()\` = optional`);
            embed.addFields(
                { name: `${prefix}help`, value: 'Shows the help menu.' },
                { name: `${prefix}ping`, value: 'Shows the bot\'s ping.' },
                { name: `${prefix}horoscope set`, value: 'Sets your sun sign.' },
                { name: `${prefix}horoscope today/tomorrow/yesterday`, value: 'Shows your horoscope.' },
                { name: `${prefix}horoscope list`, value: 'Lists all the signs and their dates.' },
                { name: `${prefix}embed [channel or channel ID] [embed code]`, value: 'Sends an embed message to the channel you specify.\nGet embed code from [here](https://embedbuilder.nadekobot.me/).' },
                { name: `${prefix}embed variables`, value: 'Shows the embed variables.' }
            );
            return embed;

        default:
            const { errorEmbed } = require("../functions/discord.js");
            const errEmbed = errorEmbed("Please enter a valid module.");
            return errEmbed;

    }*/

}