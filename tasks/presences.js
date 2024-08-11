const bot = require("../bot.js").bot;
const chalk = require('chalk');

exports.tasks = async function() {

    presenceUpdateLoop().catch(console.error);

}

async function presenceUpdateLoop() {

    let startTime = Date.now();
    //let statusArray = ['the Mushroom God', 'mushrooms talking', 'prayers'];
    //let typeArray = ['LISTENING', 'WATCHING', 'PLAYING'];
    //var item = statusArray[Math.floor(Math.random()*statusArray.length)];
    //var type = typeArray[Math.floor(Math.random()*typeArray.length)];
    await bot.user.setActivity(`mushroom kingdom`, { type: `WATCHING` });
    //console.log(chalk.keyword('slateblue')(`Updated bot activity to "${type.toString().toLocaleLowerCase()} ${item.toString()}" at ${new Date(startTime).toLocaleString()}`));
    setTimeout(presenceUpdateLoop, 600000 - (Date.now() - startTime)); // 10 minute interval
    
}