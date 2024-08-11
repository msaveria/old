const bot = require("../bot.js").bot;
const chalk = require('chalk');
const Discord = require("discord.js");
const entities = require('entities');
const { createCanvas, loadImage } = require("canvas");
const TikTokScraper = require('tiktok-scraper');

const database = require("../db_queries/tiktok_db.js");

exports.tasks = async function () {

    tiktokLoop().catch(console.error);

}

async function tiktokLoop() {

    let startTime = Date.now();

    console.log(chalk.keyword('aqua')("Started checking TikTok at " + new Date(startTime).toLocaleString()));

    let channelNotifs = await database.getAllTikTokChannels();
    let accounts = new Set(channelNotifs.map(x => x.account));

    await (async () => {
        for (let account of accounts.values()) {

            let promises = [];
            let targetData = channelNotifs.filter(data => data.account == account);

            promises.push((async function processPosts(account, targetData) {

                let response = await TikTokScraper.user(account, {
                    number: 5,
                    sessionList: ['sid_tt=e6acd131b378f303bb8940a01a301751', 'sid_tt=9811cd83dbea7fe7a28956cee606b15f', 'sid_tt=f5429bf818948bf049e4bf3aa93cf47f', 'sid_tt=c8c57151b88ed4f96ce58c15b3026f45', 'sid_tt=3b318b706f893b3e930a0142f2ef9218']
                });

                let recentPosts = response.collector;
                if (!recentPosts) {
                    return;
                }

                let oldPosts = await database.getAccountPosts(account);
                let oldPostIDs = oldPosts.map(p => p.postID);

                /*for (let data of targetData) {
                    let { guildID, discordChanID, mentionRoleID, webhookID } = data;

                    let webhook = await bot.fetchWebhook(webhookID);
                    if (!webhook) {
                        database.removeTikTokChannel(discordChanID, account);
                        break;
                    }
                    if (webhook.channelID !== discordChanID.toString()) {
                        await database.removeTikTokChannel(discordChanID, account);
                        await database.addTikTokChannel(guildID, webhook.channelID, account, mentionRoleID ? mentionRoleID : null, webhookID)
                        continue;
                    }
                }*/

                let newPosts = recentPosts.filter(post => !oldPostIDs.includes(post.id)).sort((a, b) => a.createTime - b.createTime)

                for (let post of newPosts) {

                    let { id, text, authorMeta, covers, createTime, webVideoUrl } = post;

                    await database.addPost(account, id);

                    for (let data of targetData) {
                        let { guildID, discordChanID, mentionRoleID } = data;

                        let guild = bot.guilds.cache.get(guildID);
                        if (!guild) {
                            continue;
                        }
                        let channel = bot.channels.cache.get(discordChanID) || guild.channels.cache.get(discordChanID);
                        if (!channel) {
                            database.removeTikTokChannel(discordChanID, account);
                            continue;
                        }

                        let message = `<${webVideoUrl}>${mentionRoleID ? ` <@&${mentionRoleID}>` : ``}`;

                        const canvas = createCanvas(720, 1280);
                        const ctx = canvas.getContext('2d');

                        const art = await loadImage(covers.default);
                        let xOff = 0;
                        let yOff = 0;
                        ctx.fillStyle = "black";
                        ctx.fillRect(
                            0,
                            0,
                            720,
                            1280
                        );
                        ctx.drawImage(
                            art,
                            xOff,
                            yOff,
                            720,
                            1280
                        );

                        let embed = new Discord.MessageEmbed({
                            author: {
                                name: `@${authorMeta.name}`,
                                url: `https://www.tiktok.com/@${authorMeta.name}/`,
                                icon_url: authorMeta.avatar
                            },
                            color: 0x69C9D0,
                            footer: { icon_url: 'https://cdn.uconnectlabs.com/wp-content/uploads/sites/7/2021/03/TikTok-App-Icon.png', text: `TikTok` }
                        });

                        if (text) {
                            embed.setDescription(`${text ? entities.decodeHTML(text.length > 500 ? text.slice(0, 500).concat('...') : text) : ''}`);
                        }

                        const stream = canvas.createPNGStream();
                        const attachment = new Discord.MessageAttachment(stream, `${id}.png`);
                        embed.attachFiles(attachment);
                        embed.setImage(`attachment://${id}.png`);

                        embed.setTimestamp(new Date(createTime * 1000));

                        channel.send({ embeds: [embed], content: message }).then(() => {
                            if (channel.type === 'GUILD_NEWS') {
                                channel.messages.fetch({ limit: 2 }).then(messages => {
                                    let lastMessage = messages.first();

                                    if (lastMessage.author.bot && lastMessage.crosspostable) {
                                        lastMessage.crosspost().catch();
                                    }
                                })
                            }
                        }).catch(err => {
                            console.log(embed, err);
                        });
                    }

                }

            })(account, targetData));

            await Promise.all(promises);
        }
    })().catch(console.error);


    console.log(chalk.keyword('aqua')("Finished checking TikTok, took " + (Date.now() - startTime) / 1000 + "s"));
    let waitTime = Math.max(60000 - (Date.now() - startTime), 3000 * accounts.size, 0);
    setTimeout(tiktokLoop, waitTime); // ensure runs every 60 secs unless processing time > 60 secs

}