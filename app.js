const IRC = require('irc-framework')

const core = require('@actions/core');
const github = require('@actions/github');

const client = new IRC.Client();
client.connect({
	host: core.getInput('server'),
	port: core.getInput('port'),
	// TODO password <- server password
	nick: core.getInput('nickname'),
	password: core.getInput('sasl_password'),
	tls: core.getInput('tls'),
});
const options = {
	message: core.getInput('message'),
	notice: core.getInput('notice'),
	channel: core.getInput('channel'),
	channel_key: core.getInput('channel_key')
}

client.on('registered', function() {
	let channel = client.channel(options.channel, options.channel_key);
	if (options.notice) {
		channel.notice(options.message);
	} else {
		channel.join();
		channel.say(options.message);
	}
	client.quit("Bye!");
});
