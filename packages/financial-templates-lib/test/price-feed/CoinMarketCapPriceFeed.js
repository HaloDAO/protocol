const { CoinMarketCapPriceFeed } = require("../../src/price-feed/CoinMarketCapPriceFeed");
const { NetworkerMock } = require("../../src/price-feed/NetworkerMock");
const winston = require("winston");

contract("CoinMarketCapPriceFeed.js", function() {
  let coinMarketCapPriceFeed;
  let networker;
  let mockTime;

  const apiKey = "test-api-key";
  const symbol = "DAI";
  const convert = "PHP";
  const lookback = 120; // 2 minutes.
  const getTime = () => mockTime;
  const minTimeBetweenUpdates = 60;
  const priceFeedDecimals = 18;

  const { toWei, toBN } = web3.utils;

  const mockPrice = 48.200162117610525;
  const validResponse = {
    data: {
      DAI: {
        quote: {
          PHP: {
            price: mockPrice
          }
        }
      }
    }
  };

  beforeEach(async function() {
    networker = new NetworkerMock();
    mockTime = (new Date()).getTime();

    const dummyLogger = winston.createLogger({
      level: "info",
      transports: [new winston.transports.Console()]
    });

    coinMarketCapPriceFeed = new CoinMarketCapPriceFeed(
      dummyLogger,
      web3,
      apiKey,
      symbol,
      convert,
      lookback,
      networker,
      getTime,
      minTimeBetweenUpdates,
      false,
      priceFeedDecimals
    );
  });

  it("getCurrentPrice() returns the latest price", async function() {
    networker.getJsonReturns = [ validResponse ];

    await coinMarketCapPriceFeed.update();

    const price = coinMarketCapPriceFeed.getCurrentPrice()
    assert.equal(price.toString(), toWei(`${mockPrice}`));
  });

  it("getCurrentPrice() returns undefined if update() is never called", async function() {
    const price = coinMarketCapPriceFeed.getCurrentPrice()
    assert.equal(price, undefined);
  });

  it("getHistoricalPrice() returns the price for the specified time", async function() {
    // Run a series of updates()
    networker.getJsonReturns = [
      { data: { DAI: { quote: { PHP: { price: mockPrice } } } } },
      { data: { DAI: { quote: { PHP: { price: mockPrice + 1 } } } } },
      { data: { DAI: { quote: { PHP: { price: mockPrice + 2 } } } } }
    ];

    const originalMockTime = mockTime;
    await coinMarketCapPriceFeed.update(); // should produce { mockTime, mockPrice }
    mockTime += 300;
    await coinMarketCapPriceFeed.update(); // should produce { mockTime + 300, mockPrice + 1 }
    mockTime += 300;
    await coinMarketCapPriceFeed.update(); // should produce {  mockTime + 600, mockPrice + 2 }

    // Do assertions for each period
    const price1 = coinMarketCapPriceFeed.getHistoricalPrice(originalMockTime);
    assert.equal(price1.toString(), toWei(`${mockPrice}`));

    const price2 = coinMarketCapPriceFeed.getHistoricalPrice(originalMockTime + 300);
    assert.equal(price2.toString(), toWei(`${mockPrice + 1}`));

    const price3 = coinMarketCapPriceFeed.getHistoricalPrice(originalMockTime + 600);
    assert.equal(price3.toString(), toWei(`${mockPrice + 2}`));
  });

  it("getHistoricalPrice() returns undefined if update() is never called", async function() {
    const price = coinMarketCapPriceFeed.getHistoricalPrice(mockTime)
    assert.equal(price, undefined);
  });

  it("getHistoricalPrice() returns the price if the time is within the lookout window", async function() {
    networker.getJsonReturns = [ validResponse ];

    await coinMarketCapPriceFeed.update();

    const price = coinMarketCapPriceFeed.getHistoricalPrice(mockTime - lookback)
    assert.equal(price.toString(), toWei(`${mockPrice}`));
  });

  it("getHistoricalPrice() returns undefined if the time is before the lookout window", async function() {
    networker.getJsonReturns = [ validResponse ];

    await coinMarketCapPriceFeed.update();

    const price = coinMarketCapPriceFeed.getHistoricalPrice(mockTime - lookback - 1)
    assert.equal(price, undefined);
  });

  it("getHistoricalPrice() returns undefined if the time is after the lookout window", async function() {
    networker.getJsonReturns = [ validResponse ];

    await coinMarketCapPriceFeed.update();

    const price = coinMarketCapPriceFeed.getHistoricalPrice(mockTime + 1)
    assert.equal(price, undefined);
  });

  it("getLastUpdateTime() returns the time when update() was last called", async function() {
    networker.getJsonReturns = [ validResponse ];

    await coinMarketCapPriceFeed.update();

    assert.equal(coinMarketCapPriceFeed.getLastUpdateTime(), mockTime);
  });

  it("getLastUpdateTime() returns undefined if update() is never called", async function() {
    assert.equal(coinMarketCapPriceFeed.getLastUpdateTime(), undefined);
  });

  it("getPriceFeedDecimals() returns the correct value", async function() {
    assert.equal(coinMarketCapPriceFeed.getPriceFeedDecimals(), priceFeedDecimals);
  });

  it("getLookback() returns the correct value", async function() {
    assert.equal(coinMarketCapPriceFeed.getLookback(), lookback);
  });

  it("Handles bad API response properly", async function() {
    networker.getJsonReturns = [
      {
        status: {
          error_message: "dummy error"
        }
      }
    ];

    const errorCatched = await coinMarketCapPriceFeed.update().catch(() => true)
    assert.isTrue(errorCatched, "Update didn't throw");

    const price = coinMarketCapPriceFeed.getCurrentPrice() 
    assert.equal(price, undefined);

    const time = coinMarketCapPriceFeed.getHistoricalPrice(mockTime)
    assert.equal(time, undefined);
  });

  it("Should not call API again if succeeding update() call is within minTimeBetweenUpdates", async function() {
    networker.getJsonReturns = [
      { data: { DAI: { quote: { PHP: { price: mockPrice } } } } },
      { data: { DAI: { quote: { PHP: { price: mockPrice + 1 } } } } }
    ];

    await coinMarketCapPriceFeed.update();

    const originalMockTime = mockTime;
    mockTime += minTimeBetweenUpdates - 1;
    await coinMarketCapPriceFeed.update();

    // Last update time should remain to be originalMockTime
    const time = coinMarketCapPriceFeed.getLastUpdateTime();
    assert.equal(time, originalMockTime);

    // Current price should remain to be mockPrice
    const price = coinMarketCapPriceFeed.getCurrentPrice();
    assert.equal(price.toString(), toWei(`${mockPrice}`));
  });

  it("Has support for inverted price", async function() {
    // Inverted CMC price feed setup
    networker = new NetworkerMock();
    mockTime = (new Date()).getTime();

    const dummyLogger = winston.createLogger({
      level: "info",
      transports: [new winston.transports.Console()]
    });

    const cmcInvertedPriceFeed = new CoinMarketCapPriceFeed(
      dummyLogger,
      web3,
      apiKey,
      symbol,
      convert,
      lookback,
      networker,
      getTime,
      minTimeBetweenUpdates,
      true,
      priceFeedDecimals
    );

    // Here comes the actual tests
    networker.getJsonReturns = [ validResponse ];

    await cmcInvertedPriceFeed.update();

    const invertedPrice = toBN(toWei("1"))
      .mul(toBN(toWei("1")))
      .div(toBN(toWei(`${mockPrice}`)))
      // we need this last division to convert final result to correct decimals
      // in this case its from 18 decimals to 10 decimals.
      // .div(toBN("10").pow(toBN(18 - 10)))
      .toString()

    const price = cmcInvertedPriceFeed.getCurrentPrice()
    assert.equal(price.toString(), invertedPrice);

    const historicalPrice = cmcInvertedPriceFeed.getHistoricalPrice(mockTime)
    assert.equal(historicalPrice.toString(), invertedPrice);
  });

  it("Produces correct url if apiKey is present", async function() {
    networker.getJsonReturns = [ validResponse ];
    await coinMarketCapPriceFeed.update();

    assert.deepStrictEqual(networker.getJsonInputs, [
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}&convert=${convert}&CMC_PRO_API_KEY=${apiKey}`
    ]);
  });

  it("Produces correct url if apiKey is absent", async function() {
    coinMarketCapPriceFeed.apiKey = undefined;
    networker.getJsonReturns = [ validResponse ];
    
    await coinMarketCapPriceFeed.update();

    assert.deepStrictEqual(networker.getJsonInputs, [
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}&convert=${convert}`
    ]);
  });

});