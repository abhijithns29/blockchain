const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Blockchain Land Registry environment...\n');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
const envLocalPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  fs.copyFileSync(path.join(__dirname, '..', '.env.example'), envPath);
  console.log('✅ .env file created from .env.example');
} else {
  console.log('✅ .env file already exists');
}

if (!fs.existsSync(envLocalPath)) {
  console.log('📝 Creating .env.local file...');
  fs.copyFileSync(path.join(__dirname, '..', '.env.local.example'), envLocalPath);
  console.log('✅ .env.local file created from .env.local.example');
} else {
  console.log('✅ .env.local file already exists');
}

console.log('\n🔧 Environment Setup Complete!\n');
console.log('Next steps:');
console.log('1. Edit .env file with your configuration');
console.log('2. Edit .env.local file with your configuration');
console.log('3. Start MongoDB service');
console.log('4. Run: npm run blockchain:node (in separate terminal)');
console.log('5. Run: npm run blockchain:setup');
console.log('6. Update CONTRACT_ADDRESS in both .env files');
console.log('7. Run: npm run dev');
console.log('\nFor detailed instructions, see SETUP.md');