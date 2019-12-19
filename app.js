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

client.connect({
	host: inputs.server,
	port: inputs.port,
	nick: inputs.nickname,
	password: inputs.sasl_password,
	tls: inputs.tls,
});

client.on('raw', function(raw) {
	const pre = raw.from_server ? "<<<" : ">>>";
	console.log(pre + " " + raw.line);
})

client.on('registered', function() {
	let channel = client.channel(inputs.channel, inputs.channel_key);
	if (inputs.notice) {
		channel.notice(inputs.message);
	} else {
		channel.join();
		channel.say(inputs.message);
	}
	client.quit("Bye!");
});
