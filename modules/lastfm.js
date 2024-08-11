const { Discord, MessageEmbed, MessageAttachment } = require("discord.js");
const { embedPages, errorEmbed, confirmEmbed, helpBuilder, withTyping, checkPermissions } = require("../functions/discord.js");
const serverSettings = require("../utils/server_settings.js");

const axios = require("axios");

const config = require("../config.json");
const database = require("../db_queries/lastfm_db.js");
const lastfm = require("../functions/lastfm.js");
const media = require("./media.js");
const { registerFont, createCanvas, loadImage } = require("canvas");
const { getImgColours } = require("../functions/colours.js");
const path = require("path");

const api_key = config.lastfm_key;


exports.onCommand = async function (message, args) {
    let { channel, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('lastfm' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "lastfm":
        case "lf":
        case "fm":
            switch (args[1]) {
                case "set":
                    withTyping(channel, setLfUser, [message, args[2]]);
                    break;

                case "remove":
                case "delete":
                case "del":
                    withTyping(channel, removeLfUser, [message]);
                    break;

                case "recent":
                case "recents":
                    withTyping(channel, lfRecents, [message, args.slice(2)]);
                    break;

                case "nowplaying":
                case "np":
                    withTyping(channel, lfRecents, [message, args.slice(2), 1]);
                    break;

                case "topartists":
                case "ta":
                    withTyping(channel, lfTopMedia, [message, args.slice(2), "artist"]);
                    break;

                case "topalbums":
                case "talb":
                    withTyping(channel, lfTopMedia, [message, args.slice(2), "album"]);
                    break;

                case "toptracks":
                case "tt":
                    withTyping(channel, lfTopMedia, [message, args.slice(2), "track"]);
                    break;

                case "profile":
                    withTyping(channel, lfProfile, [message, args[2]]);
                    break;

                case "yt":
                    withTyping(channel, lfYoutube, [message, args[2]]);
                    break;

                case "help":
                    prefix = await serverSettings.get(message.guild.id, "prefix");
                    var embed = await helpBuilder("fm", prefix);
                    channel.send(embed);
                    break;

                case "whoknows":
                case "wk":
                    withTyping(channel, whoKnows, [message, args.slice(2)]);
                    break;

                case "chart":
                    withTyping(channel, chart, [message, args.slice(1)]);
                    break;

                default:
                    withTyping(channel, lfRecents, [message, args.slice(1), 2]);
                    break;

            }
            break;
        case "nowplaying":
        case "np":
            withTyping(channel, lfRecents, [message, args.slice(2), 1]);
            break;

        case "whoknows":
        case "wk":
            withTyping(channel, whoKnows, [message, args.slice(1)]);
            break;

        case "topartists":
        case "ta":
            withTyping(channel, lfTopMedia, [message, args.slice(1), "artist"]);
            break;

        case "topalbums":
        case "talb":
            withTyping(channel, lfTopMedia, [message, args.slice(1), "album"]);
            break;

        case "toptracks":
        case "tt":
            withTyping(channel, lfTopMedia, [message, args.slice(1), "track"]);
            break;

        case "lfyt":
        case "fmyt":
            withTyping(channel, lfYoutube, [message, args[1]]);
            break;

        case "chart":
            withTyping(channel, chart, [message, args]);
            break;
    }
}

async function setLfUser(message, username) {

    if (!username) {
        const embed = errorEmbed(`Please provide a valid Last.fm username.`)
        message.channel.send({ embeds: [embed] });
    } else {
        try {
            let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json`);
            username = response.data.user.name;
        } catch (e) {
            e = e.response.data;
            if (e.error == 6) {
                const embed = errorEmbed(`${e.message || "Invalid Last.fm username"}.`)
                message.channel.send({ embeds: [embed] });
            } else {
                let err = new Error(e.message);
                console.error(err);
                const embed = errorEmbed(`Unknown error occured.`)
                message.channel.send({ embeds: [embed] });
            }
            return;
        }

        await database.setLfUser(message.author.id, username);
        const embed = confirmEmbed(`Last.fm username set to **${username}**.`)
        message.channel.send({ embeds: [embed] });
    }

}

async function removeLfUser(message) {

    let removed = await database.removeLfUser(message.author.id);
    if (removed) {
        const embed = confirmEmbed(`Last.fm username removed.`)
        message.channel.send({ embeds: [embed] });
    } else {
        const embed = errorEmbed(`No Last.fm username found.`)
        message.channel.send({ embeds: [embed] });
    }
}

async function lfRecents(message, args, limit) {

    let username;
    if (args) {
        if (args.length < 1) {
            username = null;
            limit = limit || 10;
        } else if (args.length < 2) {
            username = limit ? args[0] : null;
            limit = limit || +args[0] || 10;
        } else {
            username = limit ? args[0] : args[1] || args[0];
            limit = limit || +args[0] || 10;
        }
    }

    if (!username) {
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        const embed = errorEmbed(`No Last.fm username linked to your account.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    limit = Math.min(limit, 1000);

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=${limit}`);
    } catch (e) {
        e = e.response.data;
        const embed = errorEmbed(`${e.message || "Unknown error occurred."}`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let tracks = response.data.recenttracks.track
    if (!tracks || tracks.length < 1) {
        const embed = errorEmbed(`**${username}** hasn't listened to any music.`)
        message.channel.send({ embeds: [embed] });
        return;
    }
    if (!Array.isArray(tracks)) {
        tracks = [tracks];
    }
    tracks = tracks.slice(0, limit);
    let lfUser = response.data.recenttracks['@attr'].user;

    let indPlayCount = "N/A";
    let globalPlays = "N/A";
    let loved = false;
    if (tracks.length < 3) {
        try {
            let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=track.getInfo&user=${lfUser}&api_key=${api_key}&artist=${encodeURIComponent(tracks[0].artist["#text"])}&track=${encodeURIComponent(tracks[0].name)}&format=json`);
            if (response.data.track) {
                let { userplaycount, userloved, playcount } = response.data.track;
                indPlayCount = userplaycount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + `x`;
                loved = userloved;
                globalPlays = playcount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + `x`;
                if (playcount === '1') { globalPlays = "N/A" };
            }
        } catch (e) {
            e = e.response ? e.response.data : e;
            console.error(new Error(e));
        }
    }

    if (tracks.length < 2) {
        recent1Embed(message, tracks[0], lfUser, indPlayCount, loved, globalPlays);
    } else {
        recentListPages(message, tracks, lfUser);
    }

}

async function recent1Embed(message, track, lfUser, indPlayCount, loved, globalPlays) {

    let trackField = `by [${track.artist["#text"].replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")})`;
    let np = track['@attr'] && track['@attr'].nowplaying ? true : false;
    let p = lfUser[lfUser.length - 1].toLowerCase() == 's' ? "'" : "'s";

    let thumbnail = track.image[3]["#text"].replace("300x300/", "") || "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
        thumbnail = "https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png";
    }
    let image = track.image[track.image.length - 1]["#text"].replace("300x300/", "") || "https://lastfm-img2.akamaized.net/i/u/c6f59c1e5e7240a4c0d427abd71f3dbb.png"
    let embedColor = await getImgColours(image);
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0xb90000;

    let fimg = await lastfm.scrapeArtistImage(track.artist["#text"]);
    if (fimg.includes('2a96cbd8b46e442fc41c2b86b821562f')) fimg = 'https://lastfm-img2.akamaized.net/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png';

    let embed = new MessageEmbed({
        author: { name: `${track.name.replace(/([\[\]\`\*\~\_])/g, "\\$&")}`, icon_url: fimg, url: `https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.name).replace(/\)/g, "\\)")}` },
        thumbnail: { url: thumbnail },
        url: image,
        description: trackField,
        color: embedColorFinal,
        footer: { icon_url: message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }), text: `${+loved ? '❤ ' : ''} Plays: ${indPlayCount} • Global plays: ${globalPlays}` }
    });

    if (track.album && track.album['#text']) {
        embed.setDescription(trackField + `\non [${track.album['#text']}](https://www.last.fm/music/${encodeURIComponent(track.artist["#text"]).replace(/\)/g, "\\)")}/_/${encodeURIComponent(track.album['#text']).replace(/\)/g, "\\)")})`);
    }
    if (!np && track.date) {
        embed.timestamp = new Date(0).setSeconds(track.date.uts);
    }

    let reactTo = await message.channel.send({ embeds: [embed] });
    await reactTo.react('❤️');
    await reactTo.react('👍');
    await reactTo.react('👎');

}

async function lfTopMedia(message, args, type) {

    let time;
    let limit;
    if (args.length < 1) {
        time = lastfm.getTimeFrame();
        limit = 10;
    }
    else if (args.length < 2) {
        time = lastfm.getTimeFrame(args[0]);
        limit = time.defaulted && +args[0] ? args[0] : 10;
    }
    else {
        time = lastfm.getTimeFrame(args[0]);
        limit = time.defaulted ? +args[0] || null : +args[1] || 10;

        if (time.defaulted) time = lastfm.getTimeFrame(args[1]);
        limit = time.defaulted && !limit ? +args[1] || 1 : limit || 10;
    }

    let username = args.length > 2 ? args[2] : null;
    if (!username) {
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        const embed = errorEmbed(`No Last.fm username linked to your account.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let {
        timeframe,
        datePreset,
        displayTime
    } = time;

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettop${type}s&user=${username}&api_key=${api_key}&format=json&period=${timeframe}&limit=${limit}`);
    } catch (e) {
        let { message } = e.response.data;
        const embed = errorEmbed(`${e.message || "Unknown error occurred."}`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let lf_user = response.data[`top${type}s`]["@attr"].user;
    let collection = response.data[`top${type}s`][type];
    if (!collection || collection.length < 1) {
        const embed = errorEmbed(`**${username}** hasn't listened to any music during this time.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let rowString;
    if (type == 'artist') rowString = collection.map((x, i) => `\`${i + 1}.\` [${x.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.name).replace(/\)/g, "\\)")}) (${x.playcount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${x.playcount == 1 ? 'play' : 'plays'})`).join('\n');
    if (type == 'album') rowString = collection.map((x, i) => `\`${i + 1}.\` [${x.artist.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.artist.name).replace(/\)/g, "\\)")}/) - **[${x.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.artist.name).replace(/\)/g, "\\)")}/${encodeURIComponent(x.name).replace(/\)/g, "\\)")})** (${x.playcount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${x.playcount == 1 ? 'play' : 'plays'})`).join('\n');
    if (type == 'track') rowString = collection.map((x, i) => `\`${i + 1}.\` [${x.artist.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.artist.name).replace(/\)/g, "\\)")}/) - **[${x.name.replace(/([\(\)\`\*\~\_])/g, "\\$&")}](https://www.last.fm/music/${encodeURIComponent(x.artist.name).replace(/\)/g, "\\)")}/_/${encodeURIComponent(x.name).replace(/\)/g, "\\)")})** (${x.playcount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${x.playcount == 1 ? 'play' : 'plays'})`).join('\n');

    let descriptions = [];
    while (rowString.length > 2048 || rowString.split('\n').length > 25) {
        let currString = rowString.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        rowString = rowString.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(rowString);

    let thumbnail
    if (type == 'track' || type == 'artist') {
        thumbnail = await lastfm.scrapeArtistImage(type == 'track' ? collection[0].artist.name : collection[0].name);
    } else {
        thumbnail = collection[0].image[3]["#text"];
        if (thumbnail.includes('2a96cbd8b46e442fc41c2b86b821562f')) thumbnail = embeds[type].defimg;
    }
    let embedColor = await getImgColours(thumbnail);
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0xb90000;
    let p = lf_user[lf_user.length - 1].toLowerCase() == "s" ? "'" : "'s";

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `${message.author.username + p} top ${type[0] + type.slice(1)}s`, icon_url: message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }), url: `https://www.last.fm/user/${lf_user}/library/${type}s?date_preset=${datePreset}`
            },
            //title: displayTime.toLocaleLowerCase(),
            description: desc,
            thumbnail: { url: thumbnail.replace("300x300/", "") },
            color: embedColorFinal,
            footer: {
                text: `${displayTime} • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function lfProfile(message, username) {

    if (!username) {
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        const embed = errorEmbed(`No Last.fm username linked to your account.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=1`);
    } catch (e) {
        e = e.response.data;
        const embed = errorEmbed(`${e.message || "Unknown error occurred."}`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let user = response.data.user;
    let thumbnail = user.image[2]["#text"];
    let image = user.image[user.image.length - 1]["#text"].replace("300x300/", "");

    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let date = new Date(0);
    date.setSeconds(user.registered.unixtime);

    let date_string = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

    response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&api_key=${api_key}&format=json`)
    let artist_count = response.data.topartists["@attr"].total;

    response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${api_key}&format=json`)
    let album_count = response.data.topalbums["@attr"].total;

    response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${username}&api_key=${api_key}&format=json`)
    let track_count = response.data.toptracks["@attr"].total;

    let embed = new MessageEmbed({
        author: { name: `${user.name}`, icon_url: `https://i.imgur.com/lQ3EqM6.png`, url: `https://www.last.fm/user/${user.name}/` },
        url: image,
        thumbnail: { url: thumbnail },
        color: 0xb90000,
        description: `Scrobbling since ${date_string}`,
        timestamp: date,
        fields: [
            { name: "Artists", value: parseInt(artist_count).toLocaleString(), inline: true },
            { name: "Albums", value: parseInt(album_count).toLocaleString(), inline: true },
            { name: "Tracks", value: parseInt(track_count).toLocaleString(), inline: true }
        ]
    });

    message.channel.send({ embed });

}

async function lfYoutube(message, username) {

    if (!username) {
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        const embed = errorEmbed(`No Last.fm username linked to your account.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let response;
    try {
        response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${api_key}&format=json&limit=1`);
    } catch (e) {
        e = e.response.data;
        const embed = errorEmbed(`${e.message || "Unknown error occurred."}`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let track = response.data.recenttracks.track[0];
    if (!track.artist) {
        const embed = errorEmbed(`${username} has not listened to any music.`)
        message.channel.send({ embeds: [embed] });
        return;
    }
    let query = `${track.artist["#text"]} - ${track.name}`;
    let np = track["@attr"] && track["@attr"].nowplaying;

    let video = await media.ytVidQuery(query);
    if (!video) {
        const embed = errorEmbed(`Couldn't find a YouTube video for: \`${query}\`.`)
        message.channel.send({ embeds: [embed] });
    } else {
        message.channel.send({ content: `${np ? "Now playing" : "Last played"}: https://youtu.be/${video}` });
    }

}

async function whoKnows(message, args) {

    let username = await database.getLfUser(message.author.id);
    if (!username) {
        const embed = errorEmbed(`No Last.fm username linked to your account.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    var artistString = ``;

    args.forEach(arg => { artistString += `${arg} `; });
    var artistString = artistString.slice(0, -1);
    let search = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistString)}&api_key=${api_key}&format=json`);
    if (search.data.error) {
        const embed = errorEmbed(`No artist found for **${artistString}**.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    const fimg = await lastfm.scrapeArtistImage(encodeURIComponent(artistString));

    const guild = await message.guild.members.fetch();
    let know = [];
    var totalPlays = 0;
    for (const [id, member] of guild) {
        const user = await database.getLfUser(id);
        if (!user) {
            continue;
        }
        let response = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistString)}&username=${user}&api_key=${api_key}&format=json`).catch(e => console.log(e));
        const { userplaycount } = response.data.artist.stats
        if (userplaycount !== '0' && userplaycount !== undefined) {
            know.push({
                member, plays: userplaycount,
                user
            });
            var totalPlays = parseInt(totalPlays) + parseInt(userplaycount);
        }
    }
    if (know.length === 0) {
        const embed = errorEmbed(`Nobody listens to **${search.data.artist.name}** in ${message.guild.name}.`)
        message.channel.send({ embeds: [embed] });
        return;
    }
    know = know.sort((a, b) => parseInt(b.plays) - parseInt(a.plays));
    let num = 0;
    const whoKnow = know.map(x => `\`${++num}.\` [${x.member.user.username}](https://www.last.fm/user/${x.user}) (${x.plays.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ` plays`})`).join('\n');

    let embedColor = await getImgColours(message.guild.iconURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

    let descriptions = [];
    while (whoKnow.length > 2048 || whoKnow.split('\n').length > 25) {
        let currString = whoKnow.slice(0, 2048);

        let lastIndex = 0;
        for (let i = 0; i < 25; i++) {
            let index = currString.indexOf('\n', lastIndex) + 1;
            if (index) lastIndex = index; else break;
        }
        currString = currString.slice(0, lastIndex);
        whoKnow = whoKnow.slice(lastIndex);

        descriptions.push(currString);
    }
    descriptions.push(whoKnow);

    let pages = descriptions.map((desc, i) => {
        return new MessageEmbed({
            author: {
                name: `Top listeners for ${search.data.artist.name}`,
                icon_url: message.guild.iconURL({ format: 'png', dynamic: true }),
                url: `https://www.last.fm/music/${encodeURIComponent(artistString)}`
            },
            description: desc,
            color: embedColorFinal,
            thumbnail: {
                url: fimg.replace("300x300/", ""),
            },
            footer: {
                text: `${know.length} members • ${totalPlays.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} plays total • Page ${i + 1} of ${descriptions.length}`
            }
        })
    })

    embedPages(message, pages);

}

async function chart(message, args) {

    let period;
    if (args.length < 1) {
        period = lastfm.getTimeFrame();
    }
    else if (args.length < 2) {
        period = lastfm.getTimeFrame(args[0]);
    }
    else {
        period = lastfm.getTimeFrame(args[0]);

        if (period.defaulted) period = lastfm.getTimeFrame(args[1]);
    }

    let type = args[2];

    let username = args.length > 3 ? args[3] : null;
    if (!username) {
        username = await database.getLfUser(message.author.id);
    }
    if (!username) {
        const embed = errorEmbed(`No Last.fm username linked to your account.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    let result = undefined;
    let items = undefined;

    if (type === "track") {
        result = await lastfm.getUserTopTracks(
            username,
            period.timeframe,
            9
        );

        if (result === undefined) {
            const embed = errorEmbed(`I could not seem to get a list of top ${type}s for the user in this period.`)
            message.channel.send({ embeds: [embed] });

            message.channel.stopTyping();

            return;
        }

        items = result.tracks;
    }
    else if (type === "album") {
        result = await lastfm.getUserTopAlbums(
            username,
            period.timeframe,
            9
        );

        if (result === undefined) {
            const embed = errorEmbed(`I could not seem to get a list of top ${type}s for the user in this period.`)
            message.channel.send({ embeds: [embed] });

            message.channel.stopTyping();

            return;
        }

        items = result.albums;
    }
    else if (type === "artist") {
        result = await lastfm.getUserTopArtists(
            username,
            period.timeframe,
            9
        );

        if (result === undefined) {
            const embed = errorEmbed(`I could not seem to get a list of top ${type}s for the user in this period.`)
            message.channel.send({ embeds: [embed] });

            message.channel.stopTyping();

            return;
        }

        items = result.artists;
    } else {
        const embed = errorEmbed(`Please specify what kind of chart you want.`)
        message.channel.send({ embeds: [embed] });
        return;
    }

    /*let botMember = await resolveMember(message.guild, Client.user.id);
    const textColor = botMember.displayColor;
    var hex = '#' + textColor.toString(16).toUpperCase();*/

    // the size of the canvas to draw to, no seperate width and height as it
    // should always be square, so double up on the values
    const canvasSize = 900;

    // create a canvas to draw the 3x3
    const canvas = createCanvas(canvasSize, canvasSize)
    const ctx = canvas.getContext('2d')

    let xOff = 0;
    let yOff = 0;

    // the safe zone for each image before flowing down should be 24
    const safeZone = 24;

    // the size of each piece of art, this should always be 300
    // so that it fits the actual image width and height
    const itemSize = 300;

    ctx.fillStyle = "black";
    ctx.fillRect(
        0,
        0,
        canvasSize,
        canvasSize
    );

    for (const item of items) {
        if (item.art !== '') {
            const art = await loadImage(item.art);

            // make the image 300px x 300px
            ctx.drawImage(
                art,
                xOff,
                yOff,
                300,
                300
            );
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(
            xOff,
            yOff,
            xOff + itemSize,
            yOff + itemSize
        );


        ctx.fillStyle = "white";
        //ctx.fillStyle = hexToRgbA(hex);

        const playText = `${item.playCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} plays`;
        const playCountY = (yOff + itemSize) - safeZone;
        const bottomSize = 18.0;
        const bottomPush = bottomSize * 1.25;

        // draw the play count text first at the very bottom
        let playCountEnd = drawWrappedText(
            ctx,
            xOff + safeZone,
            playCountY,
            bottomPush,
            playText,
            itemSize - (safeZone * 2),
            bottomSize
        );

        // draw the artist name text above the play count text
        //
        // also, do not draw the artist name if the type of chart is artist
        // as the artist name will be the main bold name
        let artistEnd = ((type !== "artist") ? drawWrappedText(
            ctx,
            xOff + safeZone,
            playCountEnd - bottomPush,
            bottomPush,
            item.artist,
            itemSize - (safeZone * 2),
            bottomSize
        ) : playCountEnd);

        // calculate size and line push for the track name
        const topSize = 28.0;
        const topPush = topSize * 1.15;

        // draw the actual track/album name above all lines
        drawWrappedText(
            ctx,
            xOff + safeZone,
            artistEnd - bottomPush,
            topPush,
            item.name,
            itemSize - (safeZone * 2),
            topSize,
            "bold"
        );

        xOff += itemSize;

        // if the x offset is going to be greater than the image width,
        // then move on to the next row
        if (xOff >= canvasSize) {
            xOff = 0;
            yOff += itemSize;
        }
    }

    const stream = canvas.createPNGStream();
    const attachment = new MessageAttachment(stream, `${encodeURIComponent(message.author.username)}_chart.jpg`);

    let p = username.toString()[username.toString().length - 1].toLowerCase() == 's' ? "'" : "'s";

    let embedColor = await getImgColours(message.author.displayAvatarURL({ format: 'png', dynamic: false }));
    embedColor.sort((a, b) => {
        let bAltRgb = b.rgb().sort((a, b) => b - a);
        let aAltRgb = a.rgb().sort((a, b) => b - a);
        let bAltSat = bAltRgb[0] / bAltRgb[2];
        let aAltSat = aAltRgb[0] / aAltRgb[2];
        return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
    });
    let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0xb90000;

    let embed = new MessageEmbed({
        author: { name: `${message.author.username + p} top ${type}s of ${period.displayTime.toLowerCase()}`, icon_url: message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 32 }), url: `https://www.last.fm/user/${username}/` },
        color: embedColorFinal
    });

    embed.setImage(`attachment://${encodeURIComponent(message.author.username)}_chart.jpg`);

    message.channel.send({ embeds: [embed], files: [attachment] });
}

registerFont(
    path.join(__dirname, '../resources/fonts/NotoSans-Light.ttf'),
    { family: 'Noto Sans' }
);

registerFont(
    path.join(__dirname, '../resources/fonts/NotoSans-Regular.ttf'),
    { family: 'Noto Sans', weight: 'bold' }
);

function drawWrappedText(ctx, x, y, push, text, width, size, style = "normal") {
    ctx.font = `${style} ${size}px Noto Sans`;

    // truncate text to 80 characters to prevent overflow
    if (text.length > 80)
        text = text.substr(0, 80) + "...";

    const wholeLineWidth = ctx.measureText(text).width;

    if (wholeLineWidth <= width) {
        ctx.fillText(text, x, y);

        return y;
    }

    // Now, since the initial line test failed, try and break apart the line
    // into multiple lines, sometimes only one extra line may be required.
    //
    // This line splitting is done by word, aka splits each word by space, and
    // tests adding word by word until width is filled.
    const words = text.split(' ');
    let lines = [];
    let currentLine = "";

    words.forEach((value) => {
        // test the width for the current line and add to the lines array if
        // too big with the new word added to the end
        const lineWidth = ctx.measureText(currentLine + value + " ").width;

        if (lineWidth >= width) {
            lines.push(currentLine);

            currentLine = "";
        }

        // add the value and a space to the current line
        currentLine += value + " ";
    });

    // push the last line to the lines array if not empty
    if (currentLine.length > 0)
        lines.push(currentLine);

    // reverse the array for index ease of use
    lines.reverse();

    // iterate through the array backwards and fill text top to bottom
    let index = lines.length - 1;

    let smallestBottom = y;

    while (index >= 0) {
        let bottom = y - (push * index);

        ctx.fillText(
            lines[index],
            x,
            bottom
        );

        if (bottom < smallestBottom)
            smallestBottom = bottom;

        index--;
    }

    return smallestBottom;
}

function hexToRgbA(hex) {
    var c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',1)';
    }
    throw new Error('Bad Hex');
}