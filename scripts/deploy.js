const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying LandRegistry contract...");

  // Get the contract factory
  const LandRegistry = await ethers.getContractFactory("LandRegistry");

  // Deploy the contract
  const landRegistry = await LandRegistry.deploy();
  await landRegistry.deployed();

  console.log("LandRegistry deployed to:", landRegistry.address);
  console.log("Deployment transaction hash:", landRegistry.deployTransaction.hash);

  // Wait for a few confirmations
  console.log("Waiting for confirmations...");
  await landRegistry.deployTransaction.wait(1);

  console.log("Contract deployed successfully!");
  console.log("Contract address:", landRegistry.address);
  console.log("\n=== IMPORTANT: Update your environment files ===");
  console.log(`CONTRACT_ADDRESS=${landRegistry.address}`);
  console.log(`VITE_CONTRACT_ADDRESS=${landRegistry.address}`);
  console.log("\nAdd CONTRACT_ADDRESS to your .env file");
  console.log("Add VITE_CONTRACT_ADDRESS to your .env.local file");

  // Verify the deployer is an admin
  const [deployer] = await ethers.getSigners();
  const isAdmin = await landRegistry.admins(deployer.address);
  console.log("\nDeployer address:", deployer.address);
  console.log("Deployer is admin:", isAdmin);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });