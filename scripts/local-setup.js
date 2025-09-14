const { ethers } = require("hardhat");

async function main() {
  console.log("Setting up local development environment...");

  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  
  console.log("Deployer address:", deployer.address);
  console.log("User1 address:", user1.address);
  console.log("User2 address:", user2.address);

  // Deploy contract
  const LandRegistry = await ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy();
  await landRegistry.deployed();

  console.log("LandRegistry deployed to:", landRegistry.address);

  // Add additional admins if needed
  await landRegistry.addAdmin(user1.address);
  console.log("Added user1 as admin");

  // Fund accounts with ETH for testing
  const fundAmount = ethers.utils.parseEther("10.0");
  
  await deployer.sendTransaction({
    to: user1.address,
    value: fundAmount
  });
  
  await deployer.sendTransaction({
    to: user2.address,
    value: fundAmount
  });

  console.log("Funded test accounts with 10 ETH each");

  // Display setup information
  console.log("\n=== Local Development Setup Complete ===");
  console.log("Contract Address:", landRegistry.address);
  console.log("Network: Hardhat Local (Chain ID: 1337)");
  console.log("RPC URL: http://localhost:8545");
  console.log("\nAdd these to your .env file:");
  console.log(`CONTRACT_ADDRESS=${landRegistry.address}`);
  console.log(`ADMIN_PRIVATE_KEY=${process.env.ADMIN_PRIVATE_KEY || 'your_private_key_here'}`);
  console.log(`RPC_URL=http://localhost:8545`);
  console.log("\nAnd to your .env.local file:");
  console.log(`VITE_CONTRACT_ADDRESS=${landRegistry.address}`);
  console.log(`VITE_RPC_URL=http://localhost:8545`);
  
  console.log("\nTest Accounts:");
  console.log("Deployer (Admin):", deployer.address);
  console.log("User1 (Admin):", user1.address);
  console.log("User2 (User):", user2.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });