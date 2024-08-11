const { MessageEmbed } = require("discord.js");
const bot = require("../bot.js").bot;
const { embedPages } = require("../functions/discord.js");
const database = require("../db_queries/instagram_db.js");

const chalk = require('chalk');

const instagram = require('user-instagram');

exports.tasks = async function () {

    await loginLoop().catch(console.error);
    await instaLoop().catch(console.error);

}

async function instaLoop() {

    let startTime = Date.now();

    console.log(chalk.keyword('mediumvioletred')("Started checking Instagram at " + new Date(startTime).toLocaleString()));

    let channelNotifs = await database.getAllInstaChannels();
    let usernames = new Set(channelNotifs.map(x => x.username));

    await (async () => {

        for (let username of usernames.values()) {

            let promises = [];
            let targetData = channelNotifs.filter(data => data.username == username);

            promises.push((async function processPosts(username, targetData) {

                let startTimeAccount = Date.now();

                console.log(chalk.keyword('mediumvioletred')(`Started checking Instagram account @${username} at ` + new Date(startTimeAccount).toLocaleString()));

                let user = await instagram.getUserData(username).catch();
                let medias = await user.getMedias();

                let recentPosts = [];
                for (let media of medias) {
                    id = await media.getShortcode();
                    recentPosts.push(id);
                }
                if (recentPosts.size = 0) {
                    console.log("Instagram error.");
                    return;
                }

                let oldPosts = await database.getAccountPosts(username);
                let oldPostIDs = oldPosts.map(p => p.postID);

                let newPosts = recentPosts.filter(post => !oldPostIDs.includes(post));

                for (let post of newPosts) {

                    await database.addPost(username, post);
                    let imgArray = [];

                    for (let data of targetData) {
                        let { guildID, channelID, mentionRoleID } = data;

                        let guild = bot.guilds.cache.get(guildID);
                        if (!guild) {
                            continue;
                        }
                        let channel = bot.channels.cache.get(channelID) || guild.channels.cache.get(channelID);
                        if (!channel) {
                            database.removeInstaChannel(channelID, username);
                            continue;
                        }

                        let message = `https://www.instagram.com/p/${post}/${mentionRoleID ? ` <@&${mentionRoleID}>` : ``}`;

                        let postData = await instagram.getPostData(post);
                        if (post) {
                            let children = await postData.getChildren();

                            for (let child of children) {
                                let display = child.getDisplayUrl();
                                imgArray.push(display);
                            }


                            let pages = imgArray.map((img, i) => {
                                return new MessageEmbed({
                                    author: {
                                        name: `@${username}`,
                                        url: `https://www.instagram.com/${username}/`,
                                        icon_url: profile_pic_url_hd
                                    },
                                    description: caption || ``,
                                    image: {
                                        url: img,
                                    },
                                    color: 0xE4405F,
                                    footer: {
                                        icon_url: 'https://i.imgur.com/lQlsDlk.png',
                                        text: `Instagram`
                                    },
                                    timestamp
                                })
                            })
                        }

                        await channel.send({ content: message }).then(() => {
                            if (channel.type === 'GUILD_NEWS') {
                                channel.messages.fetch({ limit: 1 }).then(messages => {
                                    let lastMessage = messages.first();

                                    if (lastMessage.author.bot && lastMessage.crosspostable) {
                                        lastMessage.crosspost().catch();
                                    }
                                })
                            }
                        }).catch(err => {
                            console.log(err);
                        });
                    }

                }

                console.log(chalk.keyword('mediumvioletred')(`Finished checking Instagram account @${username}, took ` + (Date.now() - startTimeAccount) / 1000 + "s"));

            })(username, targetData).catch(err => {
                console.log(err);
                return;
            }));

            await Promise.all(promises);
            await new Promise(r => setTimeout(r, 60000));
        }
    })().catch(console.error);

    console.log(chalk.keyword('mediumvioletred')("Finished checking Instagram, took " + (Date.now() - startTime) / 1000 + "s"));
    let waitTime = 2700000;
    setTimeout(instaLoop, waitTime); // ensure runs every 45 mins

}

async function loginLoop() {
    await instagram.authenticate("mushroomlvr6660", "mushroomlover123");
    console.log(chalk.keyword('mediumvioletred')("Logged in to Instagram."));

}