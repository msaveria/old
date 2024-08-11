const { MessageEmbed } = require("discord.js");
const { checkPermissions, embedPages, withTyping, confirmEmbed, errorEmbed, resolveMember, resolveMessage, helpBuilder } = require("../functions/discord.js");
const { bot } = require("../bot.js");

const { trimArgs } = require("../functions/functions.js");
const serverSettings = require("../utils/server_settings.js");
const { getImgColours } = require("../functions/colours.js");

const database = require("../db_queries/roles_db.js");

const messageUrlRegex = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/i;

exports.join = async function (member) {

    autorole(member)

}

exports.onCommand = async function (message, args) {

    let { channel, member, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('roles' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "autorole":
            switch (args[1]) {
                case "set":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, setAutorole, [message, args]);
                    break;
                case "toggle":
                    if (checkPermissions(member, ["MANAGE_GUILD"]))
                        withTyping(channel, toggleAutorole, [message]);
                    break;
                default:
                    message.channel.send(`Help coming soon.`);
                    break;
            }
            break;
        case "roles":
            switch (args[1]) {
                case "list":
                    withTyping(channel, roleslist, [message]);
                    break;
                case "add":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, add_role, [message, args]);
                    break;
                case "remove":
                case "delete":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, remove_role, [message, args]);
                    break;
                case "help":
                default:
                    prefix = await serverSettings.get(message.guild.id, "prefix");
                    var embed = await helpBuilder("roles", prefix);
                    channel.send(embed);
                    break;
            }
            break;
        case "contentroles":
        case "cr":
            switch (args[1]) {
                case "list":
                    withTyping(channel, croleslist, [message]);
                    break;
                case "add":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, cadd_role, [message, args]);
                    break;
                case "remove":
                case "delete":
                    if (checkPermissions(member, ["MANAGE_ROLES"]))
                        withTyping(channel, cremove_role, [message, args]);
                    break;
                case "help":
                default:
                    prefix = await serverSettings.get(message.guild.id, "prefix");
                    var embed = await helpBuilder("roles", prefix);
                    channel.send(embed);
                    break;
            }
            break;

    }
}

exports.reactionRole = async function (message, reaction, user) {
    assign_roles(message, reaction, user);
}


async function assign_roles(message, reaction, user) {
    let possible = await database.getReactionRole(message.guildId, message.channelId, message.id, reaction.emoji.id);
    if (possible.length < 1) {
        return;
    }
    let search = JSON.stringify(possible).replace(`[{"roleID":"`, ``).replace(`"}]`, ``);
    let roleSearch = message.guild.roles.cache.find(role => role.id == search);
    if (!roleSearch) {
        return;
    }
    let rr = await database.getRequiredRole(message.guildId, message.channelId, message.id, reaction.emoji.id);
    if (rr.length < 1) {
        return;
    }
    let rrsearch = JSON.stringify(rr).replace(`[{"requiredRole":"`, ``).replace(`"}]`, ``);
    let rrroleSearch = message.guild.roles.cache.find(role => role.id == rrsearch);
    let member = await resolveMember(message.guild, user.id);
    if (member.roles.cache.some(rolex => rolex.id === roleSearch.id)) {
        if (member.roles.cache.some(rolex => rolex.id === rrroleSearch.id)) {
            await member.roles.remove(roleSearch, `Adding reaction roles`);
        }
        await reaction.users.remove(user.id);
    } else {
        if (member.roles.cache.some(rolex => rolex.id === rrroleSearch.id)) {
            await member.roles.add(roleSearch, `Removing reaction roles`);
        }
        await reaction.users.remove(user.id);
    }

}

async function autorole(member) {
    let autoroleOn = serverSettings.get(member.guild.id, "autoroleOn");
    if (!autoroleOn) return;
    let role = serverSettings.get(member.guild.id, "autoroleID");
    if (!member.guild.roles.cache.has(role)) return;
    if (role) member.roles.add(role);
}

async function setAutorole(message, args) {

    if (args.length < 1) {
        const embed = errorEmbed("Please provide a role **name**.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let roles_text = trimArgs(args, 2, message.content);
    let pairs = roles_text.split(", ");
    let roles_successful = [];
    let roles_unsuccessful = [];

    pairs.forEach(roleName => {
        let role = message.guild.roles.cache.find(role => role.name == roleName);
        if (!role) {
            roles_unsuccessful.push(roleName);
            return;
        }
        roles_successful.push(role);
    });

    serverSettings.set(message.guild.id, "autoroleID", roles_successful);
    const embedUnsuccessful = errorEmbed(`I cannot find:\`\`\`\n${roles_unsuccessful.join("\n")}\`\`\`Make sure capitalization and symbols are correct!`);
    const embed = confirmEmbed(`Found ${roles_successful.join(", ")}`);
    message.channel.send({ embeds: [embed, embedUnsuccessful] });

}

async function toggleAutorole(message) {

    let tog = await serverSettings.toggle(message.guild.id, "autoroleOn");
    if (tog) {
        const embed = confirmEmbed(`Autorole turned **on**.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = confirmEmbed(`Autorole turned **off**.`);
        message.channel.send({ embeds: [embed] });
    }

}


async function roleslist(message) {

    let { guild } = message;

    let guildRoles = await guild.roles.fetch();
    guildRoles = await guildRoles.sort(function (a, b) {
        return a.rawPosition - b.rawPosition;
    });

    if (guildRoles.length < 1) {
        const embed = errorEmbed("This server has no roles.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let roleString = guildRoles.map(role => `${role} - ${role.members.size} member${role.members.size != 1 ? 's' : ''} \`${role.hexColor.toUpperCase()}\``).join('\n');

    let descriptions = [];
    while (roleString.length > 1024 || roleString.split('\n').length > 30) {
        let currString = roleString.slice(0, 1024);

        let lastIndex = 0;
        for (let i = 0; i < 30; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        roleString = roleString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(roleString);

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
                name: `${message.guild.name} Roles`, icon_url: message.guild.iconURL()
            },
            description: desc,
            color: embedColorFinal,
            footer: {
                text: `${guildRoles.length} total • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

function roles_response(responses) {
    let list = [];
    for (let [key, val] of Object.entries(responses)) {
        if (val.length > 0) list.push(`**${key}**: ${val.join(", ")}`)
    }
    return confirmEmbed(list.join("\n"));
}


async function add_role(message, args) {

    if (args.length < 4) {
        const embed = errorEmbed("Missing arguments.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let roles_text = trimArgs(args, 3, message.content);
    let pairs = roles_text.split(",");
    let errors = [];
    let roles_added = [];
    let roles_exist = [];

    let messageUrlMatch = args[2].match(messageUrlRegex);
    if (!messageUrlMatch) {
        const embed = errorEmbed("Invalid message URL provided.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let [guildID, channelID, messageID] = messageUrlMatch.slice(1);
    if (guildID != message.guild.id) {
        const embed = errorEmbed("Provided message URL must link to a message in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channel = message.guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("Provided message URL links to an invalid channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botMember = await resolveMember(message.guild, bot.user.id);
    if (!botMember) {
        const embed = errorEmbed("Error occured.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botPerms = channel.permissionsFor(botMember);
    if (!botPerms.has("VIEW_CHANNEL", true,)) {
        const embed = errorEmbed("I cannot see that channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let msg = await resolveMessage(channel, messageID);
    if (!msg) {
        const embed = errorEmbed("Provided message URL links to an invalid message.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    for (i = 0; i < pairs.length; i++) {
        let pair = pairs[i].trim();
        if (!pair.includes(":")) {
            errors.push(pair);
            continue;
        }
        let roles = pair.split(":", 5);
        let role_command = pair.match(/<(a)?:([^<>:]+):(\d+)>/i)[3];
        let role_name = roles[3];
        let required_role_search = roles[4] || `@everyone`;
        let required_role = await message.guild.roles.cache.find(role => role.name.toUpperCase() == required_role_search.toUpperCase());
        let required_role_id = required_role.id;
        let role = message.guild.roles.cache.find(role => role.name.toUpperCase() == role_name.toUpperCase());
        if (role_command.length < 1 || role_name.length < 1) {
            errors.push(role_command);
        } else if (!role || !message.guild.roles.cache.has(role.id)) {
            errors.push(role_command);
        } else {
            let role_id = role.id;
            added = await database.addRole(role_command, role_id, role_name, message.guild.id, channel.id, msg.id, required_role_id);
            if (added) {
                roles_added.push(role_name);
                await msg.react(role_command);
            } else {
                roles_exist.push(role_name);
            }
        }
    }

    message.channel.send({
        embeds: [roles_response({
            "Role commands added": roles_added,
            "Role commands already paired": roles_exist,
            "Errors": errors
        })]
    });

}

async function remove_role(message, args) {

    if (args.length < 4) {
        const embed = errorEmbed("Missing arguments.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let roles_text = trimArgs(args, 3, message.content);
    let pairs = roles_text.split(",");
    let errors = [];

    let roles_removed = [];
    let roles_nonexistent = [];

    let messageUrlMatch = args[2].match(messageUrlRegex);
    if (!messageUrlMatch) {
        const embed = errorEmbed("Invalid message URL provided.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let [guildID, channelID, messageID] = messageUrlMatch.slice(1);
    if (guildID != message.guild.id) {
        const embed = errorEmbed("Provided message URL must link to a message in this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let channel = message.guild.channels.cache.get(channelID);
    if (!channel) {
        const embed = errorEmbed("Provided message URL links to an invalid channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botMember = await resolveMember(message.guild, bot.user.id);
    if (!botMember) {
        const embed = errorEmbed("Error occured.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let botPerms = channel.permissionsFor(botMember);
    if (!botPerms.has("VIEW_CHANNEL", true,)) {
        const embed = errorEmbed("I cannot see that channel.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let msg = await resolveMessage(channel, messageID);
    if (!msg) {
        const embed = errorEmbed("Provided message URL links to an invalid message.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    for (i = 0; i < pairs.length; i++) {
        let pair = pairs[i].trim();
        if (!pair.includes(":")) {
            errors.push(pair);
            continue;
        }
        let roles = pair.split(":", 4);
        let role_command = pair.match(/<(a)?:([^<>:]+):(\d+)>/i)[3];
        let role_name = roles[3];
        let role = message.guild.roles.cache.find(role => role.name.toUpperCase() == role_name.toUpperCase());
        if (role_command.length < 1 || role_name.length < 1) {
            errors.push(role_command);
        } else if (!role || !message.guild.roles.cache.has(role.id)) {
            errors.push(role_command);
        } else {
            deleted = await database.removeRole(role_command, message.guild.id, channel.id, msg.id)
            if (deleted) {
                roles_removed.push(role_name);
                await msg.reactions.cache.get(role_command).remove()
            } else {
                roles_nonexistent.push(role_name);
            }
        }
    }

    message.channel.send({
        embeds: [roles_response({
            "Role commands deleted": roles_removed,
            "Role commands doesnt exist": roles_nonexistent,
            "Errors": errors
        })]
    });

}