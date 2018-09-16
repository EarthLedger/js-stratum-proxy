const net = require('net');
const StratumProxy = require('./index');

const app = new StratumProxy({
	poolAddress: 'cryptonightheavy.usa.nicehash.com',
	poolPort: 3364,
	minerName: 'poolminer',
	address: '3Js4sXXk9Ca8Y52CezUxuZcDugVx8NtrDT',
});

app.listen(3333, () => {
	console.log(`Proxy server listening at port 3333`);
});
