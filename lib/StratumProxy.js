const EventEmitter = require('events');
const net = require('net');

const MinerSocket = require('./MinerSocket');

class StratumProxy extends EventEmitter {
	constructor(config) {
		super();

		this.app = net.createServer(socket => {
			const connection = new MinerSocket(socket, config);

			connection.on('error', e => this.log('MINER ERROR', e));
			connection.on('data', e => this.log('MINER DATA', e));
			connection.on('poolError', e => this.log('POOL ERROR', e));
			connection.on('poolData', e => this.log('POOL DATA', e));
		});
	}

	listen(port, callback = () => {}) {
		return this.app.listen(port, callback);
	}

	log(...args) {
		this.emit('log', ...args);
	}
}

module.exports = StratumProxy;
