const EventEmitter = require('events');
const StreamJsonObjects = require('stream-json/utils/StreamJsonObjects');
const net = require('net');

class StratumProxy extends EventEmitter {
	constructor(miner) {
		super();

		this.miner = miner;
		this.buffer = [];
		this.minerStream = StreamJsonObjects.make();

		this.miner.on('error', this.onError.bind(this));
		this.miner.on('end', this.destroy.bind(this));
		this.minerStream.output.on('data', this.onMinerJson.bind(this));

		this.miner.pipe(this.minerStream.input);
	}

	async handleAuthorization(address, minerName) {
		return { address, minerName };
	}

	async onMinerJson(object) {
		this.emit('data', object);
		const request = object.value;

		if (request.method === 'mining.authorize') {
			const currentWorker = request.params[0];
			const address = currentWorker.split('.')[0];
			const minerName = currentWorker.split('.')[1] || 'default';
			const conf = await this.handleAuthorization(address, minerName);

			request.params[0] = conf.address;
			request.params[1] = conf.minerName;

			object.value = request;

			this.buffer.push(object);

			const connect = {
				host: conf.poolAddress,
				port: conf.poolPort 
			};

			this.pool = net.connect(connect, () => this.onPoolConnect());
			this.poolStream = StreamJsonObjects.make();

			this.pool.on('error', this.onError.bind(this));
			this.pool.on('end', this.destroy.bind(this));
			this.pool.on('data', this.onPoolData.bind(this));
			this.poolStream.output.on('data', this.onPoolJson.bind(this));

			return this.pool.pipe(this.poolStream.input);
		}

		if (this.isPoolConnected) {
			this.pool.write(`${JSON.stringify(request)}\n`);
		}

		this.buffer.push(object);
	}

	onPoolJson(object) {
		this.emit('data', object);
	}

	onPoolData(data) {
		if (this.isMinerConnected) {
			this.miner.write(data);
		}
	}

	onError(err) {
		this.emit('error', err);
		this.destroy();
	}

	get isMinerConnected() {
		return this.miner && this.miner.remoteAddress;
	}

	get isPoolConnected() {
		return this.pool && this.pool.remoteAddress;
	}

	onPoolConnect() {
		if (!this.isMinerConnected) {
			return this.destroy();
		}

		this.emit('connected')

		this.buffer.forEach(object => {
			this.pool.write(`${JSON.stringify(object.value)}\n`);
		});

		this.buffer = [];
	}

	destroy() {
		const events = {
			names: ['error', 'end', 'data'],
			close: socket => {
				['error', 'end', 'data'].forEach(evt => socket.on(evt, function() {}));

				socket.end();
			}
		};

		if (this.isPoolConnected) {
			events.close(this.pool);
			this.pool.end();
		}
		this.pool = null;

		if (this.isMinerConnected) {
			events.close(this.miner);
			this.miner.end();
		}
		this.miner = null;

		this.emit('disconnected');
	}
}

module.exports = StratumProxy;
