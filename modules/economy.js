const { MessageEmbed } = require("discord.js");
const { checkPermissions, embedPages, resolveUser, withTyping, errorEmbed, confirmEmbed, denyEmbed } = require("../functions/discord.js");
const { eco } = require("../bot.js");

const { getImgColours } = require("../functions/colours.js");
const serverSettings = require("../utils/server_settings.js");
const database = require("../db_queries/economy_db.js");

exports.onCommand = async function (message, args) {

    let { channel, member, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('economy' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "eco":
            switch (args[1]) {
                case "set":
                    switch (args[2]) {
                        case "emoji":
                            if (checkPermissions(member, ["MANAGE_GUILD"]))
                                withTyping(channel, setEmoji, [message, args[3]]);
                            break;
                        case "name":
                            if (checkPermissions(member, ["MANAGE_GUILD"]))
                                withTyping(channel, setName, [message, args[3]]);
                            break;
                        case "symbol":
                            if (checkPermissions(member, ["MANAGE_GUILD"]))
                                withTyping(channel, setSymbol, [message, args[3]]);
                            break;
                    }
            }
            break;

        case "daily":
            withTyping(channel, daily, [message]);
            break;

        case "work":
            withTyping(channel, work, [message]);
            break;

        case "weekly":
            withTyping(channel, weekly, [message]);
            break;

        case "shop":
            switch (args[1]) {
                case "set":
                    switch (args[2]) {
                        case "add":
                            if (checkPermissions(member, ["MANAGE_GUILD"]))
                                withTyping(channel, addShop, [message, args.slice(3)]);
                            break;
                        case "remove":
                            if (checkPermissions(member, ["MANAGE_GUILD"]))
                                withTyping(channel, removeShop, [message, args.slice(3)]);
                            break;
                    }
                    break;
                case "list":
                default:
                    withTyping(channel, shop, [message]);
                    break;
            }
            break;

        case "buy":
            withTyping(channel, buy, [message, args.slice(1)]);
            break;

        case "use":
            withTyping(channel, use, [message, args.slice(1)]);
            break;

        case "inv":
            withTyping(channel, inventory, [message]);
            break;
    }

}

async function setName(message, name) {

    let { guild } = message;

    if (!name) {
        const embed = errorEmbed("Please provide a currency name.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    database.setName(guild.id, name);
    const embed = confirmEmbed(`Currency name set to \`${name}\``);
    message.channel.send({ embeds: [embed] });

}

async function setEmoji(message, emoji) {

    let { guild } = message;

    if (!emoji) {
        const embed = errorEmbed("Please provide a custom or unicode emoji.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let id = emoji.match(/<(a)?:([^<>:]+):(\d+)>/i) || emoji.match(/\p{Emoji_Presentation}/gu);
    if (!id) return message.channel.send({ embeds: [errorEmbed(`Please provide a custom or unicode emoji.`)] });
    if (id.length > 1) id = id[0];
    database.setEmoji(guild.id, emoji);
    const embed = confirmEmbed(`Currency emoji set to ${id}.`);
    message.channel.send({ embeds: [embed] });

}

async function setSymbol(message, symbol) {

    let { guild } = message;

    if (!symbol) {
        const embed = errorEmbed("Please provide a symbol.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let id = symbol.match(/\p{Sc}|\p{P}/gu);
    if (!id) return message.channel.send({ embeds: [errorEmbed(`Please provide a symbol.`)] });
    if (id.length > 1) id = id[0];
    database.setSymbol(guild.id, symbol);
    const embed = confirmEmbed(`Currency symbol set to \`${id}\`.`);
    message.channel.send({ embeds: [embed] });

}

async function daily(message) {

    let user = await resolveUser(message.author.id);

    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    const daily = eco.rewards.daily(message.author.id, message.guild.id)
    let author = await message.guild.members.fetch(message.author.id);
    if (!daily.status) {
        let embed = new MessageEmbed({
            author: { name: `Daily ${settings.currencyName}`, icon_url: user.displayAvatarURL({ format: 'png', dynamic: false, size: 32 }) },
            color: 0xE74C3C,
            description: `You have already claimed your daily ${settings.currencyName}...`,
            footer: { text: `You can claim your next daily in ${daily.value.hours} hours, ${daily.value.minutes} minutes and ${daily.value.seconds} seconds.` }
        });
        return message.channel.send({ embeds: [embed] });
    }

    let embed = new MessageEmbed({
        author: { name: `Daily ${settings.currencyName}`, icon_url: user.displayAvatarURL({ format: 'png', dynamic: false, size: 32 }) },
        color: author.displayColor || 0x303135,
        description: `You have recieved your daily reward of ${settings.currencySymbol}**${daily.reward}** ${settings.currencyName} ${settings.currencyEmoji}!`,
        footer: { text: `You can claim your next daily in 24 hours.` }
    });
    return message.channel.send({ embeds: [embed] });

}

async function work(message) {

    let user = await resolveUser(message.author.id);

    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    const work = eco.rewards.work(message.author.id, message.guild.id)
    let author = await message.guild.members.fetch(message.author.id);
    if (!work.status) {
        let embed = new MessageEmbed({
            author: { name: `Work ${settings.currencyName}`, icon_url: user.displayAvatarURL({ format: 'png', dynamic: false, size: 32 }) },
            color: 0xE74C3C,
            description: `You have already worked this hour...`,
            footer: { text: `You can claim work again in ${work.value.minutes} minutes and ${work.value.seconds} seconds.` }
        });
        return message.channel.send({ embeds: [embed] });
    }

    let embed = new MessageEmbed({
        author: { name: `Work ${settings.currencyName}`, icon_url: user.displayAvatarURL({ format: 'png', dynamic: false, size: 32 }) },
        color: author.displayColor || 0x303135,
        description: `You have recieved your work reward of ${settings.currencySymbol}**${work.reward}** ${settings.currencyName} ${settings.currencyEmoji}!`,
        footer: { text: `You can work again in 1 hour.` }
    });
    return message.channel.send({ embeds: [embed] });

}

async function weekly(message) {

    let user = await resolveUser(message.author.id);

    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    const weekly = eco.rewards.weekly(message.author.id, message.guild.id);
    let author = await message.guild.members.fetch(message.author.id);
    if (!weekly.status) {
        let embed = new MessageEmbed({
            author: { name: `Weekly ${settings.currencyName}`, icon_url: user.displayAvatarURL({ format: 'png', dynamic: false, size: 32 }) },
            color: 0xE74C3C,
            description: `You have already claimed your weekly ${settings.currencyName}...`,
            footer: { text: `You can claim your next weekly in ${weekly.value.days} hours, ${weekly.value.hours} hours, ${weekly.value.minutes} minutes and ${weekly.value.seconds} seconds.` }
        });
        return message.channel.send({ embeds: [embed] });
    }

    let embed = new MessageEmbed({
        author: { name: `Weekly ${settings.currencyName}`, icon_url: user.displayAvatarURL({ format: 'png', dynamic: false, size: 32 }) },
        color: author.displayColor || 0x303135,
        description: `You have recieved your weekly reward of ${settings.currencySymbol}**${weekly.reward}** ${settings.currencyName} ${settings.currencyEmoji}!`,
        footer: { text: `You can claim your next weekly in 7 days.` }
    });
    return message.channel.send({ embeds: [embed] });

}

async function addShop(message, args) {

    let name = args[0].toString();
    if (!name) return message.channel.send({ embeds: [errorEmbed(`Please provide a name for the item.`)] });
    let price = args[1];
    if (typeof price === 'number') return message.channel.send({ embeds: [errorEmbed(`Please provide a numerical price for **${name}**.`)] });
    let roleName = args[2];
    let role = message.guild.roles.cache.find(role => role.name.toUpperCase() == roleName.toUpperCase());
    if (!role) {
        const embed = errorEmbed("Please provide a valid role for the shop.")
        message.channel.send({ embeds: [embed] });
        return;
    }

    const options = {
        itemName: name,
        price: price,
        message: `You have set your role to ${role}.`,
        description: `Unlocks the ${role} role.`,
        maxAmount: 1,
        role: role.id
    };

    const shop = eco.shop.add(message.guild.id, options);
    if (!shop.id) {
        return message.channel.send({ embeds: [errorEmbed(`Error adding item to the shop. Please try again.`)] });
    } else {
        return message.channel.send({ embeds: [confirmEmbed(`Successfully added item to the shop!\`\`\`Shop ID: ${shop.id}\nName: ${shop.itemName}\nPrice: ${shop.price.toLocaleString()}\nRole: ${role.name}\`\`\``)] });
    }

}

async function removeShop(message, args) {

    let id = args[0];
    if (!id) return message.channel.send({ embeds: [errorEmbed(`Please provide the item ID of the item you would like to remove.`)] });

    const shop = eco.shop.removeItem(id, message.guild.id);
    if (!shop) {
        return message.channel.send({ embeds: [errorEmbed(`Error remove item to the shop. Please check the item ID.`)] });
    } else {
        return message.channel.send({ embeds: [confirmEmbed(`Successfully removed item **${id}** from the shop!`)] });
    }

}

async function shop(message) {

    const shop = eco.shop.list(message.guild.id);
    if (!shop || shop.length == 0) {
        return message.channel.send({ embeds: [errorEmbed(`There are no items in the shop.`)] });
    }

    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }

    settings = settings[0];
    let shopString = ``
    let prefix = serverSettings.get(message.guild.id, 'prefix');
    shopString = shop.map(x => `**${x.id}.** \`${prefix}buy ${x.itemName}\` - ${settings.currencySymbol}${x.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${settings.currencyName}\n*${x.description}*`).join('\n\n');

    let descriptions = [];
    while (shopString.length > 2048 || shopString.split('\n').length > 24) {
        let currString = shopString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 24; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        shopString = shopString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(shopString);

    let embedColor = await getImgColours(message.guild.iconURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    let p = message.guild.name[message.guild.name.length - 1].toLowerCase() == 's' ? "'" : "'s";

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${message.guild.name + p}\nShop`,
                iconURL: message.guild.iconURL({ format: 'png', dynamic: true })
            },
            description: desc,
            color: embedColorFinal,
            footer: {
                text: `Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function buy(message, args) {

    let search = args[0];
    const list = eco.shop.list(message.guild.id);
    if (!list) return message.channel.send({ embeds: [errorEmbed(`There are no items in the shop.`)] });
    let item = list.filter(x => x.itemName == search);
    if (item.length < 1) return message.channel.send({ embeds: [errorEmbed(`There is no **${search}** in the shop.`)] });
    item = item[0];
    const balance = eco.balance.fetch(message.author.id, message.guild.id);
    if (balance < item.price) return message.channel.send({ embeds: [denyEmbed(`You do not have enough money to buy **${item.itemName}**.`)] });
    const buy = eco.shop.buy(item.id, message.author.id, message.guild.id);

    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];

    if (buy == false) return message.channel.send({ embeds: [errorEmbed(`There is no **${search}** in the shop.`)] });
    else if (buy == 'max') return message.channel.send({ embeds: [denyEmbed(`You have already bought **${item.itemName}**.`)] });
    else if (buy == true) return message.channel.send({ embeds: [confirmEmbed(`You have bought **${item.itemName}** for ${settings.currencySymbol}${item.price} ${settings.currencyName} ${settings.currencyEmoji}.`)] });

}

async function use(message, args) {

    let search = args[0];
    const list = eco.inventory.fetch(message.author.id, message.guild.id);
    if (!list) return message.channel.send({ embeds: [errorEmbed(`You do not have any roles from the shop.`)] });
    let item = list.filter(x => x.itemName == search);
    if (item.length < 1) return message.channel.send({ embeds: [errorEmbed(`You have not bought **${search}** from the shop.`)] });
    item = item[0];
    let roleAdd = message.guild.roles.cache.find(x => x.id == item.role);

    let roleArray = [];
    for (let role of list) {
        let roleRemove = message.guild.roles.cache.find(x => x.id == role.role);
        roleArray.push(roleRemove);
    }

    await message.member.roles.remove(roleArray);
    await message.member.roles.add(roleAdd);
    return message.channel.send({ embeds: [confirmEmbed(`You have switched your role to **${roleAdd}**.`)] });
}

async function inventory(message) {

    let author = await message.guild.members.fetch(message.author.id);

    const list = eco.inventory.fetch(message.author.id, message.guild.id);
    if (!list || list.length == 0) return message.channel.send({ embeds: [errorEmbed(`You do not have any roles from the shop.`)] });

    let roleArray = [];
    for (let roles of list) {
        let role = message.guild.roles.cache.find(x => x.id == roles.role);
        roleArray.push(role);
    }

    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];

    let shopString = roleArray.map(x => `${x} \`(${isDefault(x.color)})\``).join('\n');

    let descriptions = [];
    while (shopString.length > 2048 || shopString.split('\n').length > 25) {
        let currString = shopString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        shopString = shopString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(shopString);

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${message.author.username}\nInventory`,
                iconURL: message.author.displayAvatarURL({ format: 'png', dynamic: false })
            },
            description: desc,
            color: author.displayColor || 0x303135,
            footer: {
                text: `Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

function isDefault(color) {
    var decimal = color;
    var hex = '#' + decimal.toString(16).toUpperCase();
    if (hex === '#0') {
        var decimal = '7289DA';
        var hex = '#7289DA';
    } else {
        var decimal = color;
        var hex = '#' + decimal.toString(16).toUpperCase();
    }
    return hex;
}