const { withTyping, embedPages, confirmEmbed, denyEmbed, errorEmbed, checkPermissions } = require("../functions/discord.js");
const { getDelta } = require("../functions/functions.js");
const { getImgColours } = require("../functions/colours.js");

const database = require("../db_queries/reminders_db.js");

exports.onCommand = async function (message, args) {

  let { channel, guild } = message;

  const default_db = require("../db_queries/default_db.js");
  let d = await default_db.getAllDefaults(guild.id, channel.id);
  let check = [];
  for (let i = 0; i < d.length; i++) {
    check.push(d[i].cmdMod);
  }

  if (check.includes('reminders' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

  switch (args[0]) {
    case "remind":
      switch (args[1]) {
        case "me":
          withTyping(channel, setReminder, [message, args.slice(2)]);
          break;
      }
      break;
    case "reminder":
      switch (args[1]) {
        case "list":
          withTyping(channel, listReminders, [message, args])
          break;
      }
      break;
    case "reminders":
      switch (args[1]) {
        case "list":
          withTyping(channel, listReminders, [message, args])
          break;
        case "clear":
          withTyping(channel, clearReminders, [message, args]);
          break;
      }
      break;
    case "remindme":
      withTyping(channel, setReminder, [message, args.slice(1)]);
      break;
  }
}

async function setReminder(message, args) {

  let startTimestamp = Date.now() / 1000; // seconds since 1970

  if (args.length < 4) {
    const embed = errorEmbed("Please provide a reminder and a time.");
    message.channel.send({ embeds: [embed] });
    return;
  }

  let { author, content } = message;

  let inPos = content.search(/(?<!\w)in(?!\w)/i);
  if (inPos < 0) {
    const embed = errorEmbed("Please provide a time to set your reminder for.");
    message.channel.send({ embeds: [embed] });
    return;
  }

  let toPos = content.search(/(?<!\w)to(?!\w)/i);
  if (toPos < 0) {
    const embed = errorEmbed("Please provide content to be reminded of.");
    message.channel.send({ embeds: [embed] });
    return;
  }

  let timeString;
  let remindContent;
  if (inPos < toPos) {
    timeString = content.slice(inPos + 3, toPos).trim();
    remindContent = content.slice(toPos + 3).trim();
  } else {
    inPos = content.search(/(?<!\w)in(?!\w)(?!.*\Win\W)/i);
    remindContent = content.slice(toPos + 3, inPos).trim();
    timeString = content.slice(inPos + 3).trim();
  }

  let weeks = timeString.match(/(\d+)\s*w(?:ee)?ks?/i);
  let days = timeString.match(/(\d+)\s*d(?:ays)?/i);
  let hours = timeString.match(/(\d+)\s*h(?:ou)?r?s?/i);
  let minutes = timeString.match(/(\d+)\s*m(?:in(?:ute)?s?)?/i);
  let seconds = timeString.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/i);

  if (!(weeks || days || hours || minutes || seconds)) {
    const embed = errorEmbed("Please provide a time to set your reminder for.");
    message.channel.send({ embeds: [embed] });
    return;
  }

  let secondsTimestamp = seconds ? seconds[1] * 1 : 0;
  let minutesTimestamp = minutes ? minutes[1] * 60 : 0;
  let hoursTimestamp = hours ? hours[1] * 3600 : 0;
  let daysTimestamp = days ? days[1] * 86400 : 0;
  let weeksTimestamp = weeks ? weeks[1] * 604800 : 0;

  let remindTimestamp = startTimestamp + weeksTimestamp + daysTimestamp + hoursTimestamp + minutesTimestamp + secondsTimestamp;
  let remindTimeString = `${weeks ? `${weeks[1]} weeks ` : ``}${days ? `${days[1]} days ` : ``}${hours ? `${hours[1]} hours ` : ``}${minutes ? `${minutes[1]} minutes ` : ``}${seconds ? `${seconds[1]} seconds` : ``}`.trim();
  let timeDiff = remindTimestamp - startTimestamp;

  if (timeDiff < 10) {
    const embed = errorEmbed("Reminder must be set more than 10 seconds into the future.");
    message.channel.send({ embeds: [embed] });
    return;
  }

  if (timeDiff > 157680000) {
    const embed = errorEmbed("Reminder must be set less than 5 years into the future.");
    message.channel.send({ embeds: [embed] });
    return;
  }

  let lastID = await database.addReminder(author.id, remindContent, remindTimestamp, startTimestamp);
  if (!lastID) {
    const embed = errorEmbed("Error occured.");
    message.channel.send({ embeds: [embed] });
  } else {
    try {
      const embed = confirmEmbed(`You will be reminded in \`${remindTimeString}\` to "${remindContent}"`);
      message.channel.send({ embeds: [embed] });
    } catch (e) {
      if (e.code == 50007) {
        const embed = errorEmbed("I cannot send DMs to you. Please check your privacy settings and try again.");
        message.channel.send({ embeds: [embed] });
        database.removeReminder(lastID);
      }
    }
  }

}

async function listReminders(message, args) {

  let { author } = message;
  let reminders = await database.getUserReminders(author.id);

  if (reminders.length < 1) {
    const embed = denyEmbed("You do not have any reminders set.");
    message.channel.send({ embeds: [embed] });
    return;
  }

  let startTimestamp = Date.now() / 1000;
  let timeRemainingString = (timeData) => `${timeData.days}d ${timeData.hours}h ${timeData.minutes}m ${timeData.seconds}s`;
  let reminderString = reminders.map(reminder => `"${reminder.remindContent}" in \`${timeRemainingString(getDelta((reminder.remindTimestamp - startTimestamp) * 1000, "days"))}\``).join('\n');

  let descriptions = [];
  while (reminderString.length > 2048 || reminderString.split('\n').length > 25) {
    let currString = reminderString.slice(0, 2048);

    let lastIndex = 0;
    for (let i = 0; i < 25; i++) {
      let index = currString.indexOf('\n', lastIndex) + 1;
      if (index) lastIndex = index; else break;
    }
    currString = currString.slice(0, lastIndex);
    reminderString = reminderString.slice(lastIndex);

    descriptions.push(currString);
  }
  descriptions.push(reminderString);

  let embedColor = await getImgColours(message.author.displayAvatarURL({ format: 'png', dynamic: false }));
  embedColor.sort((a, b) => {
    let bAltRgb = b.rgb().sort((a, b) => b - a);
    let aAltRgb = a.rgb().sort((a, b) => b - a);
    let bAltSat = bAltRgb[0] / bAltRgb[2];
    let aAltSat = aAltRgb[0] / aAltRgb[2];
    return ((bAltSat * (bAltRgb[0] - bAltRgb[2]) + (b.hsl()[2] * 50)) - (aAltSat * (aAltRgb[0] - aAltRgb[2]) + (a.hsl()[2] * 50)));
  });
  let embedColorFinal = embedColor ? embedColor[0].saturate().hex() : 0x303135;

  let p = message.author.username[message.author.username.length - 1].toLowerCase() == 's' ? "'" : "'s";

  let pages = descriptions.map((desc, i) => {
    return new MessageEmbed({
      author: {
        name: `${message.author.username + p} reminders`, icon_url: message.author.displayAvatarURL({ format: 'png', dynamic: true, size: 32 })
      },
      description: desc,
      color: embedColorFinal,
      footer: {
        text: `Page ${i + 1} of ${descriptions.length}`
      }
    })
  });

  embedPages(message, pages);
  return;

}

async function clearReminders(message, args) {

  let { author } = message;
  let changes = await database.clearUserReminders(author.id);
  if (!changes) {
    const embed = errorEmbed("No reminders to remove.");
    message.channel.send({ embeds: [embed] });
  } else {
    const embed = confirmEmbed("Reminders cleared.");
    message.channel.send({ embeds: [embed] });
  }

}