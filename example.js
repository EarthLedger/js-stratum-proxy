const net = require('net');
const StratumProxy = require('./index');

const poolAddress = process.env.POOL_ADDRESS || 'daggerhashimoto.usa.nicehash.com';
const poolPort = process.env.POOL_PORT || 3353;
const minerName = process.env.MINER_NAME || 'proxy';
const address = process.env.MINER_ADDRESS || '3Js4sXXk9Ca8Y52CezUxuZcDugVx8NtrDT';

const app = new StratumProxy({
	poolAddress,
	poolPort,
	minerName,
	address
});

app.on('log', ({ response }) => console.log(response));
app.on('data', ({ response }) => console.log(response));

app.listen(3333);
