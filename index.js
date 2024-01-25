require('dotenv').config()
const { OpenSeaStreamClient, Network } = require('@opensea/stream-js');
const { WebSocket } = require('ws');

const client = new OpenSeaStreamClient({
  network: Network.MAINNET,
  token: process.env.OPENSEA_KEY,
  connectOptions: {
    transport: WebSocket
  }
});

async function openseaSocket() {
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
            console.log(`${currentTime} Listed Events within 0.5s of each other and same collection slug (more than 5 events):`);
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
