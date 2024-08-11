const axios = require("axios");
const { JSDOM } = require("jsdom");
const request = require('request-promise-native');

let SpotifyClient = undefined;
let SpotifyAuthClient = undefined;

const SpotifyAPI = require('spotify-web-api-node');

SpotifyClient = new SpotifyAPI({
    clientId: '9c53b0691afa42b0be86907aa1d8f9df',
    clientSecret: 'c7482dba46fb4fc3899d62bef18df8f5'
});

SpotifyAuthClient = () => {
    SpotifyClient.clientCredentialsGrant().then(
        data => {
            SpotifyClient.setAccessToken(data.body['access_token']);
        },
        err => {
            console.error(err);
        });
}

SpotifyAuthClient();


exports.scrapeArtistImage = async function (artist) {

    let response;
    try {
        response = await axios.get(`https://www.last.fm/music/${encodeURIComponent(artist)}/+images`);
    } catch (e) {
        let err = new Error(e.response.data);
        console.error(err);
        return null;
    }

    let doc = new JSDOM(response.data).window.document;
    let images = doc.getElementsByClassName('image-list-item-wrapper');
    if (images.length < 1) {
        return "https://lastfm-img2.akamaized.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png";
    }

    return images[0].getElementsByTagName('img')[0].src.replace('/avatar170s/', '/300x300/') + '.png';

}

exports.scrapeArtistsWithImages = async function (username, datePreset, itemCount) {
    let collection = [];
    let pageCount = Math.ceil(itemCount / 50);

    for (let i = 0; i < pageCount; i++) {
        if (i > 0 && collection.length < 50) break;
        let response;
        try {
            response = await axios.get(`https://www.last.fm/user/${username}/library/artists?date_preset=${datePreset}&page=${i + 1}`);
        } catch (e) {
            return null;
        }

        let doc = new JSDOM(response.data).window.document;
        let rows = doc.getElementsByClassName('chartlist-row link-block-basic js-link-block');
        for (let j = 0; j < rows.length && j < itemCount - (i * 50); j++) {
            let row = rows[j];
            collection.push({
                'image': [{
                    '#text': row.getElementsByClassName('avatar')[0].getElementsByTagName('img')[0].src.replace('/avatar70s/', '/300x300/'),
                }],
                'name': row.getElementsByClassName('link-block-target')[0].textContent,
                'playcount': row.getElementsByClassName('chartlist-count-bar-value')[0].textContent.match(/[0-9,]+/)[0]
            })
        }
    }

    return collection;
}

exports.getTimeFrame = function (timeframe) {

    let displayTime;
    let datePreset;
    let defaulted = false;

    let week = ["7", "7day", "7days", "weekly", "week", "1week"];
    let month = ["30", "30day", "30days", "monthly", "month", "1month"];
    let threeMonth = ["90", "90day", "90days", "3months", "3month"];
    let sixMonth = ["180", "180day", "180days", "6months", "6month"];
    let year = ["365", "365day", "365days", "1year", "year", "yr", "12months", "12month", "yearly"];
    let overall = ["all", "at", "alltime", "forever", "overall"];

    switch (true) {
        case week.includes(timeframe):
            timeframe = "7day";
            displayTime = "Last Week";
            datePreset = "LAST_7_DAYS";
            break;
        case month.includes(timeframe):
            timeframe = "1month";
            displayTime = "Last Month";
            datePreset = "LAST_30_DAYS";
            break;
        case threeMonth.includes(timeframe):
            timeframe = "3month";
            displayTime = "Last 3 Months";
            datePreset = "LAST_90_DAYS";
            break;
        case sixMonth.includes(timeframe):
            timeframe = "6month";
            displayTime = "Last 6 Months";
            datePreset = "LAST_180_DAYS";
            break;
        case year.includes(timeframe):
            timeframe = "12month";
            displayTime = "Last Year";
            datePreset = "LAST_365_DAYS";
            break;
        case overall.includes(timeframe):
            timeframe = "overall";
            displayTime = "All Time";
            datePreset = "ALL";
            break;
        default:
            timeframe = "7day";
            displayTime = "Last Week";
            datePreset = "LAST_7_DAYS";
            defaulted = true;
    }

    return {
        timeframe: timeframe,
        displayTime: displayTime,
        datePreset: datePreset,
        defaulted: defaulted
    };
}

/**
 * The URL for the Last.fm API.
 */
const lastFMAPIURL = 'http://ws.audioscrobbler.com/2.0/';

/**
 * A generic set of options for the request library that
 * gets changed based on the bot command sent.
 */
let lastFMAPIOptions = {
    url: lastFMAPIURL,
    qs: {
        'method': '',
        'user': '',
        'api_key': '3696714e5c335a57fe050bf4d2316a13',
        'format': 'json'
    },
    headers: {
        "User-Agent": "mushroom discord bot"
    },
    json: true
};

/**
 * Simple class for accessing the Last.fm API.
 * 
 * Contains all methods needed to grab from the API and return for functions.
 */

exports.checkUserExists = async function (username) {
    lastFMAPIOptions.qs.method = 'user.getinfo';
    lastFMAPIOptions.qs.api_key = '3696714e5c335a57fe050bf4d2316a13';
    lastFMAPIOptions.qs.user = username;
    lastFMAPIOptions.qs.format = 'json';

    try {
        const result = await request(lastFMAPIOptions);

        lastFMAPIOptions.qs = {};

        return true;
    }
    catch (e) {
        lastFMAPIOptions.qs = {};

        return false;
    }
}

exports.getUserPlaying = async function (username) {
    // set the options for getting the last.fm playing
    lastFMAPIOptions.qs.method = 'user.getrecenttracks';
    lastFMAPIOptions.qs.api_key = '3696714e5c335a57fe050bf4d2316a13';
    lastFMAPIOptions.qs.user = username;
    lastFMAPIOptions.qs.format = 'json';

    try {
        const result = await request(lastFMAPIOptions);

        lastFMAPIOptions.qs = {};

        if (result.recenttracks.track.length === 0)
            return undefined;

        const first = result.recenttracks.track[0];

        return {
            artist: first.artist['#text'],
            title: first.name,
            album: first.album['#text'],
            image: first.image[first.image.length - 1]['#text']
        }
    }
    catch (e) {
        console.log(e);

        lastFMAPIOptions.qs = {};

        return undefined;
    }
}

exports.getUserTopAlbums = async function (username, period, count) {
    lastFMAPIOptions.qs.method = 'user.gettopalbums';
    lastFMAPIOptions.qs.api_key = '3696714e5c335a57fe050bf4d2316a13';
    lastFMAPIOptions.qs.user = username;
    lastFMAPIOptions.qs.period = period;
    lastFMAPIOptions.qs.format = 'json';

    try {
        const result = await request(lastFMAPIOptions);

        lastFMAPIOptions.qs = {};

        const length = result.topalbums.album.length;

        if (length <= 0)
            return undefined;

        let albums = [];
        let totalPlayCount = 0;

        for (let i = 0; i < count; i++) {
            const album = result.topalbums.album[i];

            let albumArt = await this._grabSpotifyArt(
                "album",
                `${album.name} artist:${album.artist.name}`
            );

            if (albumArt === null || albumArt === undefined) {
                albumArt = album.image[album.image.length - 1]["#text"];
            }

            totalPlayCount += parseInt(album.playcount);

            albums.push({
                art: albumArt,
                playCount: parseInt(album.playcount),
                name: album.name,
                artist: album.artist.name
            });
        }

        return { albums: albums, totalPlayCount: totalPlayCount };
    }
    catch (e) {
        console.log(e);

        lastFMAPIOptions.qs = {};

        return undefined;
    }
}

exports.getUserTopArtists = async function (username, period, count) {
    lastFMAPIOptions.qs.method = 'user.gettopartists';
    lastFMAPIOptions.qs.api_key = '3696714e5c335a57fe050bf4d2316a13';
    lastFMAPIOptions.qs.user = username;
    lastFMAPIOptions.qs.period = period;
    lastFMAPIOptions.qs.format = 'json';

    try {
        const result = await request(lastFMAPIOptions);

        lastFMAPIOptions.qs = {};

        const length = result.topartists.artist.length;

        if (length <= 0)
            return undefined;

        let artists = [];
        let totalPlayCount = 0;

        for (let i = 0; i < count; i++) {
            const artist = result.topartists.artist[i];

            totalPlayCount += parseInt(artist.playcount);

            let artistArt = await this._grabSpotifyArt(
                "artist",
                artist.name
            );

            if (artistArt === null || artistArt === undefined) {
                artistArt = artist.image[artist.image.length - 1]["#text"];
            }

            artists.push({
                art: artistArt,
                playCount: parseInt(artist.playcount),
                name: artist.name
            });
        }

        return { artists: artists, totalPlayCount: totalPlayCount };
    }
    catch (e) {
        console.log(e);

        lastFMAPIOptions.qs = {};

        return undefined;
    }
}

exports.getUserTopTracks = async function (username, period, count) {
    lastFMAPIOptions.qs.method = 'user.gettoptracks';
    lastFMAPIOptions.qs.api_key = '3696714e5c335a57fe050bf4d2316a13';
    lastFMAPIOptions.qs.user = username;
    lastFMAPIOptions.qs.period = period;
    lastFMAPIOptions.qs.format = 'json';

    try {
        const result = await request(lastFMAPIOptions);

        lastFMAPIOptions.qs = {};

        const length = result.toptracks.track.length;

        if (length <= 0)
            return undefined;

        let tracks = [];
        let totalPlayCount = 0;

        for (let i = 0; i < count; i++) {
            const track = result.toptracks.track[i];

            let art = await this._grabSpotifyArt(
                "track",
                `${track.name} artist:${track.artist.name}`
            );

            // try and fall back to artist art if track art cannot be found
            if (art === null || art === undefined) {
                art = await this._grabSpotifyArt(
                    "artist",
                    track.artist.name
                );
            }

            if (art === null || art === undefined) {
                art = await this.getTrackArt(track.name, track.artist.name);

                if (art === undefined) {
                    art = track.image[track.image.length - 1]["#text"];
                }
            }

            totalPlayCount += parseInt(track.playcount);

            tracks.push({
                art: art,
                playCount: parseInt(track.playcount),
                name: track.name,
                artist: track.artist.name
            });
        }

        return { tracks: tracks, totalPlayCount: totalPlayCount };
    }
    catch (e) {
        console.log(e);

        lastFMAPIOptions.qs = {};

        return undefined;
    }
}

exports.getTrackArt = async function (title, artist) {
    lastFMAPIOptions.qs.method = 'track.getinfo';
    lastFMAPIOptions.qs.api_key = '3696714e5c335a57fe050bf4d2316a13';
    lastFMAPIOptions.qs.artist = artist;
    lastFMAPIOptions.qs.track = title;
    lastFMAPIOptions.qs.format = 'json';

    try {
        const result = await request(lastFMAPIOptions);

        lastFMAPIOptions.qs = {};

        if (result.track.album !== undefined && result.track.album.image !== undefined)
            return result.track.album.image[result.track.album.image.length - 1]["#text"];
        else
            return undefined;
    }
    catch (e) {
        console.log(e);

        lastFMAPIOptions.qs = {};

        return undefined;
    }
}

exports._grabSpotifyArt = async function (type, name) {
    let artURL = "";

    if (SpotifyClient === undefined) {
        return null;
    }

    if (type === "artist") {
        await SpotifyClient.searchArtists(name).then(
        data => {
            if (data.body.artists.items.length <= 0)
            {
                artURL = null;

                return;
            }
            
            // try a different source if the artist doesn't have images
            if (data.body.artists.items[0].images.length <= 0)
            {
                artURL = null;
                
                return;
            }

            // get the mid-sized image as it will fit the chart better
            artURL = data.body.artists.items[0].images[1].url;
        },
        err => {
            // if authentication failed, retry the grab with new credentials
            if (err.statusCode === 401) {
                SpotifyAuthClient();

                artURL = this._grabSpotifyArt(type, name);
            }
        });
    }
    else if (type === "album") {
        await SpotifyClient.searchAlbums(name).then(
        data => {
            if (data.body.albums.items.length <= 0)
            {
                artURL = null;

                return;
            }

            // try a different source if the album doesn't have images
            if (data.body.albums.items[0].images.length <= 0)
            {
                artURL = null;
                
                return;
            }
            
            // get the mid-sized image as it will fit the chart better
            artURL = data.body.albums.items[0].images[1].url;
        },
        err => {
            // if authentication failed, retry the grab with new credentials
            if (err.statusCode === 401) {
                SpotifyAuthClient();

                artURL = this._grabSpotifyArt(type, name);
            }
        });
    }
    else if (type === "track") {
        await SpotifyClient.searchTracks(name).then(
        data => {
            if (data.body.tracks.items.length <= 0)
            {
                artURL = null;

                return;
            }

            // try a different source if the track doesn't have images
            if (data.body.tracks.items[0].album.images.length <= 0)
            {
                artURL = null;
                
                return;
            }

            // spotify only has art for albums, so just grab the album art
            // also grab the mid-sized album for better chart fit
            artURL = data.body.tracks.items[0].album.images[1].url;
        },
        err => {
            // if authentication failed, retry the grab with new credentials
            if (err.statusCode === 401) {
                SpotifyAuthClient();

                artURL = this._grabSpotifyArt(type, name);
            }
        });
    }

    return artURL;
}