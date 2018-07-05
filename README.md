# js-stratum-proxy
Proxy stratum mining either programatically or staticlly to your desired stratum mining pool.

## Install
```bash
npm i js-stratum-proxy
```

## Example Usage
You may choose which pools to proxy to by overiding `handleAuthorization`. The object you return will be used to create
a connection with the pool. 
```javascript
const net = require('net');
const StratumProxy = require('js-stratum-proxy');

class MyStratumProxy extends StratumProxy {
  async handleAuthorization(address, minerName) {
    const { poolAddress, poolPort } = await getPoolDataForAddressFromSomewhere(address);
    
    // Make sure you return an object with these keys
    return { address, minerName, poolAddress, poolPort };
  }
}

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

```
