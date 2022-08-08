require('dotenv').config();
import needle from 'needle';

interface TwitterStreamRule {
	value: string;
	tag: string;
}

const token = process.env.TWITTER_BEARER_TOKEN;

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream';

const setRules = async (rules: TwitterStreamRule[]) => {
	const data = {
		add: rules,
	};

	const response = await needle('post', rulesURL, data, {
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		},
	});

	if (response.statusCode !== 201) {
		throw new Error(response.body);
	}

	return response.body;
};

const getAllRules = async () => {
	const response = await needle('get', rulesURL, {
		headers: {
			authorization: `Bearer ${token}`,
		},
	});

	if (response.statusCode !== 200) {
		console.log('Error:', response.statusMessage, response.statusCode);
		throw new Error(response.body);
	}

	return response.body as TwitterStreamRule;
};

export const streamConnect = (retryAttempt: number, handleMessage: (tweet: string) => void) => {
	const stream = needle.get(streamURL, {
		headers: {
			'User-Agent': 'v2FilterStreamJS',
			Authorization: `Bearer ${token}`,
		},
		timeout: 20000,
	});

	stream
		.on('data', (data) => {
			try {
				const json = JSON.parse(data);
				console.log(json);
				handleMessage(json.data.text);
				// A successful connection resets retry count.
				retryAttempt = 0;
			} catch (e) {
				if (data.detail === 'This stream is currently at the maximum allowed connection limit.') {
					console.log(data.detail);
					process.exit(1);
				} else {
					// Keep alive signal received. Do nothing.
				}
			}
		})
		.on('err', (error) => {
			if (error.code !== 'ECONNRESET') {
				console.log(error.code);
				process.exit(1);
			} else {
				// This reconnection logic will attempt to reconnect when a disconnection is detected.
				// To avoid rate limits, this logic implements exponential backoff, so the wait time
				// will increase if the client cannot reconnect to the stream.
				setTimeout(() => {
					console.warn('A connection error occurred. Reconnecting...');
					streamConnect(++retryAttempt, handleMessage);
				}, 2 ** retryAttempt);
			}
		});

	return stream;
};
