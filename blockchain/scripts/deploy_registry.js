const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying OssoBidRegistry met account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const Registry = await ethers.getContractFactory("OssoBidRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\n✅ OssoBidRegistry gedeployed op:", address);
  console.log("Operator (backend wallet):", deployer.address);

  // Schrijf adres + ABI naar backend
  const backendDir = path.join(__dirname, "../../backend/blockchain/abis");
  fs.mkdirSync(backendDir, { recursive: true });

  // Haal ABI op uit artifacts
  const artifact = await artifacts.readArtifact("OssoBidRegistry");
  fs.writeFileSync(
    path.join(backendDir, "OssoBidRegistry.json"),
    JSON.stringify(artifact.abi, null, 2)
  );

  // Schrijf deployment info naar .env snippet
  const envSnippet = `
# OssoBidRegistry deployment (Hardhat localhost)
OSSO_REGISTRY_ADDRESS=${address}
BACKEND_WALLET_ADDRESS=${deployer.address}
`;
  console.log("\n📋 Voeg toe aan backend/.env:");
  console.log(envSnippet);

  // Schrijf ook naar een deployment.json voor de backend setup
  fs.writeFileSync(
    path.join(__dirname, "../deployment.json"),
    JSON.stringify({ address, operator: deployer.address, network: "localhost", deployedAt: new Date().toISOString() }, null, 2)
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
