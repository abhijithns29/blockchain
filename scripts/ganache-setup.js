const { ethers } = require("hardhat");

async function main() {
  console.log("Setting up Ganache development environment...");

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

  // Get balances
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  const user1Balance = await ethers.provider.getBalance(user1.address);
  const user2Balance = await ethers.provider.getBalance(user2.address);

  console.log("Account balances:");
  console.log("Deployer:", ethers.utils.formatEther(deployerBalance), "ETH");
  console.log("User1:", ethers.utils.formatEther(user1Balance), "ETH");
  console.log("User2:", ethers.utils.formatEther(user2Balance), "ETH");

  // Display setup information
  console.log("\n=== Ganache Development Setup Complete ===");
  console.log("Contract Address:", landRegistry.address);
  console.log("Network: Ganache Local (Chain ID: 5777)");
  console.log("RPC URL: http://127.0.0.1:7545");
  console.log("\nUpdate your environment files:");
  console.log("In .env:");
  console.log(`CONTRACT_ADDRESS=${landRegistry.address}`);
  console.log(`ADMIN_PRIVATE_KEY=${process.env.ADMIN_PRIVATE_KEY || 'your_ganache_private_key_here'}`);
  console.log(`RPC_URL=http://127.0.0.1:7545`);
  console.log("\nIn .env.local:");
  console.log(`VITE_CONTRACT_ADDRESS=${landRegistry.address}`);
  console.log(`VITE_RPC_URL=http://127.0.0.1:7545`);
  
  console.log("\nGanache Test Accounts:");
  console.log("Deployer (Admin):", deployer.address);
  console.log("User1 (Admin):", user1.address);
  console.log("User2 (User):", user2.address);
  
  console.log("\n=== Next Steps ===");
  console.log("1. Update your .env and .env.local files with the contract address");
  console.log("2. Make sure Ganache is running on http://127.0.0.1:7545");
  console.log("3. Add Ganache network to MetaMask");
  console.log("4. Import Ganache accounts to MetaMask");
  console.log("5. Run 'npm run dev' to start the application");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });