const { ethers } = require('ethers');

// Simple Escrow Contract ABI
const ESCROW_ABI = [
  "constructor(address _buyer, address _seller, uint256 _amount)",
  "function deposit() external payable",
  "function release() external",
  "function refund() external",
  "function getBalance() external view returns (uint256)",
  "function buyer() external view returns (address)",
  "function seller() external view returns (address)",
  "function amount() external view returns (uint256)",
  "function isCompleted() external view returns (bool)",
  "event Deposited(uint256 amount)",
  "event Released(uint256 amount)",
  "event Refunded(uint256 amount)"
];

// Simple Escrow Contract Bytecode (simplified for demo)
const ESCROW_BYTECODE = "0x608060405234801561001057600080fd5b506040516103e83803806103e88339818101604052810190610032919061007a565b8260008190555081600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505050506100d7565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006100a5826100d8565b9050919050565b6100b58161009a565b81146100c057600080fd5b50565b6000815190506100d2816100ac565b92915050565b6000819050919050565b6100eb816100d8565b81146100f657600080fd5b50565b600081519050610108816100e2565b92915050565b60008060006060848603121561012757610126610075565b5b6000610135868287016100c3565b9350506020610146868287016100c3565b9250506040610157868287016100f9565b9150509250925092565b6102f2806101706000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c80638da5cb5b1161005b5780638da5cb5b146100f1578063aa8c217c1461010f578063d0e30db01461012d578063f340fa0114610137575b600080fd5b6100f961013f565b6040516101069190610201565b60405180910390f35b610117610165565b604051610124919061023a565b60405180910390f35b61013561016b565b005b61013f6101c8565b005b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60005481565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146101c657600080fd5b565b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461022257600080fd5b565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061024d82610222565b9050919050565b61025d81610242565b82525050565b60006020820190506102786000830184610254565b92915050565b6000819050919050565b6102918161027e565b82525050565b60006020820190506102ac6000830184610288565b9291505056fea2646970667358221220c4c3c4c3c4c3c4c3c4c3c4c3c4c3c4c3c4c3c4c3c4c3c4c3c4c3c4c3c4c3c4c364736f6c63430008130033";

class EscrowService {
  constructor(provider, wallet) {
    this.provider = provider;
    this.wallet = wallet;
  }
  
  async deployEscrowContract(buyer, seller, amount) {
    try {
      console.log('Deploying escrow contract...');
      
      const factory = new ethers.ContractFactory(ESCROW_ABI, ESCROW_BYTECODE, this.wallet);
      
      const escrowContract = await factory.deploy(
        buyer,
        seller,
        ethers.utils.parseEther(amount.toString())
      );
      
      await escrowContract.deployed();
      
      console.log('Escrow contract deployed at:', escrowContract.address);
      
      return {
        address: escrowContract.address,
        txHash: escrowContract.deployTransaction.hash
      };
    } catch (error) {
      console.error('Escrow deployment error:', error);
      throw error;
    }
  }
  
  async getEscrowContract(contractAddress) {
    return new ethers.Contract(contractAddress, ESCROW_ABI, this.wallet);
  }
  
  async depositToEscrow(contractAddress, amount) {
    try {
      const contract = await this.getEscrowContract(contractAddress);
      
      const tx = await contract.deposit({
        value: ethers.utils.parseEther(amount.toString())
      });
      
      return await tx.wait();
    } catch (error) {
      console.error('Escrow deposit error:', error);
      throw error;
    }
  }
  
  async releaseEscrow(contractAddress) {
    try {
      const contract = await this.getEscrowContract(contractAddress);
      const tx = await contract.release();
      return await tx.wait();
    } catch (error) {
      console.error('Escrow release error:', error);
      throw error;
    }
  }
  
  async refundEscrow(contractAddress) {
    try {
      const contract = await this.getEscrowContract(contractAddress);
      const tx = await contract.refund();
      return await tx.wait();
    } catch (error) {
      console.error('Escrow refund error:', error);
      throw error;
    }
  }
}

module.exports = EscrowService;