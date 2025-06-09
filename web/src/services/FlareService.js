import { ethers } from 'ethers';

const PROPERTY_TOKEN_ABI = [
  'function mint(address to, uint256 tokenId, string memory propertyData) external',
  'function transfer(address to, uint256 tokenId) external',
  'function balanceOf(address owner) external view returns (uint256)',
  'function setKYCStatus(address org, bool status) external',
  'function updatePropertyProgress(uint256 tokenId, string memory status, string memory updates) external',
  'function getPropertyProgress(uint256 tokenId) external view returns (string memory status, string memory updates)',
  'event TokenMinted(address indexed to, uint256 tokenId, uint256 amount)',
  'event ProgressUpdated(uint256 tokenId, string status, string updates)',
];

const config = {
  FLARE_RPC_URL: process.env.REACT_APP_FLARE_RPC_URL || 'https://flare-api.flare.network/ext/bc/C/rpc',
  FLARE_CONTRACT_ADDRESS: process.env.REACT_APP_FLARE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  STORAGE_KEYS: {
    WALLET_PRIVATE_KEY: 'wallet_private_key',
  },
};

class FlareService {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(config.FLARE_RPC_URL);
    this.wallet = null;
    this.contract = null;
    this.initialize();
  }

  async initialize() {
    const privateKey = localStorage.getItem(config.STORAGE_KEYS.WALLET_PRIVATE_KEY);
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      const contractAddress = config.FLARE_CONTRACT_ADDRESS;
      this.contract = new ethers.Contract(contractAddress, PROPERTY_TOKEN_ABI, this.wallet);
    }
  }

  async mintTokens(tokenData) {
    if (!this.contract) throw new Error('Contract not initialized');
    const tx = await this.contract.mint(
      tokenData.to || this.wallet.address,
      tokenData.propertyId,
      tokenData.propertyData || ''
    );
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  async transferTokens(from, to, tokenId) {
    if (!this.contract) throw new Error('Contract not initialized');
    const tx = await this.contract.transfer(to, tokenId, { from });
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  async setKYCStatus(orgAddress, status) {
    if (!this.contract) throw new Error('Contract not initialized');
    const tx = await this.contract.setKYCStatus(orgAddress, status);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  async updatePropertyProgress(tokenId, status, updates) {
    if (!this.contract) throw new Error('Contract not initialized');
    const tx = await this.contract.updatePropertyProgress(tokenId, status, updates);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  async getPropertyProgress(tokenId) {
    if (!this.contract) throw new Error('Contract not initialized');
    const [status, updates] = await this.contract.getPropertyProgress(tokenId);
    return { status, updates };
  }

  async getUserTokens(ownerAddress) {
    if (!this.contract) throw new Error('Contract not initialized');
    const balance = await this.contract.balanceOf(ownerAddress);
    return Array.from({ length: balance.toNumber() }, (_, i) => ({
      id: i,
      balance: balance.toNumber(),
    }));
  }
}

export const flareService = new FlareService();
export default FlareService;