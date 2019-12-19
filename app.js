const IRC = require('irc-framework')
const core = require('@actions/core');
const github = require('@actions/github');

const client = new IRC.Client();

function toBool(str) {
	return !!JSON.parse(str);
}

const inputs = {
	server: core.getInput('server'),
	port: core.getInput('port'),
	password: core.getInput('password'), // TODO
	nickname: core.getInput('nickname'),
	sasl_password: core.getInput('sasl_password'),
	tls: toBool(core.getInput('tls')),
	message: core.getInput('message'),
	notice: toBool(core.getInput('notice')),
	channel: core.getInput('channel'),
	channel_key: core.getInput('channel_key'),
	response_allow_from: core.getInput('response_allow_from'),
	response_timeout: core.getInput('response_timeout'),
}

//const inputs = {
//	server: 'chat.freenode.net',
//	port: '6697',
//	password: undefined,
//	nickname: 'gottox-test',
//	sasl_password: undefined,
//	tls: true,
//	message: "Hello World",
//	notice: false,
//	channel: '##gottox-channel',
//	channel_key: undefined,
//	response_allow_from: "Gottox",
//	response_timeout: 10
//}

process.exitCode = 1;

client.connect({
	host: inputs.server,
	port: inputs.port,
	nick: inputs.nickname,
	password: inputs.sasl_password,
	tls: inputs.tls,
});

client.on('debug', (msg) => {
	console.log(msg);
});

function sync(cb) {
	client.raw('VERSION');
	client.on('raw', (raw) => {
		const msg = raw.line.split(' ');
		if (msg[1] === '351') {
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
		console.log(`Mention from ${msg.nick}. Check for his account`)

		client.whois(msg.nick, (nick) => {
			if (!allow_from.includes(nick.account)) {
				return console.log(`${msg.nick}: Account ${nick.account} is not in response_allow_from`)
			}

			core.setOutput("response", msg.message.substr(prefix.length));
			core.setOutput("response_from", nick.account)

			clearTimeout(timeout);
			finish_client();
		})
	})
}

client.on('registered', () => {
	if (inputs.notice) {
		client.notice(inputs.channel, inputs.message);
	} else {
		client.join(inputs.channel, inputs.message);
		client.say(inputs.channel, inputs.message);
	}

	if (inputs.response_allow_from && inputs.notice === false) {
		sync(handle_response)
	} else {
		sync(finish_client)
	}
})
