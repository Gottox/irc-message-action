const IRC = require('irc-framework')
const eol = require('eol');
const core = require('@actions/core');
const github = require('@actions/github');

const client = new IRC.Client();
const throttled_interval = 1000;
const truncated_max_lines = 3;

function toBool(str) {
	return !!JSON.parse(str);
}

const inputs = {
	server: core.getInput('server'),
	port: core.getInput('port'),
	nickname: core.getInput('nickname'),
	sasl_password: core.getInput('sasl_password'),
	tls: toBool(core.getInput('tls')),
	message: core.getInput('message'),
	notice: toBool(core.getInput('notice')),
	channel: core.getInput('channel'),
	channel_key: core.getInput('channel_key'),
	response_allow_from: core.getInput('response_allow_from'),
	response_timeout: core.getInput('response_timeout'),
	debug: core.getInput('debug'),
	excess_flood: core.getInput('excess_flood'),
}

//const inputs = {
//	server: 'irc.libera.chat',
//	port: '6697',
//	nickname: 'gottox-test',
//	sasl_password: undefined,
//	tls: true,
//	message: "a\n".repeat(20),
//	notice: false,
//	channel: '##gottox-channel',
//	channel_key: undefined,
//	response_allow_from: "",
//	response_timeout: 10,
//	debug: true,
//	excess_flood: "throttle"
//}

process.exitCode = 1;

const excess_flood_func = (() => {
	switch (inputs.excess_flood) {
		case "throttle":
			return throttled;
		case "truncate":
			return truncated;
		default:
			console.error(`excess_flood must either be "truncate" or "throttle"`);
			return process.exit();
	}
})();

client.connect({
	host: inputs.server,
	port: inputs.port,
	nick: inputs.nickname,
	password: inputs.sasl_password,
	tls: inputs.tls,
});

function throttled(array, cb) {
	return new Promise(resolve => {
		let timeout = 0;
		let i = 0;
		const f = () => {
			cb(array[i]);
			i++;
			if (i >= array.length) {
				resolve();
			} else {
				setTimeout(f, i < truncated_max_lines ? 0 : throttled_interval);
			}
		}
		f();
	});
}

function truncated(array, cb) {
	return new Promise(resolve => {
		let i = 0;
		for (i = 0; i < array.length && i < truncated_max_lines; i++) {
			if (i + 1 == truncated_max_lines && i + 1 != array.length) {
				cb(array[i] + " [...]");
			} else {
				cb(array[i]);
			}
		}
		resolve();
	});
}

function sync(cb) {
	client.raw('VERSION');
	client.on('raw', (raw) => {
		let i = 1;
		const msg = raw.line.split(' ');

		// if the line has message-tags, the command index will be offset by 1
		if (msg[0][0] == '@') {
			i++;
		}

		if (msg[i] === '351') {
			return cb();
		}
	});

}

function finish_client() {
	if (inputs.notice === false) {
		client.part(inputs.channel);
	}
	client.part(inputs.channel);
	client.quit();
	process.exitCode = 0;
}

function handle_response() {
	const allow_from = inputs.response_allow_from
		.split(',').map(x => x.trim())

	console.log(`Waiting ${inputs.response_timeout} seconds for response`);

	const timeout = setTimeout(() => {
		console.log("Timeout waiting for response")
		finish_client()
	}, inputs.response_timeout * 1000);

	client.on('privmsg', (msg) => {
		let prefix = inputs.nickname + ": ";
		if (!msg.message.startsWith(prefix)) {
			return;
		}
		console.log(`Mention from ${msg.nick}. Check authentication of the account`)

		client.whois(msg.nick, (nick) => {
			if (!allow_from.includes(nick.account)) {
				return console.log(`${msg.nick}: account ${nick.account} is not in response_allow_from`)
			}

			core.setOutput("response", msg.message.substr(prefix.length));
			core.setOutput("response_from", nick.account)

			clearTimeout(timeout);
			finish_client();
		})
	})
}

if (inputs.debug) {
	client.on('debug', (ev) => {
		console.log('#', ev)
	});
	client.on('raw', (ev) => {
		console.log(ev.from_server ? '<' : '>', ev.line.trim());
	});
}

client.on('registered', () => {
	const messages = eol.split(inputs.message);
	let promise = null;

	if (inputs.notice) {
		promise = excess_flood_func(messages, (message) => {
			client.notice(inputs.channel, message);
		});
	} else {
		client.join(inputs.channel);
		promise = excess_flood_func(messages, (message) => {
			client.say(inputs.channel, message);
		});
	}
	promise.then(() => {
		if (inputs.response_allow_from && inputs.notice === false) {
			sync(handle_response)
		} else {
			sync(finish_client)
		}
	})
})
