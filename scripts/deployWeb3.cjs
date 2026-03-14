const { Web3 } = require("web3");
const fs = require("fs");

async function main() {
  const web3 = new Web3("https://data-seed-prebsc-1-s1.binance.org:8545/");
  const pk = process.env.DEPLOYER_PRIVATE_KEY || "0x38098bc3e995127017d289861d664606ed0872841696bc2ebb634aca443cc1d0";
  const account = web3.eth.accounts.privateKeyToAccount(pk);
  web3.eth.accounts.wallet.add(account);

  console.log("Deployer:", account.address);
  const balance = await web3.eth.getBalance(account.address);
  console.log("Balance:", web3.utils.fromWei(balance, 'ether'), "tBNB");

  if (balance === 0n) {
    console.log("Not enough tBNB to deploy.");
    return;
  }

  const deployContract = async (name) => {
    console.log(`\n--- Deploying ${name} ---`);
    const { abi, bytecode } = JSON.parse(
      fs.readFileSync(`./artifacts/contracts/${name}.sol/${name}.json`, "utf8")
    );
    const contract = new web3.eth.Contract(abi);
    const deployTx = contract.deploy({ data: bytecode, arguments: [] });
    
    // Estimate gas
    const gas = await deployTx.estimateGas({ from: account.address });
    
    const instance = await deployTx.send({
      from: account.address,
      gas: Math.floor(Number(gas) * 1.5),
      gasPrice: await web3.eth.getGasPrice(),
    }).on('transactionHash', (hash) => {
      console.log(`Transaction submitted! Hash: ${hash}`);
    });
    
    console.log(`${name} deployed at:`, instance.options.address);
    return { address: instance.options.address, abi };
  };

  try {
    const registry = await deployContract("AgentRegistry");
    const commit = await deployContract("CommitReveal");
    const afi = await deployContract("AFIToken");

    const config = {
      network: "bscTestnet",
      chainId: 97,
      deployedAt: new Date().toISOString(),
      deployer: account.address,
      contracts: {
        AgentRegistry: registry,
        CommitReveal: commit,
        AFIToken: afi
      }
    };
    fs.writeFileSync("./src/data/contracts.json", JSON.stringify(config, null, 2));
    console.log("\nConfig written to src/data/contracts.json");

  } catch (e) {
    console.error("Deployment failed:", e);
  }
}

main().catch(console.error);
