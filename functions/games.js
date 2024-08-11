const { MessageEmbed } = require('discord.js');
//const { confirmEmbed, errorEmbed, denyEmbed } = require("../functions/discord.js");

exports.delay = function (ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

exports.awaitPlayers = async function (message, max, min = 1) {
	if (max === 1) return [message.author.id];
	const addS = min - 1 === 1 ? '' : 's';
	await message.channel.send({
		embeds: [new MessageEmbed({
			description: `You will need at least ${min - 1} more player${addS} (at max ${max - 1}). To join, type \`join game\`.`,
			color: message.author.displayColor || 0x7289DA
		})]
	});
	const joined = [];
	joined.push(message.author.id);
	const filter = res => {
		if (res.author.bot) return false;
		if (joined.includes(res.author.id)) return false;
		if (res.content.toLowerCase() !== 'join game') return false;
		joined.push(res.author.id);
		res.react('👍').catch(() => null);
		return true;
	};
	const verify = await message.channel.awaitMessages({ filter, max: max - 1, time: 60000 });
	verify.set(message.id, message);
	if (verify.size < min) return false;
	return verify.map(player => player.author.id);
}

exports.verify = async function (channel, user, { time = 30000, extraYes = [], extraNo = [] } = {}) {
	const filter = res => {
		const value = res.content.toLowerCase();
		return (user ? res.author.id === user.id : true)
			&& (yes.includes(value) || no.includes(value) || extraYes.includes(value) || extraNo.includes(value));
	};
	const verify = await channel.awaitMessages({ filter, max: 1, time });
	if (!verify.size) return 0;
	const choice = verify.first().content.toLowerCase();
	if (yes.includes(choice) || extraYes.includes(choice)) return true;
	if (no.includes(choice) || extraNo.includes(choice)) return false;
	return false;
}

exports.randomRange = function (min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.list = function (arr, conj = 'and') {
	const len = arr.length;
	if (len === 0) return '';
	if (len === 1) return arr[0];
	return `${arr.slice(0, -1).join(', ')}${len > 1 ? `${len > 2 ? ',' : ''} ${conj} ` : ''}${arr.slice(-1)}`;
}

exports.wrapText = function (ctx, text, maxWidth) {
	return new Promise(resolve => {
		if (ctx.measureText(text).width < maxWidth) return resolve([text]);
		if (ctx.measureText('W').width > maxWidth) return resolve(null);
		const words = text.split(' ');
		const lines = [];
		let line = '';
		while (words.length > 0) {
			let split = false;
			while (ctx.measureText(words[0]).width >= maxWidth) {
				const temp = words[0];
				words[0] = temp.slice(0, -1);
				if (split) {
					words[1] = `${temp.slice(-1)}${words[1]}`;
				} else {
					split = true;
					words.splice(1, 0, temp.slice(-1));
				}
			}
			if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) {
				line += `${words.shift()} `;
			} else {
				lines.push(line.trim());
				line = '';
			}
			if (words.length === 0) lines.push(line.trim());
		}
		return resolve(lines);
	});
}