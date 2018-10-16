const JsonTcpSocket = require('./JsonTcpSocket');

class PoolSocket extends JsonTcpSocket {
	constructor(socket, miner) {
		super(socket);

		this.miner = miner;
	}

	onData(data) {
		const request = data.value;
		const method = request.method;

		this.emit('data', request);

		if (method === 'job' || method === 'mining.notify') {
			this.emit('notify', request);
		}

		if (request.id <= 2 && request.result === true) {
			this.emit('authenticated', request);
		}

		if (request.id > 2) {
			this.emit(request.result === true ? 'shareAccepted' : 'shareRejected', request);
		}

		return this.write(request);
	}

	write(data) {
		if (!this.isMinerConnected) {
			return this.emit('error', 'disconnected');
		}

		try {
			return this.miner.socket.write(`${JSON.stringify(data)}\n`);
		} catch (e) {
			this.emit('error', e);
			this.miner.destroy();
			this.destroy();
		}
	}

	get isMinerConnected() {
		return this.miner && this.miner.isConnected;
	}
}

module.exports = PoolSocket;
