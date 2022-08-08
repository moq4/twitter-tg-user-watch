require('dotenv').config();
import TelegramBot from 'node-telegram-bot-api';
import {streamConnect} from './twitterStream';

const botToken = process.env.TG_BOT_API_KEY!;
const tgChatId = process.env.TG_CHAT_ID!;

const bot = new TelegramBot(botToken, {polling: true});

// Ping
bot.on('message', (message) => {
	if (message.text === 'pee pee') {
		bot.sendMessage(message.chat.id, 'poo poo');
	}
});

streamConnect(0, (tweet: string) => bot.sendMessage(tgChatId, tweet));
