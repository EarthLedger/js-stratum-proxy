const StreamJsonObjects = require('stream-json/utils/StreamJsonObjects');
const EventEmitter = require('events');

class JsonTcpSocket extends EventEmitter {
	constructor(socket) {
		super();

		this.socket = socket;
		this.stream = StreamJsonObjects.make();

		this.socket.pipe(this.stream.input);

		this.socket.on('error', this.onError.bind(this));
		this.socket.on('close', this.onClose.bind(this));
		this.stream.output.on('data', this.onData.bind(this));
	}

	onError(err) {
		this.emit('error', err);
	}

	onClose() {
		this.emit('close');
	}

	onData() {
		throw new Error('You must implement `onData`');
	}

	isConnected() {
		return this.socket && this.socket.remoteAddress;
	}

	destroy() {
		const events = ['error', 'end', 'data'];

		events.forEach(e => this.socket.on(e, () => {}));
		this.socket.end();
		delete this.socket;
	}
}

module.exports = JsonTcpSocket;
