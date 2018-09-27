const JsonTcpSocket = require('./JsonTcpSocket');
const PoolSocket = require('./PoolSocket');
const net = require('net');

class MinerSocket extends JsonTcpSocket {
	constructor(socket, config = {}) {
		super(socket);

		this.buffer = [];
		this.config = config;
	}

	async onData(data) {
		this.emit('data', data.value);
		const request = data.value;
		const method = request.method

		if (method === 'mining.submit' || method === 'submit') {
			this.emit('submit', request);
		}

		if (method === 'mining.authorize' || method === 'login') {
			this.emit('authorize', request);
			const currentWorker = request.params[0] || request.params.login;
			const address = currentWorker.split('.')[0];
			const minerName = currentWorker.split('.')[1] || 'default';
			const config = await this.handleAuthorization({ address, minerName });

			request.params[0] = `${config.address}.${config.minerName}`;
			request.params.login = `${config.address}.${config.minerName}`;

			this.buffer.push(request);

			const connect = {
				host: config.poolAddress,
				port: config.poolPort 
			};

			this.poolSocket = net.connect(connect, () => this.onPoolConnect());
			this.pool = new PoolSocket(this.poolSocket, this);

			this.pool.on('data', e => this.emit('poolData', e));
			this.pool.on('error', e => this.emit('poolError', e));

			return;
		}

		if (this.isPoolConnected) {
			return this.write(request);
		}

		this.buffer.push(request);
	}

	async handleAuthorization(config) {
		if (typeof this.config === 'function') {
			return await this.config(config);
		}

		return Object.assign({}, config, this.config);
	}

	write(data) {
		if (!this.isPoolConnected) {
			return this.emit('error', new Error('disconnected'));
		}

		return this.pool.socket.write(`${JSON.stringify(data)}\n`);
	}

	onPoolConnect() {
		this.buffer.forEach(each => {
			this.write(each);
		});

		delete this.buffer;
	}

	get isPoolConnected() {
		return this.pool && this.pool.isConnected;
	}
}

module.exports = MinerSocket;
