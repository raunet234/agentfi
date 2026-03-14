const { Web3 } = require("web3");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const network = process.env.VITE_NETWORK || "testnet";
  const rpcUrl =
    network === "mainnet"
      ? process.env.VITE_BNB_MAINNET_RPC || "https://bsc-dataseed.binance.org/"
      : process.env.VITE_BNB_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545/";
  const chainId = network === "mainnet" ? 56 : 97;

  const web3 = new Web3(rpcUrl);

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.error("ERROR: Set DEPLOYER_PRIVATE_KEY in your .env file");
    process.exit(1);
  }

  const account = web3.eth.accounts.privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
  web3.eth.accounts.wallet.add(account);

  console.log(`Network:  ${network === "mainnet" ? "BNB Smart Chain Mainnet" : "BNB Smart Chain Testnet"}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${account.address}`);

  const balance = await web3.eth.getBalance(account.address);
  console.log(`Balance:  ${web3.utils.fromWei(balance, "ether")} ${network === "mainnet" ? "BNB" : "tBNB"}`);

  if (balance === 0n) {
    console.error("\nERROR: No balance to deploy.");
    if (network !== "mainnet") {
      console.log("Get testnet BNB from: https://www.bnbchain.org/en/testnet-faucet");
    }
    process.exit(1);
  }

  const deployContract = async (name) => {
    console.log(`\n--- Deploying ${name} ---`);
    const { abi, bytecode } = JSON.parse(
      fs.readFileSync(`./artifacts/contracts/${name}.sol/${name}.json`, "utf8")
    );
    const contract = new web3.eth.Contract(abi);
    const deployTx = contract.deploy({ data: bytecode, arguments: [] });

    const gas = await deployTx.estimateGas({ from: account.address });

    const instance = await deployTx
      .send({
        from: account.address,
        gas: Math.floor(Number(gas) * 1.5),
        gasPrice: await web3.eth.getGasPrice(),
      })
      .on("transactionHash", (hash) => {
        console.log(`Transaction submitted! Hash: ${hash}`);
      });

    console.log(`${name} deployed at: ${instance.options.address}`);
    return { address: instance.options.address, abi };
  };

  try {
    const registry = await deployContract("AgentRegistry");
    const commit = await deployContract("CommitReveal");
    const afi = await deployContract("AFIToken");

    const config = {
      network: network === "mainnet" ? "bscMainnet" : "bscTestnet",
      chainId,
      deployedAt: new Date().toISOString(),
      deployer: account.address,
      contracts: {
        AgentRegistry: registry,
        CommitReveal: commit,
        AFIToken: afi,
      },
    };
    fs.writeFileSync("./src/data/contracts.json", JSON.stringify(config, null, 2));
    console.log("\n=======================================");
    console.log("  AgentFi Deployment Complete!");
    console.log("=======================================");
    console.log(`  Network:       ${config.network}`);
    console.log(`  Chain ID:      ${chainId}`);
    console.log(`  AgentRegistry: ${registry.address}`);
    console.log(`  CommitReveal:  ${commit.address}`);
    console.log(`  AFIToken:      ${afi.address}`);
    console.log("=======================================");
    console.log("\nConfig written to src/data/contracts.json");
  } catch (e) {
    console.error("Deployment failed:", e);
    process.exit(1);
  }
}

main().catch(console.error);
