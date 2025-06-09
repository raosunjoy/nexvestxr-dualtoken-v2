# Flare Network Integration Setup

This guide explains how to set up real Flare Network integration for property tokenization in the NexVestXR platform.

## Prerequisites

1. **Flare Wallet**: Create a wallet on Flare Coston testnet
2. **Testnet Tokens**: Get CFLR tokens from the [Flare faucet](https://faucet.towolabs.com/)
3. **Contract Deployment**: Deploy the PropertyToken contract to Flare Coston

## Environment Configuration

Add these environment variables to your `.env` file:

```bash
# Flare Network Configuration
FLARE_NETWORK=coston                                                    # 'coston' for testnet, 'flare' for mainnet
FLARE_RPC_URL=https://coston-api.flare.network/ext/bc/C/rpc           # Optional, defaults to public RPC
FLARE_PRIVATE_KEY=your-64-character-private-key-without-0x-prefix      # Your wallet private key
FLARE_PROPERTY_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890  # Deployed contract address
```

## Contract Deployment

### Option 1: Deploy using Hardhat (Recommended)

1. Navigate to the smart-contracts directory:
```bash
cd smart-contracts
npm install
```

2. Configure Hardhat for Flare Coston:
```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    coston: {
      url: "https://coston-api.flare.network/ext/bc/C/rpc",
      accounts: [process.env.FLARE_PRIVATE_KEY],
      chainId: 16
    }
  }
};
```

3. Deploy the contract:
```bash
npx hardhat run scripts/Deploy.js --network coston
```

### Option 2: Deploy using Remix IDE

1. Open [Remix IDE](https://remix.ethereum.org/)
2. Import the PropertyToken.sol contract
3. Compile with Solidity 0.8.0+
4. Connect to Flare Coston testnet in MetaMask
5. Deploy with constructor parameters:
   - Name: "PropertyToken"
   - Symbol: "PROP"

## Network Information

### Flare Coston Testnet
- **Chain ID**: 16
- **RPC URL**: https://coston-api.flare.network/ext/bc/C/rpc
- **Block Explorer**: https://coston-explorer.flare.network
- **Native Currency**: CFLR (18 decimals)
- **Faucet**: https://faucet.towolabs.com/

### Flare Mainnet
- **Chain ID**: 14
- **RPC URL**: https://flare-api.flare.network/ext/bc/C/rpc
- **Block Explorer**: https://flare-explorer.flare.network
- **Native Currency**: FLR (18 decimals)

## API Endpoints

Once configured, the following endpoints will interact with the real Flare blockchain:

### Property Tokenization
```bash
POST /api/flare/tokenize
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "ipfsHash": "QmYourIPFSHashHere",
  "totalValue": 10000000,
  "totalTokens": 1000
}
```

### Purchase Property Tokens
```bash
POST /api/flare/purchase
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "tokenId": "1",
  "amount": 10,
  "paymentValue": "0.1"
}
```

### Get Property Information
```bash
GET /api/flare/property/1
Authorization: Bearer <jwt-token>
```

### Get Token Balance
```bash
GET /api/flare/balance/1?address=0xYourAddress
Authorization: Bearer <jwt-token>
```

### Get Transaction Details
```bash
GET /api/flare/transaction/0xYourTransactionHash
Authorization: Bearer <jwt-token>
```

### Get Network Information
```bash
GET /api/flare/network
Authorization: Bearer <jwt-token>
```

## Testing

1. **Test Connection**: Use the `/api/flare/network` endpoint to verify connectivity
2. **Test Tokenization**: Create a property token using `/api/flare/tokenize`
3. **Test Purchase**: Buy fractional tokens using `/api/flare/purchase`
4. **Verify on Explorer**: Check transactions on the Flare block explorer

## Security Considerations

1. **Private Key Security**: Never commit private keys to version control
2. **Environment Variables**: Use secure environment variable management
3. **Gas Limits**: Monitor gas usage and set appropriate limits
4. **Error Handling**: Implement proper error handling for network issues
5. **Rate Limiting**: Consider rate limiting for blockchain API calls

## Troubleshooting

### Common Issues

1. **"Insufficient funds for gas"**: Ensure wallet has enough CFLR for gas fees
2. **"Contract not initialized"**: Check FLARE_PROPERTY_CONTRACT_ADDRESS is set
3. **"Network connection failed"**: Verify FLARE_RPC_URL is accessible
4. **"Invalid private key"**: Ensure private key is 64 characters without 0x prefix

### Debugging

Enable detailed logging by setting:
```bash
LOG_LEVEL=debug
```

Check logs for detailed error information and transaction details.

## Production Deployment

For production deployment:

1. Use Flare mainnet configuration
2. Deploy contracts with proper security audits
3. Implement multi-signature wallets for contract ownership
4. Set up monitoring and alerting for contract events
5. Use secure key management solutions

## Support

For Flare-specific questions:
- [Flare Documentation](https://docs.flare.network/)
- [Flare Discord](https://discord.gg/flare-network)
- [Flare GitHub](https://github.com/flare-foundation)