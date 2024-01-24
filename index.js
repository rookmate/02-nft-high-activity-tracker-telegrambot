require('dotenv').config()
const { OpenSeaStreamClient, Network } = require('@opensea/stream-js');
const { WebSocket } = require('ws');

const client = new OpenSeaStreamClient({
  network: Network.MAINNET,
  token: `${process.env.OPENSEA_API_KEY}`,
  connectOptions: {
    transport: WebSocket
  }
});

async function openseaSocket () {
  try {
    client.connect()
    client.onItemTransferred('*', async (event) => {
      console.log(event);
    })
  } catch (e) {
      console.log(e);
  }
}

openseaSocket()
