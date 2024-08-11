const bot = require("../bot.js").bot;
const chalk = require('chalk');
const axios = require("axios");
const Discord = require("discord.js");
const entities = require('entities');
const validUrl = require('valid-url');
const YouTubeVideoId = require('youtube-video-id');

const database = require("../db_queries/reddit_db.js");

exports.tasks = async function () {

    redditLoop().catch(console.error);

}

async function redditLoop() {

    let startTime = Date.now();

    console.log(chalk.keyword('coral')("Started checking Reddit at " + new Date(startTime).toLocaleString()));

    let channelNotifs = await database.getAllRedditChannels();
    let subreddits = new Set(channelNotifs.map(x => x.subreddit));

    await (async () => {
        for (let subreddit of subreddits.values()) {

            let promises = [];
            let targetData = channelNotifs.filter(data => data.subreddit == subreddit);

            promises.push((async function processPosts(subreddit, targetData) {

                let response;
                try {
                    response = await axios.get(`https://reddit.com/r/${subreddit}/new.json?limit=10`);
                } catch (e) {
                    return;
                }

                let data = response.data.data.children;
                if (!data) {
                    return;
                }

                let recentPosts = await data.map(edge => edge.data);

                let oldPosts = await database.getSubPosts(subreddit);
                let oldPostIDs = oldPosts.map(p => p.postID);

                let newPosts = recentPosts.filter(post => !oldPostIDs.includes(post.id)).sort((a, b) => a.created - b.created) /*sort posts in date order*/

                for (let post of newPosts) {

                    let { title, selftext, author, id, is_self, url, created_utc, link_flair_text } = post;

                    await database.addPost(subreddit, id);

                    for (let data of targetData) {
                        let { guildID, discordChanID, mentionRoleID } = data;

                        let guild = bot.guilds.cache.get(guildID);
                        if (!guild) {
                            continue;
                        }
                        let channel = bot.channels.cache.get(discordChanID) || guild.channels.cache.get(discordChanID);
                        if (!channel) {
                            database.removeRedditChannel(discordChanID, subreddit);
                            continue;
                        }

                        let message = `<https://redd.it/${id}>${mentionRoleID ? ` <@&${mentionRoleID}>` : ``}`;

                        let embed = new Discord.MessageEmbed({
                            author: {
                                name: `u/${author}`,
                                url: `https://www.reddit.com/u/${author}/`
                            },
                            color: 0xFF5700,
                            footer: { icon_url: 'https://www.sharethis.com/wp-content/uploads/2017/05/Reddit.png', text: `r/${subreddit}` }
                        });

                        if (selftext) {
                            embed.setDescription(`${is_self ? entities.decodeHTML(selftext.length > 253 ? selftext.slice(0, 253).concat('...') : selftext) : ''}`);
                        }

                        if (title) {
                            embed.setTitle(`${link_flair_text ? `\`${link_flair_text}\` ` : ''}${title ? entities.decodeHTML(title.length > 200 ? title.slice(0, 200).concat('...') : title) : ''}`);
                            embed.setURL(`https://redd.it/${id}`);
                        }

                        if (validUrl.isUri(url) && url.includes('.png') || url.includes('.jpg') || url.includes('.gif')) {
                            embed.setImage(entities.decodeHTML(url));
                        } else if (validUrl.isUri(url) && url.includes('youtube.com/watch') || url.includes('youtu.be')) {
                            embed.addField('Video', url, false);
                            embed.setImage(`https://img.youtube.com/vi/${YouTubeVideoId(validUrl.isUri(url))}/maxresdefault.jpg`);
                        }

                        embed.setTimestamp(new Date(created_utc * 1000));

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

            })(subreddit, targetData));

            await Promise.all(promises);
        }
    })().catch(console.error);


    console.log(chalk.keyword('coral')("Finished checking Reddit, took " + (Date.now() - startTime) / 1000 + "s"));
    let waitTime = Math.max(30000 - (Date.now() - startTime), 4000 * subreddits.size, 0);
    setTimeout(redditLoop, waitTime); // ensure runs every 60 secs unless processing time > 60 secs

}