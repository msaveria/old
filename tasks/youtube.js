const bot = require("../bot.js").bot;
const chalk = require('chalk');
bot.request = new (require("rss-parser"))();

const database = require("../db_queries/youtube_db.js");

exports.tasks = async function () {

    youtubeLoop().catch(console.error);

}

async function youtubeLoop() {

    let startTime = Date.now();

    console.log(chalk.keyword('red')("Started checking Youtube at " + new Date(startTime).toLocaleString()));

    let channelNotifs = await database.getAllYoutubeChannels();
    let ytchannels = new Set(channelNotifs.map(x => x.ytchannel));

    await (async () => {
        for (let ytchannel of ytchannels.values()) {

            let promises = [];
            let targetData = channelNotifs.filter(data => data.ytchannel == ytchannel);

            promises.push((async function processPosts(ytchannel, targetData) {

                let response;
                try {
                    response = await bot.request.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${ytchannel}`);
                } catch (e) {
                    return;
                }

                let recentPosts = response.items;
                if (!recentPosts) {
                    return;
                }

                let oldPosts = await database.getYTPosts(ytchannel);
                let oldPostIDs = oldPosts.map(p => p.postID);

                /*for (let data of targetData) {
                    let { channelName, guildID, discordChanID, mentionRoleID, webhookID } = data;

                    let webhook = await bot.fetchWebhook(webhookID);
                    if (!webhook) {
                        database.removeYoutubeChannel(discordChanID, channelName);
                        break;
                    }
                    if (webhook.channelID !== discordChanID.toString()) {
                        await database.removeYoutubeChannel(discordChanID, channelName);
                        await database.addYoutubeChannel(channelName, guildID, webhook.channelID, ytchannel, mentionRoleID ? mentionRoleID : null, webhookID)
                        continue;
                    }
                }*/

                let newPosts = recentPosts.filter(post => !oldPostIDs.includes(post.id)).sort((a, b) => a.isoDate - b.isoDate) /*sort posts in date order*/

                for (let post of newPosts) {

                    let { link, author, id } = post;

                    await database.addPost(ytchannel, id);

                    for (let data of targetData) {
                        let { guildID, discordChanID, mentionRoleID } = data;

                        let guild = bot.guilds.cache.get(guildID);
                        if (!guild) {
                            continue;
                        }
                        let channel = bot.channels.cache.get(discordChanID) || guild.channels.cache.get(discordChanID);
                        if (!channel) {
                            database.removeYoutubeChannel(discordChanID, author);
                            continue;
                        }

                        let message = `${link}${mentionRoleID ? ` <@&${mentionRoleID}>` : ``}`;

                        channel.send({ content: message }).then(() => {
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

            })(ytchannel, targetData));

            await Promise.all(promises);
        }
    })().catch(console.error);


    console.log(chalk.keyword('red')("Finished checking Youtube, took " + (Date.now() - startTime) / 1000 + "s"));
    let waitTime = Math.max(30000 - (Date.now() - startTime), 4000 * ytchannels.size, 0);
    setTimeout(youtubeLoop, waitTime); // ensure runs every 60 secs unless processing time > 60 secs

}