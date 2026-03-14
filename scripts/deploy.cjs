const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

async function main() {
  const network = process.env.VITE_NETWORK || "testnet";
  const rpcUrl =
    network === "mainnet"
      ? process.env.VITE_BNB_MAINNET_RPC || "https://bsc-dataseed.binance.org/"
      : process.env.VITE_BNB_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545/";
  const chainId = network === "mainnet" ? 56 : 97;

  // Read compiled artifacts
  const registryArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/AgentRegistry.sol/AgentRegistry.json", "utf-8")
  );
  const commitRevealArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/CommitReveal.sol/CommitReveal.json", "utf-8")
  );
  const afiTokenArtifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/AFIToken.sol/AFIToken.json", "utf-8")
  );

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.error("ERROR: Set DEPLOYER_PRIVATE_KEY in your .env file");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(pk.startsWith("0x") ? pk : `0x${pk}`, provider);

  console.log(`Network:  ${network === "mainnet" ? "BNB Smart Chain Mainnet" : "BNB Smart Chain Testnet"}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${wallet.address}`);

  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [wallet.address, "latest"],
        id: 1,
      }),
    });
    const data = await res.json();
    const balance = ethers.formatEther(data.result || "0x0");
    console.log(`Balance:  ${balance} ${network === "mainnet" ? "BNB" : "tBNB"}`);

    if (parseFloat(balance) === 0) {
      console.error("\nERROR: No balance to deploy.");
      if (network !== "mainnet") {
        console.log("Get testnet BNB from: https://www.bnbchain.org/en/testnet-faucet");
      }
      process.exit(1);
    }
  } catch (e) {
    console.warn("Could not fetch balance:", e.message);
  }

  // Deploy AgentRegistry
  console.log("\n--- Deploying AgentRegistry ---");
  const RegistryFactory = new ethers.ContractFactory(registryArtifact.abi, registryArtifact.bytecode, wallet);
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("AgentRegistry:", registryAddr);

  // Deploy CommitReveal
  console.log("\n--- Deploying CommitReveal ---");
  const CommitFactory = new ethers.ContractFactory(commitRevealArtifact.abi, commitRevealArtifact.bytecode, wallet);
  const commitReveal = await CommitFactory.deploy();
  await commitReveal.waitForDeployment();
  const commitRevealAddr = await commitReveal.getAddress();
  console.log("CommitReveal:", commitRevealAddr);

  // Deploy AFIToken
  console.log("\n--- Deploying AFIToken ---");
  const TokenFactory = new ethers.ContractFactory(afiTokenArtifact.abi, afiTokenArtifact.bytecode, wallet);
  const afiToken = await TokenFactory.deploy();
  await afiToken.waitForDeployment();
  const afiTokenAddr = await afiToken.getAddress();
  console.log("AFIToken:", afiTokenAddr);

  // Write config
  const config = {
    network: network === "mainnet" ? "bscMainnet" : "bscTestnet",
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    contracts: {
      AgentRegistry: {
        address: registryAddr,
        abi: registryArtifact.abi,
      },
      CommitReveal: {
        address: commitRevealAddr,
        abi: commitRevealArtifact.abi,
      },
      AFIToken: {
        address: afiTokenAddr,
        abi: afiTokenArtifact.abi,
      },
    },
  };

  fs.writeFileSync("./src/data/contracts.json", JSON.stringify(config, null, 2));

  console.log("\n=======================================");
  console.log("  AgentFi Deployment Complete!");
  console.log("=======================================");
  console.log(`  Network:       ${config.network}`);
  console.log(`  Chain ID:      ${chainId}`);
  console.log(`  AgentRegistry: ${registryAddr}`);
  console.log(`  CommitReveal:  ${commitRevealAddr}`);
  console.log(`  AFIToken:      ${afiTokenAddr}`);
  console.log("=======================================");
  console.log("\nConfig written to src/data/contracts.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
