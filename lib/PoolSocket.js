const JsonTcpSocket = require('./JsonTcpSocket');

class PoolSocket extends JsonTcpSocket {
	constructor(socket, miner) {
		super(socket);

		this.miner = miner;
	}

	onData(data) {
		this.emit('data', data.value);
		const request = data.value;
		const method = request.method;

		if (method === 'job' || method === 'mining.notify') {
			this.emit('notify', request);
		}

		if (this.isMinerConnected) {
			return this.write(request);
		}
	}

	write(data) {
		if (!this.isMinerConnected) {
			return this.emit('error', new Error('disconnected'));
		}

		return this.miner.socket.write(`${JSON.stringify(data)}\n`);
	}

	get isMinerConnected() {
		return this.miner && this.miner.isConnected;
	}
}

module.exports = PoolSocket;
