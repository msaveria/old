const { withTyping, confirmEmbed, errorEmbed, denyEmbed, resolveMember, searchMembers, checkPermissions } = require("../functions/discord.js");
const { parseUserID } = require("../functions/functions.js");
const { Collection, MessageEmbed } = require('discord.js');
const { bot, eco } = require("../bot.js");
const database = require("../db_queries/economy_db.js");
let games = new Map();
let fishMap = new Map();

const Cleverbot = require('cleverbot');
let clev = new Cleverbot({
    key: 'CC9ag1RCkasNEtNF-xx5Ir6mPzg'
});

const { delay, awaitPlayers, verify, randomRange, list } = require('../functions/games.js');

const guessQuestions = require('../resources/JSON/guesspionage');
const guessGuesses = ['much higher', 'higher', 'lower', 'much lower'];
const guessMin = 2;

const jengaNums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

const axios = require("axios");

const { Connect4AI } = require('connect4-ai');
const c4BlankEmoji = '⚪';
const c4Nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];

const { stripIndents } = require('common-tags');

const fishes = require('../resources/JSON/fishy');

const mathDifficulties = ['baby', 'easy', 'medium', 'hard', 'extreme', 'impossible'];
const mathOperations = ['+', '-', '*'];
const mathMaxValues = {
    baby: 10,
    easy: 50,
    medium: 100,
    hard: 500,
    extreme: 1000,
    impossible: Number.MAX_SAFE_INTEGER
};
const mathMaxMultiplyValues = {
    baby: 5,
    easy: 12,
    medium: 30,
    hard: 50,
    extreme: 100,
    impossible: Number.MAX_SAFE_INTEGER
};

const words = require("../resources/JSON/word-list");

exports.onCommand = async function (message, args) {

    let { channel, guild } = message;


    const default_db = require("../db_queries/default_db.js");
    let d = await default_db.getAllDefaults(guild.id, channel.id);
    let check = [];
    for (let i = 0; i < d.length; i++) {
        check.push(d[i].cmdMod);
    }

    if (check.includes('games' || 'all') && !checkPermissions(message.member, ["MANAGE_MESSAGES"])) return;

    switch (args[0]) {
        case "cleverbot":
        case "cb":
            withTyping(channel, cleverbotFunc, [message, args.slice(1)]);
            break;

        case "guesspionage":
            withTyping(channel, guesspionage, [message, args.slice(1)]);
            break;

        case "jenga":
            withTyping(channel, jenga, [message, args.slice(1)]);
            break;

        case "jeopardy":
            withTyping(channel, jeopardy, [message]);
            break;

        case "connectfour":
        case "connect4":
        case "c4":
            withTyping(channel, connectfour, [message, args.slice(1)]);
            break;

        case "fish":
        case "fishy":
            withTyping(channel, fish, [message]);
            break;

        case "hangman":
        case "hm":
            withTyping(channel, hangman, [message]);
            break;

        case "mathquiz":
        case "math":
            withTyping(channel, math, [message, args.slice(1)]);
            break;
    }
}

exports.onMention = async function (message, args) {
    let { channel } = message;

    switch (args[0]) {
        case `<@${bot.user.id}>`:
        case `<@!${bot.user.id}>`:
            withTyping(channel, cleverbotFunc, [message, args.slice(1)]);
            break;
    }

}

async function cleverbotFunc(message, args) {
    clev.query(args).then(async response => {
        message.reply({ content: `${response.output}` });
    });
};

async function guesspionage(message, players) {
    if (players < 2) return message.reply({ embeds: [denyEmbed(`You need at least **2** humans to play this game.`)] });
    const current = games.get(message.channel.id);
    if (current) return message.reply({ embeds: [denyEmbed(`Please wait until the current game of **${current.name}** is finished.`)] });
    games.set(message.channel.id, { name: `Guesspionage` });
    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    try {
        const awaitedPlayers = await awaitPlayers(message, players, guessMin);
        if (!awaitedPlayers) {
            games.delete(message.channel.id);
            return message.reply({ embeds: [denyEmbed(`There are not enough players to play.`)] });
        }
        let turn = 0;
        const pts = new Collection();
        for (const player of awaitedPlayers) {
            pts.set(player, {
                points: 0,
                id: player,
                user: await message.guild.members.fetch(player)
            });
        }
        const used = [];
        const userTurn = awaitedPlayers.slice(0);
        let lastTurnTimeout = false;
        let botMember = await resolveMember(message.guild, bot.user.id);
        if (!botMember) {
            message.channel.send({ embeds: [errorEmbed(`Could not locate bot as a member. Please try again in a few moments.`)] });
            return;
        }
        while (userTurn.length) {
            ++turn;
            const mainUser = pts.get(userTurn[0]).user;
            userTurn.shift();
            const valid = guessQuestions.filter(
                question => !used.includes(question.text) && (message.channel.nsfw ? true : !question.nsfw)
            );
            const question = valid[Math.floor(Math.random() * valid.length)];
            used.push(question.text);
            await message.channel.send({
                embeds: [new MessageEmbed({
                    title: `\`${turn}.\` ${question.text}`,
                    description: `${mainUser}, what percentage do you guess?`,
                    color: mainUser.displayColor || 0x7289DA
                })]
            });
            const initialGuessFilter = res => {
                if (res.author.id !== mainUser.id) return false;
                const int = Number.parseInt(res.content, 10);
                return int >= 0 && int <= 100;
            };
            const initialGuess = await message.channel.awaitMessages({ initialGuessFilter, max: 1, time: 30000 });
            if (!initialGuess.size) {
                await message.channel.send({ embeds: [errorEmbed(`${mainUser}, you are being skipped for inactivity.`)] });
                continue;
            }
            const guess = Number.parseInt(initialGuess.first().content, 10);
            await message.channel.send({
                embeds: [new MessageEmbed({
                    title: `${guess}%`,
                    description: `Everyone else, do you think the _actual_ percentage is \`higher\` or \`lower\`?\n\nYou can also guess \`much higher\` or \`much lower\` for double points if their answer is 15% off.`,
                    color: mainUser.displayColor || 0x7289DA
                })]
            });
            const guessed = [];
            const everyoneElseFilter = res => {
                if (res.author.id === mainUser.id) return false;
                if (guessed.includes(res.author.id)) return false;
                if (!awaitedPlayers.includes(res.author.id)) return false;
                if (!guessGuesses.includes(res.content.toLowerCase())) return false;
                guessed.push(res.author.id);
                res.react('✅').catch(() => null);
                return true;
            };
            const everyoneElse = await message.channel.awaitMessages({ everyoneElseFilter, max: awaitedPlayers.length - 1, time: 30000 });
            if (!everyoneElse.size) {
                if (lastTurnTimeout) {
                    await message.channel.send({ embeds: [errorEmbed('Game ended due to inactivity.')] });
                    break;
                } else {
                    await message.channel.send({ embeds: [errorEmbed('Waiting for players.')] });
                    lastTurnTimeout = true;
                    continue;
                }
            }
            const higherLower = everyoneElse.map(res => ({ guess: res.content.toLowerCase(), id: res.author.id }));
            for (const answer of higherLower) {
                const uGuess = answer.guess;
                if (uGuess === 'higher' && guess < question.answer) {
                    pts.get(answer.id).points += 1000;
                } else if (uGuess === 'lower' && guess > question.answer) {
                    pts.get(answer.id).points += 1000;
                } else if (uGuess === 'much higher' && guess < question.answer && question.answer - guess >= 15) {
                    pts.get(answer.id).points += 2000;
                } else if (uGuess === 'much lower' && guess > question.answer && guess - question.answer >= 15) {
                    pts.get(answer.id).points += 2000;
                }
            }
            const diff = Math.abs(question.answer - guess);
            if (diff <= 30) pts.get(mainUser.id).points += 3000 - (diff * 100);
            await message.channel.send({
                embeds: [new MessageEmbed({
                    title: `The actual answer was... ${question.answer}%!`,
                    fields: [
                        {
                            name: `Leaderboard`,
                            value: makeGuessLeaderboard(pts).join('\n'),
                            inline: false
                        },
                    ],
                    description: `${userTurn.length ? 'Next round starting in 10 seconds...' : ''}`,
                    color: mainUser.displayColor || 0x7289DA
                })]
            });
            if (lastTurnTimeout) lastTurnTimeout = false;
            if (userTurn.length) await delay(10000);
        }
        games.delete(message.channel.id);
        const winner = pts.sort((a, b) => b.points - a.points).first().user;
        message.channel.send({
            embeds: [new MessageEmbed({
                description: `${winner} won the game and got ${settings.currencySymbol}**100**!`,
                color: winner.displayColor || 0x7289DA
            })]
        });
        eco.balance.add(100, winner.id, message.guild.id, `Guesspionage.`);
    } catch (err) {
        games.delete(message.channel.id);
        throw err;
    }
}

async function jenga(message, opponentText) {
    let opponent = await parseUserID(opponentText.toString());
    opponent = await message.guild.members.fetch(opponent);
    let author = await message.guild.members.fetch(message.author.id);
    if (opponent.user.id === message.author.id) return message.reply({ embeds: [denyEmbed(`You cannot play against yourself.`)] });
    const current = games.get(message.channel.id);
    if (current) return message.reply({ embeds: [denyEmbed(`Please wait until the current game of **${current.name}** is finished.`)] });
    games.set(message.channel.id, { name: `Jenga` });
    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    try {
        if (!opponent.user.bot) {
            await message.channel.send({ embeds: [confirmEmbed(`Do you accept this challenge?`)], content: `${opponent}` });
            const verification = await verify(message.channel, opponent);
            if (!verification) {
                games.delete(message.channel.id);
                return message.channel.send({ embeds: [errorEmbed(`${opponent} declined.`)] });
            }
        }
        const board = [true, true, true, true, true, true, true, true, true, true];
        let userTurn = true;
        let winner = null;
        let wonByFinalPiece = false;
        let lastTurnTimeout = false;
        let i;
        while (!winner && board.length) {
            const user = userTurn ? author : opponent;
            if (opponent.user.bot && !userTurn) {
                i = Math.floor(Math.random() * board.length);
            } else {
                await message.channel.send({
                    embeds: [new MessageEmbed({
                        fields: [
                            {
                                name: `Board`,
                                value: jengaBoard(board),
                                inline: false
                            },
                        ],
                        description: `${user}, which block do you want to remove? Type \`end\` to forfeit.\nEach block you go lower on the tower, the more likely the tower falls.`,
                        color: user.displayHexColor || 0x7289DA
                    })]
                });
                const pickFilter = res => {
                    if (res.author.id !== user.id) return false;
                    const choice = res.content;
                    if (choice.toLowerCase() === 'end') return true;
                    const j = Number.parseInt(choice, 10) - 1;
                    return board[j];
                };
                const turn = await message.channel.awaitMessages({ pickFilter, max: 1, time: 60000 });
                if (!turn.size) {
                    if (lastTurnTimeout) {
                        winner = 'time';
                        break;
                    } else {
                        await message.channel.send({ embeds: [errorEmbed(`Time is up!`)] });
                        lastTurnTimeout = true;
                        userTurn = !userTurn;
                        continue;
                    }
                }
                const choice = turn.first().content;
                const picked = Number.parseInt(choice, 10);
                if (choice.toLowerCase() === 'end') {
                    winner = userTurn ? opponent : author;
                    break;
                }
                i = picked - 1;
            }
            if (board.length === 1) {
                winner = userTurn ? author : opponent;
                wonByFinalPiece = true;
            }
            const fell = Math.floor(Math.random() * ((board.length + 1) - (i + 1)));
            if (!fell) {
                winner = userTurn ? opponent : author;
                break;
            }
            await message.channel.send({
                embeds: [new MessageEmbed({
                    description: `${opponent.user.bot && !userTurn ? `I pick \`${i + 1}\`. ` : ''}The tower stands.`,
                    color: user.displayColor || 0x7289DA
                })]
            });
            board.shift();
            userTurn = !userTurn;
            if (lastTurnTimeout) lastTurnTimeout = false;
        }
        games.delete(message.channel.id);
        if (winner === 'time') return message.channel.send({ embeds: [errorEmbed('Game ended due to inactivity.')] });
        let text;
        if (wonByFinalPiece) {
            text = opponent.user.bot && !userTurn
                ? 'I pick up the last piece and win!'
                : `${winner} picks up the last piece, winning the game!`;
        } else {
            text = `${opponent.user.bot && !userTurn ? `I pick ${i + 1}, a` : 'A'}nd the tower topples!`;
        }
        message.channel.send({
            embeds: [new MessageEmbed({
                description: `${text}\n\n${winner ? `${winner} won and got ${settings.currencySymbol}**50**!` : 'Looks like it\'s a draw...'}`,
                color: winner.displayColor || 0x7289DA
            })]
        });
        if (winner) eco.balance.add(50, winner.id, message.guild.id, `Jenga.`);
    } catch (err) {
        games.delete(message.channel.id);
        throw err;
    }
}

async function jeopardy(message) {
    const current = games.get(message.channel.id);
    if (current) return message.reply({ embeds: [denyEmbed(`Please wait until the current game of **${current.name}** is finished.`)] });
    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    try {
        games.set(message.channel.id, { name: `Jeopardy` });
        const question = await jeopardyFetchQuestion();
        await message.reply({
            embeds: [new MessageEmbed({
                title: `${question.question.replace(/<\/?i>/gi, '*')}`,
                description: `The category is: \`${question.category.title.toUpperCase()}\`.`,
                color: message.member.displayHexColor || 0x7289DA,
                footer: {
                    text: 'You have 30 seconds to answer.',
                }
            })]
        });
        const filter = res => {
            if (res.author.id === message.author.id) return true;
        };
        const messages = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
        const answer = question.answer.replace(/<\/?i>/gi, '*');
        games.delete(message.channel.id);
        if (!messages.size) return message.channel.send({ embeds: [errorEmbed(`Time is up! The answer was **${answer}**.`)] });
        const win = messages.first().content.toLowerCase() === answer.toLowerCase();
        if (!win) return message.channel.send({ embeds: [denyEmbed(`The answer was **${answer}**.`)] });
        message.channel.send({ embeds: [confirmEmbed(`You won! The answer was **${answer}**.`)] });
        eco.balance.add(200, message.author.id, message.guild.id, `Guesspionage.`);
    } catch (err) {
        games.delete(message.channel.id);
        return message.reply({ embeds: [errorEmbed(`An error has occured. Try again later.`)] });
    }
}

async function connectfour(message, opponentText) {
    let opponent = await parseUserID(opponentText.toString());
    opponent = await message.guild.members.fetch(opponent);
    let author = await message.guild.members.fetch(message.author.id);
    if (opponent.id === message.author.id) return message.reply({ embeds: [denyEmbed(`You cannot play against yourself.`)] });
    const current = games.get(message.channel.id);
    if (current) return message.reply({ embeds: [denyEmbed(`Please wait until the current game of **${current.name}** is finished.`)] });
    games.set(message.channel.id, { name: `Connect 4` });
    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    const playerOneEmoji = '🔴';
    let playerTwoEmoji = '🔵';
    try {
        if (opponent.user.bot) {
            if (opponent.id == `851675125468233740` || opponent.id == `695017717324841091`) {
                playerTwoEmoji = '🍄';
            } else { playerTwoEmoji = '🟢'; }
        } else {
            await message.channel.send({ embeds: [confirmEmbed(`Do you accept this challenge?`)], content: `${opponent}` });
            const verification = await verify(message.channel, opponent);
            if (!verification) {
                games.delete(message.channel.id);
                return message.channel.send({ embeds: [errorEmbed(`${opponent} declined.`)] });
            }
        }
        const AIEngine = new Connect4AI();
        const board = c4GenerateBoard();
        let userTurn = true;
        let winner = null;
        const colLevels = [5, 5, 5, 5, 5, 5, 5];
        let lastMove = 'None';
        while (!winner && board.some(row => row.includes(null))) {
            const user = userTurn ? author : opponent;
            const sign = userTurn ? 'user' : 'oppo';
            let i;
            if (opponent.user.bot && !userTurn) {
                i = AIEngine.playAI('hard');
                lastMove = i + 1;
            } else {
                const emoji = userTurn ? playerOneEmoji : playerTwoEmoji;
                if (lastMove === 'None') {
                    firstEmbed = await message.channel.send({
                        embeds: [new MessageEmbed({
                            title: `${emoji} ${user.user.username}, which column do you pick?`,
                            description: `${opponent.user.bot ? `I placed mine in **${lastMove}**.` : `Previous move: **${lastMove}**`}`,
                            color: user.displayHexColor || 0x7289DA,
                            fields: [
                                {
                                    name: `Board`,
                                    value: stripIndents`${c4DisplayBoard(board, playerOneEmoji, playerTwoEmoji)}\n${c4Nums.join('')}`,
                                    inline: false
                                },
                            ],
                            footer: {
                                text: 'Type "end" to forfeit.\nType "play for me" to have the bot play for you.',
                            }
                        })]
                    });
                } else {
                    var edit1 = new MessageEmbed({
                        title: `${emoji} ${user.user.username}, which column do you pick?`,
                        description: `${opponent.user.bot ? `I placed mine in **${lastMove}**.` : `Previous move: **${lastMove}**`}`,
                        color: user.displayHexColor || 0x7289DA,
                        fields: [
                            {
                                name: `Board`,
                                value: stripIndents`${c4DisplayBoard(board, playerOneEmoji, playerTwoEmoji)}\n${c4Nums.join('')}`,
                                inline: false
                            },
                        ],
                        footer: {
                            text: 'Type "end" to forfeit.\nType "play for me" to have the bot play for you.',
                        }
                    });
                    await firstEmbed.edit({ embeds: [edit1] });
                }
                const pickFilter = res => {
                    if (res.author.id !== user.id) return false;
                    const choice = res.content;
                    if (choice.toLowerCase() === 'end') return true;
                    if (choice.toLowerCase() === 'play for me') return true;
                    const j = Number.parseInt(choice, 10) - 1;
                    return board[colLevels[j]] && board[colLevels[j]][j] !== undefined;
                };
                const turn = await message.channel.awaitMessages({ pickFilter, max: 1, time: 60000 });
                const choice = turn.size ? turn.first().content : null;
                if (!choice) {
                    await message.channel.send({ embeds: [errorEmbed(`Time is up! I'll move for them.`)] });
                    i = AIEngine.playAI('hard');
                    lastMove = i + 1;
                } else if (choice.toLowerCase() === 'end') {
                    winner = userTurn ? opponent.user : author;
                    break;
                } else if (choice.toLowerCase() === 'play for me') {
                    i = AIEngine.playAI('hard');
                    lastMove = i + 1;
                } else {
                    i = Number.parseInt(choice, 10) - 1;
                    AIEngine.play(i);
                    lastMove = i + 1;
                }
            }
            board[colLevels[i]][i] = sign;
            colLevels[i]--;
            if (c4VerifyWin(board)) winner = userTurn ? author : opponent;
            userTurn = !userTurn;
        }
        games.delete(message.channel.id);
        if (winner === 'time') return message.channel.send({ embeds: [errorEmbed(`Game ended due to inactivity.`)] });
        message.channel.send({
            embeds: [new MessageEmbed({
                description: `${winner ? `${winner} won the game and got ${settings.currencySymbol}**50**!` : 'It was a draw...'}\nFinal move: **${lastMove}**`,
                color: winner.displayHexColor || 0x7289DA,
                fields: [
                    {
                        name: `Board`,
                        value: stripIndents`${c4DisplayBoard(board, playerOneEmoji, playerTwoEmoji)}\n${c4Nums.join('')}`,
                        inline: false
                    },
                ]
            })]
        });
        if (winner) eco.balance.add(50, winner.id, message.guild.id, `Connect four.`);

    } catch (err) {
        games.delete(message.channel.id);
        throw err;
    }
}

async function fish(message) {
    const current = fishMap.get(message.author.id);
    if (current) return message.reply({ embeds: [denyEmbed(`You are already fishing in <#${current.channel}>!`)] });
    fishMap.set(message.author.id, { channel: message.channel.id });
    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    const fishID = Math.floor(Math.random() * 10) + 1;
    let rarity;
    if (fishID < 5) rarity = 'junk';
    else if (fishID < 8) rarity = 'common';
    else if (fishID < 10) rarity = 'uncommon';
    else rarity = 'rare';
    const fish = fishes[rarity];
    const worth = randomRange(fish.min, fish.max);
    await message.reply({
        embeds: [new MessageEmbed({
            description: `You cast your line out... Maybe you'll catch something soon!`,
            color: message.author.displayHexColor || 0x7289DA
        })]
    });
    await delay(300000);
    await message.reply({
        embeds: [new MessageEmbed({
            description: `You caught a ${fish.symbol}. You sold it for $${worth}.`,
            color: message.author.displayHexColor || 0x7289DA
        })]
    });
    fishMap.delete(message.author.id);
    eco.balance.add(worth, message.author.id, message.guild.id, `Fish.`);
}

async function math(message, difficulty) {
    let search = difficulty.toString().toLowerCase();
    if (!mathDifficulties.includes(search)) return message.reply({ embeds: [errorEmbed(`Please pick one of the following difficulties: **${list(mathDifficulties, 'or')}**.`)] });
    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    const operation = mathOperations[Math.floor(Math.random() * mathOperations.length)];
    let answer;
    let value1;
    let value2;
    switch (operation) {
        case '+':
            value1 = Math.floor(Math.random() * mathMaxValues[search]) + 1;
            value2 = Math.floor(Math.random() * mathMaxValues[search]) + 1;
            answer = value1 + value2;
            break;
        case '-':
            value1 = Math.floor(Math.random() * mathMaxValues[search]) + 1;
            value2 = Math.floor(Math.random() * mathMaxValues[search]) + 1;
            answer = value1 - value2;
            break;
        case '*':
            value1 = Math.floor(Math.random() * mathMaxMultiplyValues[search]) + 1;
            value2 = Math.floor(Math.random() * mathMaxMultiplyValues[search]) + 1;
            answer = value1 * value2;
            break;
    }
    let author = await message.guild.members.fetch(message.author.id);
    await message.reply({
        embeds: [new MessageEmbed({
            description: `${value1.toLocaleString()} ${operation} ${value2.toLocaleString()}`,
            color: author.displayHexColor || 0x7289DA,
            footer: {
                text: 'You have 10 seconds to answer.',
            }
        })]
    });
    const filter = res => {
        if (res.author.id === message.author.id) return true;
    };
    const messages = await message.channel.awaitMessages({ filter, max: 1, time: 10000 });
    if (!messages.size) return message.channel.send({ embeds: [errorEmbed(`Time is up! The answer was **${answer.toLocaleString()}**.`)] });
    if (messages.first().content !== answer.toString()) return message.channel.send({ embeds: [denyEmbed(`Wrong! The answer was **${answer.toLocaleString()}**.`)] });
    message.channel.send({ embeds: [confirmEmbed(`Congrats! The answer was **${answer.toLocaleString()}**.`)] });
    eco.balance.add((mathMaxMultiplyValues[search]) / 5, message.author.id, message.guild.id, `Math.`);
}

async function hangman(message) {
    const current = games.get(message.channel.id);
    if (current) return message.reply({ embeds: [denyEmbed(`Please wait until the current game of **${current.name}** is finished.`)] });
    games.set(message.channel.id, { name: `Hangman` });
    let settings = await database.getEcoSettings(message.guild.id);
    if (settings.length < 1) {
        await database.initGuild(message.guild.id);
        settings = await database.getEcoSettings(message.guild.id);
    }
    settings = settings[0];
    try {
        const word = words[Math.floor(Math.random() * words.length)].toLowerCase();
        let points = 0;
        let displayText = null;
        let guessed = false;
        const confirmation = [];
        const incorrect = [];
        const display = new Array(word.length).fill('_');
        while (word.length !== confirmation.length && points < 6) {
            if (displayText === null) {
                firstEmbed = await message.channel.send({
                    embeds: [new MessageEmbed({
                        author: { name: `Hangman` },
                        description: stripIndents`
                    ${displayText === null ? 'Here we go!' : displayText ? 'Good job!' : 'Nope!'}
                    \`${display.join(' ')}\`. Which letter do you choose? Type \`end\` to forfeit.
                    Incorrect Tries: ${incorrect.join(', ') || 'None'}
                    \`\`\`
                    ___________
                    |     |
                    |     ${points > 0 ? 'O' : ''}
                    |    ${points > 2 ? '—' : ' '}${points > 1 ? '|' : ''}${points > 3 ? '—' : ''}
                    |    ${points > 4 ? '/' : ''} ${points > 5 ? '\\' : ''}
                    ===========
                    \`\`\`
                `,
                        color: message.member.displayColor || 0x7289DA
                    })]
                });
            }
            else {
                edit = new MessageEmbed({
                    author: { name: `Hangman` },
                    description: stripIndents`
                    ${displayText === null ? 'Here we go!' : displayText ? 'Good job!' : 'Nope!'}
                    \`${display.join(' ')}\`. Which letter do you choose? Type \`end\` to forfeit.
                    Incorrect Tries: ${incorrect.join(', ') || 'None'}
                    \`\`\`
                    ___________
                    |     |
                    |     ${points > 0 ? 'O' : ''}
                    |    ${points > 2 ? '—' : ' '}${points > 1 ? '|' : ''}${points > 3 ? '—' : ''}
                    |    ${points > 4 ? '/' : ''} ${points > 5 ? '\\' : ''}
                    ===========
                    \`\`\`
                `,
                    color: message.member.displayColor || 0x7289DA
                });
                firstEmbed.edit({ embeds: [edit] });
            }
            const filter = res => {
                const choice = res.content.toLowerCase();
                return res.author.id === message.author.id && !confirmation.includes(choice) && !incorrect.includes(choice);
            };
            const guess = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
            if (!guess.size) {
                await message.channel.send({ embeds: [errorEmbed(`Time is up!`)] });
                break;
            }
            const choice = guess.first().content.toLowerCase();
            if (choice === 'end') break;
            if (choice.length > 1 && choice === word) {
                guessed = true;
                break;
            } else if (word.includes(choice)) {
                displayText = true;
                for (let i = 0; i < word.length; i++) {
                    if (word.charAt(i) !== choice) continue;
                    confirmation.push(word.charAt(i));
                    display[i] = word.charAt(i);
                }
            } else {
                displayText = false;
                if (choice.length === 1) incorrect.push(choice);
                points++;
            }
        }
        games.delete(message.channel.id);
        if (word.length === confirmation.length || guessed) {
            eco.balance.add(50, message.author.id, message.guild.id, `Hangman.`);
            return message.channel.send({ embeds: [confirmEmbed(`Correct! The word was **${word}**. You won ${settings.currencySymbol}**50**!`)] });
        }
        return message.channel.send({ embeds: [denyEmbed(`Wrong! The word was **${word}**.`)] });
    } catch (err) {
        games.delete(message.channel.id);
        return message.channel.send({ embeds: [errorEmbed(`There was an error: ${err.message}. Try again!`)] });
    }
}

//--------------------------------------------------------------------------------------------------------------------------------------

function makeGuessLeaderboard(pts) {
    let i = 0;
    let previousPts = null;
    let positionsMoved = 1;
    return pts
        .sort((a, b) => b.points - a.points)
        .map(player => {
            if (previousPts === player.points) {
                positionsMoved++;
            } else {
                i += positionsMoved;
                positionsMoved = 1;
            }
            previousPts = player.points;
            return `\`${i}.\` ${player.user} (${player.points.toLocaleString()} point${player.points === 1 ? '' : 's'})`;
        });
}

function jengaBoard(board) {
    return board.map((b, i) => `${i % 2 ? '          ' : jengaNums[i]}🟫🟫🟫🟫🟫${i % 2 ? jengaNums[i] : ''}`).join('\n');
}

async function jeopardyFetchQuestion() {
    const body = await axios.get('http://jservice.io/api/random');
    const data = [...body.data.values()];
    if (!data[0].question || !data[0].answer) {
        await jeopardyMarkInvalid(data[0].id);
        return fetchQuestion();
    }
    return data[0];
}

async function jeopardyMarkInvalid(id) {
    const body = await axios.post('http://jservice.io/api/invalid', { id });
    return body;
}

function c4CheckLine(a, b, c, d) {
    return (a !== null) && (a === b) && (a === c) && (a === d);
}

function c4VerifyWin(bd) {
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 7; c++) {
            if (c4CheckLine(bd[r][c], bd[r + 1][c], bd[r + 2][c], bd[r + 3][c])) return bd[r][c];
        }
    }
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
            if (c4CheckLine(bd[r][c], bd[r][c + 1], bd[r][c + 2], bd[r][c + 3])) return bd[r][c];
        }
    }
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
            if (c4CheckLine(bd[r][c], bd[r + 1][c + 1], bd[r + 2][c + 2], bd[r + 3][c + 3])) return bd[r][c];
        }
    }
    for (let r = 3; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
            if (c4CheckLine(bd[r][c], bd[r - 1][c + 1], bd[r - 2][c + 2], bd[r - 3][c + 3])) return bd[r][c];
        }
    }
    return null;
}

function c4GenerateBoard() {
    const arr = [];
    for (let i = 0; i < 6; i++) {
        arr.push([null, null, null, null, null, null, null]);
    }
    return arr;
}

function c4DisplayBoard(board, playerOneEmoji, playerTwoEmoji) {
    return board.map(row => row.map(piece => {
        if (piece === 'user') return playerOneEmoji;
        if (piece === 'oppo') return playerTwoEmoji;
        return c4BlankEmoji;
    }).join('')).join('\n');
}