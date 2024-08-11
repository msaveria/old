const { MessageActionRow, MessageButton, MessageEmbed, Discord } = require("discord.js");
const { checkPermissions, embedPages, withTyping, confirmEmbed, denyEmbed, errorEmbed, embedBuilder, helpBuilder } = require("../functions/discord.js");

const database = require("../db_queries/commands_db.js");
const reservedCommands = require("../resources/JSON/commands.json");
const serverSettings = require("../utils/server_settings.js");
const { trimArgs } = require("../functions/functions.js");

async function cmdCheck(message, commandName) {
    let cmd = await database.getCommand(message.guild.id, commandName);
    if (cmd) {
        if (cmd.startsWith('embed')) {
            let cmd2 = cmd.replace('embed', '');
            const embed = await embedBuilder(cmd2);
            message.channel.send({ embeds: [embed] });
        } else {
            message.channel.send(cmd);
        }
    }
}

exports.onCommand = async function (message, args) {

    let { channel, member, guild } = message;

    let cmdsOn = serverSettings.get(message.guild.id, "commandsOn");
    if (cmdsOn) {
        cmdCheck(message, args[0]);
    }

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('commands' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "commands":
        case "command":
        case "cmds":
        case "cmd":
            switch (args[1]) {
                case "add":
                    if (checkPermissions(member, ["MANAGE_GUILD", "MANAGE_MESSAGES"])) {
                        if (cmdsOn)
                            withTyping(channel, addCommand, [message, args]);
                        break;
                    }
                case "remove":
                case "delete":
                    if (checkPermissions(member, ["MANAGE_GUILD", "MANAGE_MESSAGES"])) {
                        if (cmdsOn)
                            withTyping(channel, removeCommand, [message, args[2]]);
                        break;
                    }
                case "rename":
                    if (checkPermissions(member, ["MANAGE_GUILD", "MANAGE_MESSAGES"])) {
                        if (cmdsOn)
                            withTyping(channel, renameCommand, [message, args]);
                        break;
                    }
                case "edit":
                    if (checkPermissions(member, ["MANAGE_GUILD", "MANAGE_MESSAGES"])) {
                        if (cmdsOn)
                            withTyping(channel, editCommand, [message, args]);
                        break;
                    }
                case "list":
                    switch (args[2]) {
                        default:
                            if (cmdsOn)
                                withTyping(channel, listCommands, [message]);
                            break;
                    }
                    break;
                case "search":
                    if (cmdsOn)
                        withTyping(channel, searchCommands, [message, args[2]]);
                    break;
                case "toggle":
                    if (checkPermissions(member, ["MANAGE_GUILD", "MANAGE_CHANNELS"]))
                        withTyping(channel, toggleCommands, [message]);
                    break;
                case "help":
                default:
                    if (cmdsOn)
                        prefix = await serverSettings.get(message.guild.id, "prefix");
                    var embed = await helpBuilder("commands", prefix);
                    channel.send(embed);
                    break;
            }
            break;
    }

}

async function addCommand(message, args) {

    if (args.length < 3) {
        const embed = errorEmbed("Please provide a command name and text and/or file.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let files = [...message.attachments.values()];
    if (args.length < 4 && files.length < 1) {
        const embed = errorEmbed("Please provide text or an uploaded file for a command response.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let commandName = args[2].toLowerCase();
    if (commandName.length > 30) {
        const embed = errorEmbed("Command names cannot be more than 20 characters.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (!/^[a-z0-9]+$/.test(commandName)) {
        const embed = denyEmbed("Please use A-Z and 0-9 characters only.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (reservedCommands.list.includes(commandName)) {
        const embed = denyEmbed("This is a bot command. Please use a different name.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let text = trimArgs(args, 3, message.content);
    let fileUrl = files[0] ? files[0].url : '';
    if (fileUrl) text = [text, fileUrl].join('\n');

    let added = await database.addCommand(message.guild.id, commandName, text);
    if (added) {
        const embed = confirmEmbed(`Command \`${commandName}\` was added.`);
        embed.addField(`Content`, text);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = denyEmbed(`A command with the name \`${commandName}\` already exists.`);
        message.channel.send({ embeds: [embed] });
    }
}

async function removeCommand(message, commandName) {

    if (!commandName) {
        const embed = errorEmbed("Please provide a command name to remove.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let removed = await database.removeCommand(message.guild.id, commandName);
    if (removed) {
        const embed = confirmEmbed(`Command \`${commandName}\` was removed.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = denyEmbed(`No command named \`${commandName}\` exists.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function renameCommand(message, args) {

    if (args.length < 3) {

        return;
    }

    if (args.length < 4) {
        const embed = errorEmbed("Please provide a new name for the command.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let commandName = args[2].toLowerCase();
    let newName = args[3].toLowerCase();

    if (!/^[a-z0-9]+$/.test(newName)) {
        const embed = denyEmbed(`\`${newName}\` contains invalid characters \`${newName.replace(/([a-z0-9]+)/g, '')}\`, please use characters A-Z and 0-9.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (reservedCommands.list.includes(newName)) {
        const embed = denyEmbed(`\`${newName}\` is a reserved command name, please use another name.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let command = await database.getCommand(message.guild.id, commandName);
    if (!command) {
        const embed = errorEmbed(`\`${newName}\` does not exist.`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let renamed = await database.renameCommand(message.guild.id, commandName, newName);
    if (renamed) {
        const embed = confirmEmbed(`\`${commandName}\` was renamed to \`${newName}\`.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = denyEmbed(`\`${newName}\` already exists.`);
        message.channel.send({ embeds: [embed] });
    }

}

async function editCommand(message, args) {

    if (args.length < 3) {
        const embed = errorEmbed("Please provide a command name and text and/or file.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let files = [...message.attachments.values()];
    if (args.length < 4 && files.length < 1) {
        const embed = errorEmbed("Please provide text or an uploaded file for a command response.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let commandName = args[2].toLowerCase();
    if (!/^[a-z0-9]+$/.test(commandName)) {
        const embed = denyEmbed("This command name contains invalid characters, please use characters A-Z and 0-9.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (reservedCommands.list.includes(commandName)) {
        const embed = denyEmbed("This is a reserved command name, please use another name.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let text = trimArgs(args, 3, message.content);

    let fileUrl = files[0] ? files[0].url : '';
    text = [text, fileUrl].join('\n');

    let edited = await database.editCommand(message.guild.id, commandName, text);
    if (edited) {
        const embed = confirmEmbed(`Command \`${commandName}\` was edited.`);
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = denyEmbed(`No command with the name \`${commandName}\` was found.`);
        message.channel.send({ embeds: [embed] });
    }
}

async function listCommands(message) {

    let { guild } = message;
    let p = guild.name[guild.name.length - 1].toLowerCase() == 's' ? "'" : "'s";
    let commands = await database.getCommands(guild.id);
    let commandNames = commands.map(x => x.command);
    if (commandNames.length < 1) {
        const embed = errorEmbed("There are no commands added to this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    let prefix = serverSettings.get(message.guild.id, 'prefix');
    commandString = commandNames.sort((a, b) => a.localeCompare(b)).map(x => prefix + x).join('\n');

    let descriptions = [];
    while (commandString.length > 2048 || commandString.split('\n').length > 25) {
        let currString = commandString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        commandString = commandString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(commandString);

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${message.guild.name + p} custom commands`, icon_url: message.guild.iconURL()
            },
            description: desc,
            color: 0x303135,
            footer: {
                text: `${commandNames.length.toLocaleString()} total • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function searchCommands(message, query) {

    if (!query) {
        const embed = errorEmbed("Please provide a search query.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    if (query.length > 30) {
        const embed = errorEmbed("Command names may not exceed 30 characters in length.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let { guild } = message;
    let commands = await database.getCommands(guild.id);
    let commandNames = commands.map(x => x.command);

    if (commandNames.length < 1) {
        const embed = errorEmbed("There are no commands added to this server.");
        message.channel.send({ embeds: [embed] });
        return;
    }


    if (commandNames.length < 1) {
        const embed = errorEmbed(`No results were found searching for "${query}".`);
        message.channel.send({ embeds: [embed] });
        return;
    }

    let prefix = serverSettings.get(message.guild.id, 'prefix');
    let commandString = commandNames.sort((a, b) => a.localeCompare(b)).sort((a, b) => {
        let diff = a.length - b.length;
        if (diff == 0) return a.indexOf(query.toLowerCase()) - b.indexOf(query.toLowerCase());
        else return diff;
    }).map(x => prefix + x).join('\n');

    let descriptions = [];
    while (commandString.length > 2048 || commandString.split('\n').length > 25) {
        let currString = commandString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        commandString = commandString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(commandString);

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `Commands for "${query}"`, icon_url: message.guild.iconURL()
            },
            description: desc,
            color: 0x1a1a1a,
            footer: {
                text: `${commandNames.length} results • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function toggleCommands(message) {

    let tog = await serverSettings.toggle(message.guild.id, "commandsOn");
    if (tog) {
        const embed = confirmEmbed(`Custom commands turned **on**.`);
        message.channel.send({ embeds: [embed] });
        return;
    } else {
        const embed = confirmEmbed(`Custom commands turned **off**.`);
        message.channel.send({ embeds: [embed] });
        return;
    }
}
