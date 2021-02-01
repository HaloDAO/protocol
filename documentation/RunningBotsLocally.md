# Running UMA bots locally


1. Checkout a branch where the coingmarketcap & coingecko price feed is added:

   `/features/BGM-572-Create-CoinGeckoPriceFeed.js` or

   `/halodao/new-price-feeds`


2. Run ganache in a separate terminal window

   `npx ganache-cli -p 9545 -e 1000000 -l 10000000`


3. Deploy the EMP or Perpetual contract using truffle

  - EMP - follow https://docs.umaproject.org/build-walkthrough/mint-locally#parameterize-and-deploy-a-contract

  - Perpetual - follow https://github.com/HaloDAO/protocol/blob/setup-local/guides/Perpetual.md

      *Note:* On create createPerpetual() txResult, take note of the txResult.logs[1].args.perpetualAddress


4. Create a .env file for the bots, inside project root

   ```
   EMP_ADDRESS=0x00000000000000000000000000000000
   MNEMONIC=the quick brown fox jumps over the lazy dog
   PRICE_FEED_CONFIG={ "type": "medianizer", "computeMean": true, "lookback": 120, "minTimeBetweenUpdates": 60, "medianizedFeeds": [ { "type": "coinmarketcap", "apiKey": "c2b6c434-27dc-4d7c-b03d-96fa5413f0e9", "symbol": "DAI", "convert": "PHP" }, { "type": "coingecko", "contractAddress": "0x6b175474e89094c44da98b954eedeac495271d0f", "currency": "php" } ] }
   ```

    * EMP_ADDRESS - EMP/Perpetual contract address from step #2
    * MNEMONIC - liquidator/disputer wallet mnemonic phrases
    * PRICE_FEED_CONFIG - hardcode to above to fetch DAI:PHP median from CoinMarketCap & CoinGecko API


5. Modify liquidator code to support the newly deployed contract (optional, but required to run liquidator bot)

    Navigate to packages > common > src > FindContractVersion.js and pay attention to versionMap variable. You need to add  the contract code address hash to this map. As an example, use below values for a Perpetual address:

   ```
   "0xe75e20d8a696654570ffe89817f805149ce82817b2b23a3327b9627caa429c03": {
      contractType: "Perpetual", // or "ExpiringMultiParty"
      contractVersion: "latest"
   }
   ```

  * To find the contract code address hash, console.log() contractCodeHash variable and you’ll see the value when running the liquidator bot (step #6)

  * If you get an error with UniswapPriceFeed.js, modify line 105 to:
    * `    for (let i = 0; !(fromBlock === 0 || (events.length && events[0].timestamp <= earliestLookbackTime)); i++) {`


6. Run the liquidator bot

   `yarn truffle exec ./packages/liquidator/index.js --network test`

    If you have not done #4 properly, you’ll get this error log: “Error: Contract version specified or inferred is not supported by this bot”. Be sure to add the correct contractCodeHash and try running the bot again.


7. Run the disputer bot

   `yarn truffle exec ./packages/disputer/index.js --network test`

    #4 is not required here so the script should run without any errors

