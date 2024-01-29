require('dotenv').config();
const sdk = require('api')('@reservoirprotocol/v3.0#j7ej3alr9o3etb');
const accessSecrets = require('./secrets');

async function getFloorData(collectionSlug) {
  try {
    const key = process.argv.includes('--google')
      ? (await accessSecrets(['RESERVOIR_KEY']))[0]
      : `${process.env.RESERVOIR_KEY}`;
    await sdk.auth(key);
    const response = await sdk.getCollectionsV7({ slug: collectionSlug, accept: '*/*' });
    const parsedData = response.data.collections.map(collection => ({
      "address": collection.id.toLowerCase(),
      "slug": collection.slug,
      "name": collection.name,
      "price": collection.floorAsk.price.amount.decimal,
      "symbol": collection.floorAsk.price.currency.symbol
    }));

    return parsedData[0];
  } catch (error) {
    console.error(error);
  }
}

module.exports = getFloorData
