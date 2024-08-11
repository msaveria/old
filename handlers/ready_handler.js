const chalk = require('chalk');

const serverSettings = require("../utils/server_settings.js");
const inviteCache = require("../utils/invite_cache.js");

const presences = require("../tasks/presences.js");
const reminders = require("../tasks/reminders.js");

exports.handleTasks = async function() {

    await serverSettings.ready();
    await inviteCache.onReady();
    await presences.tasks();
    await reminders.tasks();
    console.log(chalk.keyword('slateblue')(`Task loops have started.`));
}
