const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("====================================================");
  console.log(`Deploying Osso.nl contracts op netwerk: ${network.name} (chainId: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} MATIC/ETH`);
  console.log("====================================================");

  console.log("\nOssoBidRegistry deployen...");
  const OssoBidRegistry = await ethers.getContractFactory("OssoBidRegistry");
  const registry = await OssoBidRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`\nOssoBidRegistry deployed: ${address}`);

  console.log("\n====================================================");
  console.log("Stel de volgende waarden in backend/.env in:");
  console.log("====================================================");
  console.log(`OSSO_REGISTRY_ADDRESS=${address}`);
  console.log(`BACKEND_WALLET_ADDRESS=${deployer.address}`);
  console.log("====================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
