const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying LandRegistry contract to Hardhat network...");

  try {
    // Get the contract factory
    const LandRegistry = await ethers.getContractFactory("LandRegistry");

    // Deploy the contract
    console.log("📝 Deploying contract...");
    const landRegistry = await LandRegistry.deploy();
    await landRegistry.deployed();

    console.log("✅ LandRegistry deployed successfully!");
    console.log("📍 Contract address:", landRegistry.address);
    console.log("🔗 Transaction hash:", landRegistry.deployTransaction.hash);

    // Wait for a few confirmations
    console.log("⏳ Waiting for confirmations...");
    await landRegistry.deployTransaction.wait(1);

    // Get deployer info
    const [deployer] = await ethers.getSigners();
    const isAdmin = await landRegistry.admins(deployer.address);
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    
    console.log("\n📊 Deployment Summary:");
    console.log("┌─────────────────────────────────────────────────────────┐");
    console.log("│ Contract Details:                                      │");
    console.log("├─────────────────────────────────────────────────────────┤");
    console.log(`│ Address: ${landRegistry.address.padEnd(47)} │`);
    console.log(`│ Network: ${network.name.padEnd(47)} │`);
    console.log(`│ Chain ID: ${network.chainId.toString().padEnd(45)} │`);
    console.log(`│ Deployer: ${deployer.address.padEnd(44)} │`);
    console.log(`│ Is Admin: ${isAdmin.toString().padEnd(45)} │`);
    console.log("└─────────────────────────────────────────────────────────┘");

    console.log("\n🔧 Environment Variables to Update:");
    console.log("In .env file:");
    console.log(`CONTRACT_ADDRESS=${landRegistry.address}`);
    console.log(`RPC_URL=http://127.0.0.1:8545`);
    console.log("\nIn .env.local file:");
    console.log(`VITE_CONTRACT_ADDRESS=${landRegistry.address}`);
    console.log(`VITE_RPC_URL=http://127.0.0.1:8545`);
    console.log(`VITE_CHAIN_ID=${network.chainId}`);

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Next Steps:");
    console.log("1. Update your .env and .env.local files with the above values");
    console.log("2. Start the application: npm run dev");
    console.log("3. The contract is ready to use!");

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
