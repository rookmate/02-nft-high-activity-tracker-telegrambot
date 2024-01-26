require('dotenv').config()
const { OpenSeaStreamClient, Network } = require('@opensea/stream-js');
const { WebSocket } = require('ws');
const accessSecrets = require('./utils/secrets');

async function getKey() {
  return process.argv.includes('--google')
    ? (await accessSecrets(['OPENSEA_KEY']))[0]
    : process.env.OPENSEA_KEY;
}

async function openseaSocket() {
  const openseaKey = await getKey();

  const client = new OpenSeaStreamClient({
    network: Network.MAINNET,
    token: openseaKey,
    connectOptions: {
      transport: WebSocket
    }
  });

  let soldEventBuffer = [];
  let listedEventBuffer = [];

  try {
    client.connect();

    client.onItemListed('*', async (event) => {
      if (event.payload.chain === 'ethereum') {
        listedEventBuffer.push(event);

        if (listedEventBuffer.length >= 5) {
          const currentTime = new Date(event.payload.event_timestamp).getTime();

          // Filter events within the 0.5-second window and same collection slug
          const recentEvents = listedEventBuffer.filter((bufferEvent) => {
            const bufferTime = new Date(bufferEvent.payload.event_timestamp).getTime();
            const timeDifference = currentTime - bufferTime;
            const sameCollectionSlug =
              event.payload.collection.slug === bufferEvent.payload.collection.slug;

            return timeDifference <= 500 && sameCollectionSlug;
          });

          if (recentEvents.length >= 5) {
            console.log(`${currentTime} Listed Events within 0.5s of each other and same collection slug (more than 5 events): ${recentEvents[0].payload.collection.slug}`);
            // recentEvents.forEach((recentEvent) => {
            //   console.log(recentEvent);
            // });
          }

          listedEventBuffer = [];
        }
      }
    });

    client.onItemSold('*', async (event) => {
      if (event.payload.chain === 'ethereum') {
        soldEventBuffer.push(event);

        if (soldEventBuffer.length >= 5) {
          const currentTime = new Date(event.payload.event_timestamp).getTime();

          // Filter events within the 0.5-second window and same collection slug
          const recentEvents = soldEventBuffer.filter((bufferEvent) => {
            const bufferTime = new Date(bufferEvent.payload.event_timestamp).getTime();
            const timeDifference = currentTime - bufferTime;
            const sameCollectionSlug =
              event.payload.collection.slug === bufferEvent.payload.collection.slug;

            return timeDifference <= 500 && sameCollectionSlug;
          });

          if (recentEvents.length >= 5) {
            console.log(`${currentTime} Sold Events within 0.5s of each other and same collection slug (more than 5 events):`);
            // recentEvents.forEach((recentEvent) => {
            //   console.log(recentEvent);
            // });
          }

          soldEventBuffer = [];
        }
      }
    });
  } catch (e) {
    console.log(e);
  }
}

openseaSocket()
