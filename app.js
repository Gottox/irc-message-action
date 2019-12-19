const IRC = require('irc-framework')
const core = require('@actions/core');
const github = require('@actions/github');

const client = new IRC.Client();

const inputs = {
	server: core.getInput('server'),
	port: core.getInput('port'),
	password: core.getInput('password'), // TODO
	nickname: core.getInput('nickname'),
	sasl_password: core.getInput('sasl_password'),
	tls: core.getInput('tls'),
	message: core.getInput('message'),
	notice: core.getInput('notice'),
	channel: core.getInput('channel'),
	channel_key: core.getInput('channel_key'),
}

//const inputs = {
//	server: 'chat.freenode.net',
//	port: '6697',
//	password: undefined,
//	nickname: 'gottox-test',
//	sasl_password: undefined,
//	tls: true,
//	message: "Hello World",
//	notice: true,
//	channel: '##gottox-channel',
//	channel_key: undefined,
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

client.on('registered', () => {
	if (inputs.notice) {
		client.notice(inputs.channel, inputs.message);
	} else {
		client.join(inputs.channel, inputs.message);
		client.say(inputs.channel, inputs.message);
		client.part(inputs.channel);
	}

	client.raw('VERSION');
	client.on('raw', (raw) => {
		const msg = raw.line.split(' ');
		if (msg[1] === '351') {
			process.exitCode = 0;
			client.part(inputs.channel);
			client.quit();
		}
	});
})
