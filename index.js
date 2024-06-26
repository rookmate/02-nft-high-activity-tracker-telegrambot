require('dotenv').config()
const { OpenSeaStreamClient, Network } = require('@opensea/stream-js');
const { WebSocket } = require('ws');
const accessSecrets = require('./utils/secrets');
const TelegramBot = require('node-telegram-bot-api');
const getFloorData = require('./utils/reservoir');

async function getOSKey() {
  return process.argv.includes('--google')
    ? (await accessSecrets(['OPENSEA_KEY']))[0]
    : process.env.OPENSEA_KEY;
}

async function getTelegramKey() {
  return process.argv.includes('--google')
    ? (await accessSecrets(['TELEGRAM_KEY']))[0]
    : process.env.TELEGRAM_KEY;
}

async function openseaSocket(telegram, chatID) {
  const numberOfEvents = 5;
  const openseaKey = await getOSKey();

  const client = new OpenSeaStreamClient({
    network: Network.MAINNET,
    token: openseaKey,
    connectOptions: {
      transport: WebSocket
    }
  });

  let sweepEventBuffer = [];
  let dumpEventBuffer = [];

  try {
    client.connect();

    client.onItemSold('*', async (event) => {
      if (event.payload.chain === 'ethereum') {
        if (event.payload.payment_token.symbol === "ETH") {
          sweepEventBuffer.push(event);

          if (sweepEventBuffer.length >= numberOfEvents) {
            const currentTime = new Date(event.payload.event_timestamp).getTime();

            // Filter events within the 0.5-second window and same collection slug
            const recentEvents = sweepEventBuffer.filter((bufferEvent) => {
              const bufferTime = new Date(bufferEvent.payload.event_timestamp).getTime();
              const timeDifference = currentTime - bufferTime;
              const sameCollectionSlug =
                event.payload.collection.slug === bufferEvent.payload.collection.slug;

              return timeDifference <= 500 && sameCollectionSlug;
            });

            if (recentEvents.length >= numberOfEvents) {
              const collectionSlug = recentEvents[0].payload.collection.slug;
              const reservoirData = await getFloorData(collectionSlug);
              if (reservoirData && reservoirData.price > 0.05) {
                const itemImageUrl = recentEvents[0].payload.item.metadata.image_url;
                const collectionPermalink = recentEvents[0].payload.item.permalink.replace(/\/\d+$/, ''); // Remove the item part;
                const message = `🧹 [${reservoirData.name}](${collectionPermalink}) had at least ${numberOfEvents} items swept 🧹\nFloor price: ${reservoirData.price} ${reservoirData.symbol}`;
                console.log(`${currentTime} Listed Events within 0.5s of each other and same collection slug (more than ${numberOfEvents} events): ${recentEvents[0].payload.collection.slug}`);
                telegram.sendMessage(chatID, message, { parse_mode: "Markdown" });
              }
            }

            sweepEventBuffer = [];
          }
        }

        if (event.payload.payment_token.symbol === "WETH") {
          dumpEventBuffer.push(event);

          if (dumpEventBuffer.length >= numberOfEvents) {
            const currentTime = new Date(event.payload.event_timestamp).getTime();

            // Filter events within the 0.5-second window and same collection slug
            const recentEvents = dumpEventBuffer.filter((bufferEvent) => {
              const bufferTime = new Date(bufferEvent.payload.event_timestamp).getTime();
              const timeDifference = currentTime - bufferTime;
              const sameCollectionSlug =
                event.payload.collection.slug === bufferEvent.payload.collection.slug;

              return timeDifference <= 500 && sameCollectionSlug;
            });

            if (recentEvents.length >= numberOfEvents) {
              const collectionSlug = recentEvents[0].payload.collection.slug;
              const reservoirData = await getFloorData(collectionSlug);
              if (reservoirData && reservoirData.price > 0.01) {
                const itemImageUrl = recentEvents[0].payload.item.metadata.image_url;
                const collectionPermalink = recentEvents[0].payload.item.permalink.replace(/\/\d+$/, ''); // Remove the item part;
                const message = `📉 [${reservoirData.name}](${collectionPermalink}) had at least ${numberOfEvents} items dumped 📉\nFloor price: ${reservoirData.price} ${reservoirData.symbol}`;
                console.log(`${currentTime} Dumped Events within 0.5s of each other and same collection slug (more than ${numberOfEvents} events): ${recentEvents[0].payload.collection.slug}`);
                telegram.sendMessage(chatID, message, { parse_mode: "Markdown" });
              }
            }

            dumpEventBuffer = [];
          }
        }
      }
    });
  } catch (e) {
    console.log(e);
  }
}

async function main() {
  const telegramKey = await getTelegramKey();
  const bot = new TelegramBot(telegramKey, { polling: true });

  bot.onText(/\/start/, async(msg) => {
    const chatID = msg.chat.id;
    bot.sendMessage(chatID, `Starting monitor`);
    console.log(`Starting monitor`);
    try {
      openseaSocket(bot, chatID);
    } catch (e) {
      bot.sendMessage(chatID, `Something went wrong. Bot is no longer tracking.`);
      console.log(JSON.stringify(e));
    }
  });
}

main();
