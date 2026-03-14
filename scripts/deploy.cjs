const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
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

  // Connect to BNB Testnet
  const RPC = "https://data-seed-prebsc-1-s1.binance.org:8545/";
  const provider = new ethers.JsonRpcProvider(RPC);

  // Check for private key
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.log("ERROR: Set DEPLOYER_PRIVATE_KEY environment variable");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(pk, provider);
  console.log("Deployer:", wallet.address);

  // Use raw fetch for balance to avoid ENS resolution issues with ethers v6
  try {
    const res = await fetch(RPC, {
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
    console.log("Balance:", balance, "tBNB");

    if (parseFloat(balance) === 0) {
      console.log("\nERROR: No tBNB balance. Get testnet BNB from:");
      console.log("https://www.bnbchain.org/en/testnet-faucet");
      process.exit(1);
    }
  } catch (e) {
    console.log("Could not fetch balance details:", e.message);
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

  console.log("\n=======================================");
  console.log("  AgentFi Deployment Complete!");
  console.log("=======================================");
  console.log("  Network:       BNB Smart Chain Testnet");
  console.log("  Chain ID:      97");
  console.log("  AgentRegistry:", registryAddr);
  console.log("  CommitReveal: ", commitRevealAddr);
  console.log("  AFIToken:     ", afiTokenAddr);
  console.log("=======================================");

  // Write addresses + ABIs for frontend
  const config = {
    network: "bscTestnet",
    chainId: 97,
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
  console.log("\nFrontend config written to src/data/contracts.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
