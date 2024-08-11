const { contentPages, withTyping, errorEmbed, checkPermissions } = require("../functions/discord.js");
const { trimArgs } = require("../functions/functions.js");

const axios = require("axios");

const letterboxd = axios.create({
    baseURL: "https://letterboxd.com",
    timeout: 5000,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36" }
})

const youtube = axios.create({
    baseURL: "https://youtube.com",
    timeout: 5000,
    headers: { "X-YouTube-Client-Name": "1", "X-YouTube-Client-Version": "2.20200424.06.00" }
});

exports.onCommand = async function (message, args) {

    let { channel, guild } = message;

    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('media' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "youtube":
        case "yt":
            withTyping(channel, ytPages, [message, args]);
            break;
        case "letterboxd":
        case "lb":
            withTyping(channel, lbMovieQuery, [message, args]);
            break;
    }
}

async function ytVidQuery(query) {

    if (query) {
        let response = await youtube.get('/results', { params: { search_query: query, pbj: 1, sp: 'EgIQAQ==' } });
        let result;
        try {
            result = response.data[1].response.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents[0];
        } catch (e) {
            console.error(e);
            return null;
        }

        return result.videoRenderer ? result.videoRenderer.videoId || null : null;
    }

}

async function ytPages(message, args) {

    if (args.length < 2) {
        const embed = errorEmbed("Please provide something to search for.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let query = trimArgs(args, 1, message.content);
    let response = await youtube.get('/results', { params: { search_query: query, pbj: 1, sp: 'EgIQAQ==' } });
    let results;
    try {
        results = response.data[1].response.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
    } catch (e) {
        console.error(e);
        return null;
    }

    results = results.filter(result => result.videoRenderer && result.videoRenderer.videoId).map((result, i) => `\`${i + 1}.\` https://youtu.be/${result.videoRenderer.videoId}`);
    console.log(results)

    if (results.length < 1) {
        const embed = errorEmbed("No result found.");
        message.channel.send({ embeds: [embed] });
        return;
    }
    contentPages(message, results.slice(0, 20));

}

async function lbMovieQuery(message, args) {

    if (args.length < 2) {
        const embed = errorEmbed("Please provide a film to search for.");
        message.channel.send({ embeds: [embed] });
        return;
    }

    let query = trimArgs(args, 1, message.content);
    let { data } = await letterboxd.get(`/search/films/${encodeURIComponent(query)}`);
    let regExp = /<ul class="results">[^]*?data-film-link="(.*?)"/i;
    let result = data.match(regExp);

    if (result) {
        message.channel.send("https://letterboxd.com" + result[1]);
    } else {
        const embed = errorEmbed("No result found.");
        message.channel.send({ embeds: [embed] });
    }

}

exports.ytVidQuery = ytVidQuery;