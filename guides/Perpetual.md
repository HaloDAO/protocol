# Creating a Creating a Synthetic Token Locally with the Truffle Console with the Perpetual Contract

This is based from the Creating a Synthetic Token Locally with the Truffle Console for EMP contracts. You can find it [here](https://docs.umaproject.org/build-walkthrough/mint-locally).

Please make sure you're environment is setup by following this [guide](https://docs.umaproject.org/developers/setup)

You should have:

- Have the protocol repo cloned.
- Be running an instance of Ganache on port 9545.
- Have installed dependencies using yarn and have run yarn qbuild to build the contracts.

## Parameterize and deploy a contract

1. Open the truffle console and connect it to the test network.

```
yarn truffle console --network test
```

2. Migrate the contracts within the truffle console with the migrate command:

```
truffle(test)> migrate
```

3. Create an instance of the Perpetual creator (the contract factory for synthetic tokens). This command should return “undefined”.

```
const perpCreator = await PerpetualCreator.deployed()
```

4. Define the parameters for the synthetic tokens you would like to create.
   Note that in this example, `priceFeedIdentifier`, `syntheticName`, and `syntheticSymbol` are set to "UMATEST", "Test UMA Token", and "UMATEST", respectively, but you can set these parameters to any names you prefer in the local environment. The difference between the EMP contract and the Perpetual contract is that here, the `expirationTimestamp` is removed and

```
const constructorParams = {collateralAddress: TestnetERC20.address,priceFeedIdentifier: web3.utils.padRight(web3.utils.fromAscii('UMATEST')),fundingRateIdentifier: web3.utils.padRight(web3.utils.fromAscii('fUMATEST')),syntheticName: 'Test UMA Token',syntheticSymbol: 'UMATEST',collateralRequirement: { rawValue: web3.utils.toWei('1.5') },disputeBondPercentage: { rawValue: web3.utils.toWei('0.1') },sponsorDisputeRewardPercentage: { rawValue: web3.utils.toWei('0.1') },disputerDisputeRewardPercentage: { rawValue: web3.utils.toWei('0.1') },minSponsorTokens: { rawValue: '100000000000000' },tokenScaling: { rawValue: web3.utils.toWei('0.1') },withdrawalLiveness: 7200,liquidationLiveness: 7200}
```

5. Define the config store parameters. ConfigStore stores configuration settings for a perpetual contract and provides an interface for it to query settings such as reward rates, proposal bond sizes, etc. The configuration settings can be upgraded by a privileged account and the upgraded changes are timelocked. More info [here](https://github.com/UMAprotocol/protocol/blob/master/packages/core/contracts/financial-templates/perpetual-multiparty/ConfigStore.sol)

```
const configStore = {timelockLiveness: 129600,rewardRatePerSecond: { rawValue: web3.utils.toWei('0.0000001') },proposerBondPercentage: { rawValue: web3.utils.toWei('5') },maxFundingRate: { rawValue: web3.utils.toWei('10') },minFundingRate: { rawValue: web3.utils.toWei('5') },proposalTimePastLimit: 7200}
```

6. Before the contract for the synthetic tokens can be created, the price identifier for the synthetic tokens must be registered with IdentifierWhitelist. This is important to ensure that the UMA DVM can resolve any disputes for these synthetic tokens.

```
const identifierWhitelist = await IdentifierWhitelist.deployed()
await identifierWhitelist.addSupportedIdentifier(constructorParams.priceFeedIdentifier)
```

7. We also need to register the `perpCreator` factory with the `registry` to give it permission to create new Perpetual synthetic tokens.

```
const registry = await Registry.deployed()
await registry.addMember(1, perpCreator.address)
```

8. We also need to register the collateral token with the `collateralTokenWhitelist`.

```
const collateralTokenWhitelist = await AddressWhitelist.deployed()
await collateralTokenWhitelist.addToWhitelist(TestnetERC20.address)
```

9. Now, we can create a new `Perpetual` synthetic token with the factory instance.

```
const txResult = await perpCreator.createPerpetual(constructorParams, configStore)
const perp = await Perpetual.at(txResult.logs[1].args.perpetualAddress)
```

## Create new tokens from an existing contract

1. Now that we’ve parameterized and deployed the synthetic token contract, we will create synthetic tokens from that contract. The first step is to create an instance of the Test token and mint 10,000 to the wallet. This is the token that will serve as collateral for the synthetic token. Give permission to the `perpCreator` to spend the collateral tokens on our behalf.

```
const collateralToken = await TestnetERC20.deployed()
await collateralToken.allocateTo(accounts[0], web3.utils.toWei("10000"))
await collateralToken.approve(perp.address, web3.utils.toWei("10000"))
```

2. We can now create a synthetic token position. We will deposit 150 units of collateral (the first argument) to create 100 units of synthetic tokens (the second argument).

```
await perp.create({ rawValue: web3.utils.toWei("150") }, { rawValue: web3.utils.toWei("100") })
```

3. Let’s check that we now have synthetic tokens. We should have 100 synthetic tokens and 9,850 collateral tokens remaining.

```
const syntheticToken = await SyntheticToken.at(await perp.tokenCurrency())
// synthetic token balance. Should equal what we minted in step 2.
(await syntheticToken.balanceOf(accounts[0])).toString()

// Collateral token balance. Should equal original balance (1000e18) minus deposit (150e18).
(await collateralToken.balanceOf(accounts[0])).toString()

// position information. Can see the all key information about our position.
await perp.positions(accounts[0])
```

## Redeem tokens against a contract

1. Because we are a token sponsor for this synthetic token contract, we can redeem some of the tokens we minted even before the synthetic token expires. Let's redeem half.

```
await syntheticToken.approve(perp.address, web3.utils.toWei("10000"))
await perp.redeem({ rawValue: web3.utils.toWei("50") })
```

2. Let’s check that our synthetic token balance has decreased and our collateral token balance has increased. Our synthetic token balance should now be 50. Because the contract does not have an on-chain price feed to determine the token redemption value for the tokens, it will give us collateral equal to the proportional value value of the total collateral deposited to back the 100 tokens (50/100 \* 150 = 75). Our collateral token balance should increase to 9,925.

```
// Print balance of collateral token.
(await collateralToken.balanceOf(accounts[0])).toString()

// Print balance of the synthetic token.
(await syntheticToken.balanceOf(accounts[0])).toString()

// position information
await perp.positions(accounts[0])
```

## Redeem tokens against a contract

```
// TODO
```

## Deposit and withdraw collateral

```
// TODO
```
