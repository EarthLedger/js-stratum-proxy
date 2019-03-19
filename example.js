const net = require('net');
const StratumProxy = require('./index');

const app = new StratumProxy({
	poolAddress: 'daggerhashimoto.usa.nicehash.com',
	poolPort: 3353,
	minerName: 'proxy',
	address: '3Js4sXXk9Ca8Y52CezUxuZcDugVx8NtrDT'
});

app.on('log', ({ response }) => console.log(response));

app.listen(3333);
