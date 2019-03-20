const JsonTcpSocket = require('./JsonTcpSocket');
const PoolSocket = require('./PoolSocket');
const net = require('net');
const moment = require('moment');
const uuidv4 = require('uuid/v4');

class MinerSocket extends JsonTcpSocket {
	constructor(socket, config = {}) {
		super(socket);

		this.buffer = [];
		this.config = config;
		this.id = uuidv4();
		this.createdAt = new Date();
		this.rejectedShares = 0;
		this.acceptedShares = 0;

		console.log(`New connection from ${socket.remoteAddress}, waiting for login`)

		this.on('close', () => {
			this.emitMessage('minerDisconnect', null, 'Miner Disconnected');

			if (this.isPoolConnected) {
				this.pool.socket.end();
			}
		});
		this.on('error', e => this.emitMessage('minerError', null, `[Error]\n${e}`));
	}

	async onData(data) {
		const request = data.value;
		const method = request.method;

		this.emitMessage('data', request);

		if (method === 'mining.submit' || method === 'submit') {
			this.emitMessage('submit', data.value, 'Submit Share');
		}

		if (['mining.authorize', 'login', 'eth_submitLogin'].includes(method)) {
			const currentWorker = request.params[0] || request.params.login;
			this.address = currentWorker.split('.')[0];
			this.minerName = currentWorker.split('.')[1];
			let config;

			this.emitMessage('authorize', data.value, 'Authenticating...');

			try {
				config = await this.handleAuthorization();
				this._config = config;
			} catch (e) {
				this.emitMessage('authorizationError', e);
				this.destroy();

				return;
			}

			if (request.params[0]) {
				request.params[0] = `${config.address}.${config.minerName}`;
			} else {
				request.params.login = `${config.address}.${config.minerName}`;
			}

			this.buffer.push(request);

			const connect = {
				host: config.poolAddress,
				port: config.poolPort
			};

			const poolSocket = net.connect(
				connect,
				() => this.onPoolConnect()
			);
			this.pool = new PoolSocket(poolSocket, this);
			this.initPoolListeners();

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

	initPoolListeners() {
		this.pool.on('data', e => this.emitMessage('data', e));
		this.pool.on('authenticated', e => this.emitMessage('authenticated', e, 'Authenticated'));
		this.pool.on('shareAccepted', e => {
			this.emitMessage('shareAccepted', e, 'Share Accepted');
			this.acceptedShares = this.acceptedShares + 1;
		});
		this.pool.on('shareRejected', e => {
			this.emitMessage('shareRejected', e, 'Share Rejected');
			this.rejectedShares = this.rejectedShares + 1;
		});
		this.pool.on('notify', e => this.emitMessage('notify', e, 'New Job'));
		this.pool.on('error', e => this.emitMessage('poolError', e, `[Error]\n${e}`));
		this.pool.on('close', e => {
			this.emitMessage('poolDisconnect', null, 'Pool Disconnected');

			if (this.isConnected) {
				this.socket.end();
			}
		});
	}

	emitMessage(event, response, log) {
		this.emit(event, {
			response,
			id: this.id,
			address: this.address,
			minerName: this.minerName,
			acceptedShares: this.acceptedShares,
			rejectedShares: this.rejectedShares,
			createdAt: this.createdAt,
			updatedAt: new Date(),
			config: this._config
		});

		if (log) {
			this.log(log);
		}
	}

	write(data) {
		if (!this.isPoolConnected) {
			return;
		}

		return this.pool.socket.write(`${JSON.stringify(data)}\n`);
	}

	onPoolConnect() {
		this.log(`Connected to ${this.pool.socket._host} (${this.pool.socket.remoteAddress})`);

		this.buffer.forEach(each => {
			this.write(each);
		});

		delete this.buffer;
	}

	get isPoolConnected() {
		return this.pool && this.pool.isConnected;
	}

	log(message) {
		this.emitMessage('log', `[${this.minerName || 'minerName'}][${this.address || ''}] ${message}`);
	}
}

module.exports = MinerSocket;
