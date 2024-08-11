const { MessageEmbed } = require("discord.js");
const { searchMembers, resolveMember, resolveUser, withTyping, errorEmbed, progressBar, checkPermissions } = require("../functions/discord.js");

const levels = require("../functions/levels.js");
const { parseUserID, trimArgs } = require("../functions/functions.js");

// const database = require("../db_queries/profiles_db.js");
const repsdb = require("../db_queries/reps_db.js");
const levelsdb = require("../db_queries/levels_db.js");

exports.onCommand = async function (message, args) {

    let { channel, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('profiles' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "rank":
        case "level":
            withTyping(channel, profileTemp, [message, args]);
            break;
    }
}

async function profileTemp(message, args) {

    let { author, guild, members } = message;
    let target = args[1];
    let member;
    let userID;

    if (!target) {
        userID = author.id;
    } else {
        userID = parseUserID(target);
    }

    if (!userID) {
        target = trimArgs(args, 1, message.content)
        members = await guild.members.fetch();

        member = await searchMembers(members, target)
        if (!member) {
            const embed = errorEmbed("Invalid user or user ID.");
            message.channel.send({ embeds: [embed] });
            return;
        } else {
            userID = member.id;
        }
    }

    let userReps = await repsdb.getRepProfile(userID);
    let userGlobXp = await levelsdb.getGlobalXp(userID);
    let userGuildXp = await levelsdb.getGuildXp(userID, guild.id);

    let userGlobRank = levels.globalRank(userGlobXp);
    let userGuildRank = levels.guildRank(userGuildXp);

    member = member || await resolveMember(guild, userID);
    if (!member) {
        const embed = errorEmbed("User not in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    let user = member ? member.user : await resolveUser(userID);
    let colour = member ? member.displayColor || 0x303135 : 0x303135;

    if (userGuildXp) {
        xpover = userGuildXp - userGuildRank.baseXp;
        xpunder = userGuildRank.nextXp - userGuildRank.baseXp;
    } else {
        xpover = 0;
        xpunder = 0;
    }

    let embed = new MessageEmbed({
        author: { name: `${user.tag}` },
        thumbnail: { url: user.displayAvatarURL({ dynamic: true, size: 128 }) },
        color: colour,
        fields: [
            { name: 'Rep', value: `${userReps ? userReps.rep : 0}`, inline: true },
            //{ name: 'Global level', value: `Level ${userGlobXp ? userGlobRank.lvl: 1}`, inline: true },
            //{ name: 'Global XP', value: `${userGlobXp ? (userGlobXp - userGlobRank.baseXp) : 0}/${userGlobRank.nextXp - userGlobRank.baseXp}`, inline: true },
            { name: 'Level', value: `Level ${userGuildXp ? userGuildRank.lvl.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 1}`, inline: true },
            { name: 'XP', value: `${xpover.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}/${xpunder.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, inline: true },
            { name: 'Progress', value: `${progressBar(userGuildXp - userGuildRank.baseXp, userGuildRank.nextXp - userGuildRank.baseXp)}`, inline: false }
        ],
    });

    message.channel.send({ embeds: [embed] });

}
