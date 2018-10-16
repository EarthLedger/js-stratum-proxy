const JsonTcpSocket = require('./JsonTcpSocket');
const PoolSocket = require('./PoolSocket');
const net = require('net');
const moment = require('moment');

class MinerSocket extends JsonTcpSocket {
	constructor(socket, config = {}) {
		super(socket);

		this.buffer = [];
		this.config = config;

		this.on('close', () => this.log('Miner Disconnected'));
		this.on('error', e => this.log(`[Error]\n ${e}`));
	}

	async onData(data) {
		const request = data.value;
		const method = request.method;

		this.emit('data', request);

		if (method === 'mining.submit' || method === 'submit') {
			this.log('Submitted Share');
			this.emit('submit', data.value);
		}

		if (['mining.authorize', 'login', 'eth_submitLogin'].includes(method) || request.id === 2) {
			this.emit('authorize', data.value);

			const currentWorker = request.params[0] || request.params.login;
			this.address = currentWorker.split('.')[0];
			this.minerName = currentWorker.split('.')[1];
			let config;

			try {
				config = await this.handleAuthorization();
			} catch (e) {
				this.log(e);
				this.destroy();

				return;
			}

			request.params[0] = `${config.address}.${config.minerName}`;
			request.params.login = `${config.address}.${config.minerName}`;

			this.buffer.push(request);

			const connect = {
				host: config.poolAddress,
				port: config.poolPort
			};

			this.poolSocket = net.connect(
				connect,
				() => this.onPoolConnect()
			);
			this.pool = new PoolSocket(this.poolSocket, this);

			this.pool.on('data', e => {
				this.emit('data', e);
			});
			this.pool.on('authenticated', e => {
				this.log('Authenticated');
				this.emit('authenticated', e);
			});

			this.pool.on('shareAccepted', e => {
				this.log('Share Accepted');
				this.emit('shareAccepted', e);
			});
			this.pool.on('shareRejected', e => {
				this.log('Share Rejected');
				this.emit('shareRejected', e);
			});
			this.pool.on('notify', e => {
				this.log('New Job');
				this.emit('notify', data.value);
			});
			this.pool.on('error', e => this.log(`[Error]\n ${e}`));
			this.pool.on('close', e => this.log(`Pool Disconnected`));

			return;
		}

		if (this.isPoolConnected) {
			return this.write(request);
		}

		this.buffer.push(request);
	}

	async handleAuthorization() {
		const config = {
			address: this.address,
			minerName: this.minerName
		};

		if (typeof this.config === 'function') {
			return await this.config(config);
		}

		return Object.assign({}, config, this.config);
	}

	write(data) {
		if (!this.isPoolConnected) {
			return;
		}

		return this.pool.socket.write(`${JSON.stringify(data)}\n`);
	}

	onPoolConnect() {
		this.log('Connected');

		this.buffer.forEach(each => {
			this.write(each);
		});

		delete this.buffer;
	}

	get isPoolConnected() {
		return this.pool && this.pool.isConnected;
	}

	log(message) {
		this.emit('log', `[${moment().format()}][${this.minerName}][${this.address || ''}] ${message}`);
	}
}

module.exports = MinerSocket;
