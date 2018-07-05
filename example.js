const net = require('net');
const StratumProxy = require('./index');

const app = net.createServer(socket => {
	const connection = new StratumProxy(socket);

	connection.on('connected', () => console.log('connected'));
	connection.on('data', data => console.log('data', data));
	connection.on('error', error => console.log('error', error));
	connection.on('disconnected', () => console.log('disconnected'));
});

app.listen(3333, () => {
	console.log(`Proxy server listening at port 3333`);
});
