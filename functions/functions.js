exports.capitalise = (text) => {
    return text[0].toUpperCase() + text.slice(1).toLowerCase();
}

exports.trimArgs = function(args, limit, content) {
    for (let i = 0; i < limit; i++) {
        let arg = args[i];
        content = content.slice(content.indexOf(arg) + arg.length);
    }
    return content.trim();
}

exports.parseChannelID = function(text) {
    if (!text || text.length < 1) {
        let err = new Error("No text provided to resolve to channel");
        console.error(err);
    } else {
        let match = text.match(/<?#?!?(\d+)>?/);
        if (!match) {
            return null;
        } else {
            return match[1];
        }
    }
}

exports.parseUserID = function(text) {
    if (!text || text.length < 1) {
        let err = new Error("No text provided to resolve to channel");
        console.error(err);
    } else {
        let match = text.match(/<?@?!?(\d+)>?/);
        if (!match) {
            return null;
        } else {
            return match[1];
        }
    }
}

exports.getTimeAgo = (time, limit) => {

    let currTime = Date.now() / 1000;
    let timeDiffSecs = currTime - time;
    let timeAgoText;
    let timeAgo;

    if (timeDiffSecs < 60 || limit == 'seconds') {          //60 = minute
        timeAgo = Math.floor(timeDiffSecs);
        timeAgoText = timeAgo > 1 ? `${timeAgo} seconds ago` : `${timeAgo} second ago`;
    } else if (timeDiffSecs < 3600 || limit == 'minutes') { //3600 = hour
        timeAgo = Math.floor((timeDiffSecs) / 60);
        timeAgoText = timeAgo > 1 ? `${timeAgo} minutes ago` : `${timeAgo} minute ago`;
    } else if (timeDiffSecs < 86400 || limit == 'hours') {  //86400 = day
        timeAgo = Math.floor((timeDiffSecs) / 3600);
        timeAgoText = timeAgo > 1 ?  `${timeAgo} hours ago` :  `${timeAgo} hour ago`;
    } else if (timeDiffSecs < 604800 || limit == 'days') {  //604800 = week
        timeAgo = Math.floor((timeDiffSecs) / 86400);
        timeAgoText = timeAgo > 1 ? `${timeAgo} days ago` : `${timeAgo} day ago`;
    } else {                                                //More than a week
        timeAgo = Math.floor((timeDiffSecs) / 604800)
        timeAgoText = timeAgo > 1 ?  `${timeAgo} weeks ago` :  `${timeAgo} week ago`;
    }

    return timeAgoText;
    
}

exports.getDelta = (ms, type) => {
    
    let delta = Math.ceil(ms / 1000);
    let days = 0, hours = 0, minutes = 0, seconds = 0;

    if (['days'].includes(type) || !type) {
        days = Math.floor(delta / 86400);
        delta -= days * 86400;
    }
    
    if (['days', 'hours'].includes(type) || !type) {
        hours = Math.floor(delta / 3600);
        if (['days'].includes(type)) {
            hours = hours % 24;
        }
        delta -= hours * 3600;
    }

    if (['days', 'hours', 'minutes'].includes(type) || !type) {
        minutes = Math.floor(delta / 60);
        if (['days', 'hours'].includes(type)) {
            minutes = minutes % 60;
        }
        delta -= minutes * 60;
    }

    if (['days', 'hours', 'minutes', 'seconds'].includes(type) || !type) {
        if (['days', 'hours', 'minutes'].includes(type)) {
            seconds = seconds % 60;
        }
        seconds = delta % 60;
    }
    
    return { days, hours, minutes, seconds, ms };

}

exports.getAverageRGB = (imgEl) => {

    var blockSize = 5, // only visit every 5 pixels
        defaultRGB = {r:0,g:0,b:0}, // for non-supporting envs
        canvas = document.createElement('canvas'),
        context = canvas.getContext && canvas.getContext('2d'),
        data, width, height,
        i = -4,
        length,
        rgb = {r:0,g:0,b:0},
        count = 0;

    if (!context) {
        return defaultRGB;
    }

    height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
    width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;

    context.drawImage(imgEl, 0, 0);

    try {
        data = context.getImageData(0, 0, width, height);
    } catch(e) {
        // security error, img on diff domain
        return defaultRGB;
    }

    length = data.data.length;

    while ( (i += blockSize * 4) < length ) {
        ++count;
        rgb.r += data.data[i];
        rgb.g += data.data[i+1];
        rgb.b += data.data[i+2];
    }

    // ~~ used to floor values
    rgb.r = ~~(rgb.r/count);
    rgb.g = ~~(rgb.g/count);
    rgb.b = ~~(rgb.b/count);

    return rgb;

}