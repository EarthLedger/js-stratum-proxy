const EventEmitter = require('events');
const net = require('net');

const MinerSocket = require('./MinerSocket');

class StratumProxy extends EventEmitter {
	constructor(config) {
		super();

		this.app = net.createServer(socket => {
			const connection = new MinerSocket(socket, config);

			connection.on('log', console.log);
			connection.on('authorize', console.log);
		});
	}

	listen(port, callback = () => {}) {
		return this.app.listen(port, callback);
	}
}

module.exports = StratumProxy;
