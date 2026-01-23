# MCPay - MCP Server with x402 Micropayments

A Model Context Protocol (MCP) server that provides blockchain tools for the Cronos network with integrated x402 micropayment capabilities. Built with TypeScript and powered by Anthropic's Claude AI.

## 🎯 Features

- **Pay-Per-Use Tools**: Three-tier pricing model (Free, Premium, Ultra)
- **x402 Micropayments**: Seamless USDCe payments on Cronos
- **AI-Powered Interface**: Claude-powered conversational agent
- **VVS Finance Integration**: DEX swaps and DeFi operations
- **Portfolio Analytics**: Deep wallet analysis and insights
- **Real-time Data**: Gas prices, token prices, transaction tracking
- **Automatic Payment Processing**: Transparent on-chain payments

## 🏗️ Architecture

- **MCP Server**: TypeScript + Model Context Protocol SDK
- **AI Agent**: Anthropic Claude with tool calling
- **Blockchain**: Cronos Testnet (CRO for gas, USDCe for payments)
- **Payment Protocol**: x402 via Crypto.com Facilitator Client
- **DEX Integration**: VVS Finance Swap SDK

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **TypeScript**
3. **Cronos Testnet wallet** with:
   - CRO (for gas fees)
   - USDCe (for tool payments)
4. **API Keys**:
   - Anthropic API key ([Get here](https://console.anthropic.com))
   - VVS Finance Quote API Client ID ([Request from Discord](https://discord.gg/vvsfinance))

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd mcp-payment-server

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
# Network Configuration
NETWORK=testnet

# Wallet Configuration
PRIVATE_KEY=your_private_key_here
DEFAULT_USER_ADDRESS=your_wallet_address_here

# Payment Recipient (where x402 payments go)
PAYMENT_RECIPIENT_ADDRESS=recipient_address_here

# Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# VVS Finance SDK API Key
SWAP_SDK_QUOTE_API_CLIENT_ID_338=your_vvs_quote_api_client_id

# Optional: Custom RPC endpoints
CRONOS_TESTNET_RPC=https://evm-t3.cronos.org
CRONOS_MAINNET_RPC=https://evm.cronos.org

# Optional: CoinGecko API Key (for better rate limits)
COINGECKO_API_KEY=your_api_key_here
```

**Get Cronos Testnet Funds:**
1. Visit [Cronos Faucet](https://cronos.org/faucet)
2. Request testnet CRO
3. Swap some CRO for USDCe on [VVS Finance Testnet](https://vvs.finance)

**Get VVS Quote API Client ID:**
1. Join [VVS Finance Discord](https://discord.gg/vvsfinance)
2. Request API access in the developer channel
3. Add the Client ID to your `.env` file

### 3. Build the Project

```bash
npm run build
```

### 4. Start the MCP Server

```bash
npm start
```

The MCP server runs via stdio and can be connected to by MCP clients.

### 5. Run the AI Agent (Optional)

In a new terminal:

```bash
npm run agent
```

This starts an interactive CLI where you can chat with Claude:

```
═══════════════════════════════════════════════════════════
🤖 Cronos AI Agent with x402 Payments
═══════════════════════════════════════════════════════════

Type your questions or commands. Type "exit" to quit.

Examples:
  - "What's the current CRO price?"
  - "Check my balance at 0x..."
  - "Swap 10 CRO for USDC"
  - "Analyze my portfolio at 0x..."
═══════════════════════════════════════════════════════════

You: _
```

## 🧪 Testing the System

### Test Free Tools

```bash
You: What's the current CRO price?
🤖 Assistant: The current CRO price is $0.124 USD, up 1.2% in the last 24 hours.

You: Check gas price
🤖 Assistant: Current gas price is 5000 gwei.

You: Check my balance at 0x123...
🤖 Assistant: Your wallet contains 150.5 CRO.
```

### Test Premium Tools (Requires USDCe)

```bash
You: Analyze my portfolio at 0xYourAddress
🤖 Assistant: This is a premium tool that costs 0.5 USDCe.
💳 Processing payment...
✅ Payment completed! Transaction: 0xabc...

📊 Portfolio Analysis:
- Total Value: $1,234.56 USD
- Assets: CRO (100%), USDC (0%)
- Diversification Score: 30/100
- Risk Level: Medium
- Recommendations: Consider diversifying into stablecoins
```

### Test Ultra Tools (Requires USDCe)

```bash
You: Swap 10 CRO for USDC
🤖 Assistant: I'll get a quote for swapping 10 CRO to USDC...

💎 This is an Ultra tier tool (3.0 USDCe)
💳 Processing payment...
✅ Payment completed!

🔍 Swap Quote:
- Input: 10 CRO
- Output: ~1.24 USDC
- Route: CRO → USDC (VVS V2)
- Price Impact: 0.45%
- Estimated Gas: 150,000

Would you like me to execute this swap? Reply "yes" to confirm.
```

### Direct MCP Tool Calls

You can also interact with the MCP server directly using the MCP protocol:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_token_price",
    "arguments": {
      "symbol": "CRO"
    }
  }
}
```

## 📊 Available Tools

### Free Tier (🆓)

| Tool | Description | Cost |
|------|-------------|------|
| `get_cronos_balance` | Check CRO and token balances for any address | FREE |
| `get_gas_price` | Get current gas prices on Cronos network | FREE |
| `get_token_price` | Get current price of tokens (CRO, BTC, ETH, etc.) | FREE |
| `check_transaction_status` | Look up transaction details by hash | FREE |
| `check_x402_status` | Check x402 payment system status and capabilities | FREE |

### Premium Tier (💳)

| Tool | Description | Cost |
|------|-------------|------|
| `analyze_wallet_portfolio` | Deep analysis of wallet holdings with diversification metrics | 0.5 USDCe |
| `get_historical_price_data` | Historical price charts and OHLCV data (7, 30, 90 days) | 0.25 USDCe |
| `find_arbitrage_opportunities` | Scan Cronos DEXs for profitable arbitrage routes | 1.0 USDCe |
| `optimize_swap_route` | Find best route for token swaps across Cronos DEXs | 0.4 USDCe |

### Ultra Tier (💎)

| Tool | Description | Cost |
|------|-------------|------|
| `vvs_swap` | Get quote or execute swap using VVS Finance DEX | 3.0 USDCe |
| `execute_token_swap` | Execute a token swap on VVS Finance | 5.0 USDCe |
| `auto_compound_rewards` | Claim and reinvest DeFi yields automatically | 7.5 USDCe |

## 🔐 x402 Payment Flow

1. **User requests a paid tool**
   - Agent checks if tool requires payment
   - Displays cost to user

2. **Balance Check**
   - Verifies user has sufficient USDCe
   - Checks CRO balance for gas fees

3. **Payment Generation**
   - Creates x402 payment header
   - Signs with user's private key
   - Sets expiration time (1 hour)

4. **Payment Verification**
   - Validates payment with Facilitator
   - Confirms amount and recipient

5. **Settlement**
   - Executes on-chain payment
   - Returns transaction hash
   - Logs to `x402-payments.log`

6. **Tool Execution**
   - Runs the requested tool
   - Returns results with payment proof

All payments are transparent and verifiable on-chain via [Cronos Explorer](https://explorer.cronos.org/testnet).

## 📁 Project Structure

```
mcp-payment-server/
├── src/
│   ├── index.ts                  # MCP server entry point
│   ├── agent/
│   │   ├── agent.ts              # Claude AI agent
│   │   └── vvsSwapIntegration.ts # VVS Finance SDK integration
│   ├── config/
│   │   ├── blockchain.ts         # Network configurations
│   │   └── tools.ts              # Tool definitions & pricing
│   ├── services/
│   │   ├── CronosService.ts      # Blockchain interactions
│   │   ├── PaymentService.ts     # Payment orchestration
│   │   ├── ToolExecutor.ts       # Tool execution logic
│   │   └── X402Service.ts        # x402 payment protocol
│   ├── tools/
│   │   ├── free/                 # Free tier tools
│   │   │   ├── getBalance.ts
│   │   │   ├── getGasPrice.ts
│   │   │   ├── getTokenPrice.ts
│   │   │   └── checkTransaction.ts
│   │   ├── premium/              # Premium tier tools
│   │   │   ├── analyzePortfolio.ts
│   │   │   ├── findArbitrage.ts
│   │   │   ├── getHistoricalData.ts
│   │   │   └── optimizeSwapRoute.ts
│   │   └── ultra/                # Ultra tier tools
│   │       ├── autoCompound.ts
│   │       ├── executeSwap.ts
│   │       └── vvsSwap.ts
│   └── utils/
│       ├── errorHandler.ts       # Error handling utilities
│       └── priceConverter.ts     # Price conversion helpers
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔧 Available Scripts

### Development
```bash
npm run dev          # Run MCP server in development mode
npm run agent        # Run interactive AI agent
```

### Production
```bash
npm run build        # Compile TypeScript to JavaScript
npm start            # Run compiled MCP server
npm run agent:build  # Build and run AI agent
```

## 💡 Usage Examples

### Example 1: Check Balance
```javascript
// Tool call
{
  "name": "get_cronos_balance",
  "arguments": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
}

// Response
{
  "success": true,
  "tool": "get_cronos_balance",
  "tier": "free",
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "token": "CRO",
    "balance": "150.5"
  }
}
```

### Example 2: Analyze Portfolio (Premium)
```javascript
// Tool call
{
  "name": "analyze_wallet_portfolio",
  "arguments": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
}

// Response
{
  "success": true,
  "tool": "analyze_wallet_portfolio",
  "tier": "premium",
  "paymentMethod": "x402",
  "paymentDetails": {
    "txHash": "0xabc123...",
    "explorerUrl": "https://explorer.cronos.org/testnet/tx/0xabc123...",
    "amount": "0.5",
    "timestamp": 1706025600
  },
  "data": {
    "totalValueUSD": 1234.56,
    "assets": [
      {
        "symbol": "CRO",
        "balance": "150.5",
        "valueUSD": 1234.56,
        "percentage": 100
      }
    ],
    "diversificationScore": 30,
    "riskLevel": "medium",
    "recommendations": [
      "Consider diversifying into stablecoins or other assets"
    ]
  }
}
```

### Example 3: VVS Swap (Ultra)
```javascript
// Tool call - Get Quote
{
  "name": "vvs_swap",
  "arguments": {
    "inputToken": "CRO",
    "outputToken": "USDC",
    "amountIn": "10",
    "executeImmediately": false
  }
}

// Response - Quote
{
  "success": true,
  "action": "quote",
  "input": "CRO",
  "output": "USDC",
  "inputAmount": "10",
  "outputAmount": "1.24",
  "executionPrice": "0.124",
  "route": "CRO → USDC",
  "message": "Trade route found. Set executeImmediately=true to execute."
}

// Tool call - Execute
{
  "name": "vvs_swap",
  "arguments": {
    "inputToken": "CRO",
    "outputToken": "USDC",
    "amountIn": "10",
    "executeImmediately": true
  }
}

// Response - Execution
{
  "success": true,
  "action": "executed",
  "transaction": {
    "hash": "0xdef456...",
    "blockNumber": 12345678,
    "explorerUrl": "https://explorer.cronos.org/testnet/tx/0xdef456...",
    "gasUsed": "150000"
  }
}
```

## 🔍 Monitoring & Logging

### Payment Logs
All x402 payments are logged to `x402-payments.log`:

```
================================================================================
🚀 [PAYMENT vvs_swap-1706025600] Starting payment
================================================================================
📊 PAYMENT DETAILS:
   Payment ID:   vvs_swap-1706025600
   From:         0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   To:           0x123...
   Tool:         vvs_swap
   Amount:       3.0 USDCe
   Asset:        0xc21223249CA28397B4B6541dfFaEcC539BfF0c59

💰 BALANCE BEFORE: 10.5 USDCe

🔐 Generating payment header...
✅ Header generated (256 chars)

📝 Generating requirements...
✅ Requirements: {...}

🔍 Verifying payment...
✅ Payment verified!

⚡️ Settling payment on-chain...

🎉 PAYMENT SETTLED!
   Transaction: 0xabc123...
   Explorer: https://explorer.cronos.org/testnet/tx/0xabc123...
   Block: 12345678

💰 BALANCE AFTER: 7.5 USDCe
💸 AMOUNT SPENT: 3.0 USDCe

================================================================================
✅ PAYMENT vvs_swap-1706025600 COMPLETED
================================================================================
```

### Console Logs
The MCP server outputs detailed logs to stderr:

```
✅ MCP Payment Server initialized with x402
   Network: testnet
   Payment Token: USDCe at 0xc21223249CA28397B4B6541dfFaEcC539BfF0c59

📋 Listing tools...

================================================================================
🔧 TOOL CALLED: get_token_price
================================================================================
📥 Arguments: {"symbol":"CRO"}

⚙️ EXECUTING TOOL: get_token_price...

✅ TOOL EXECUTION COMPLETED SUCCESSFULLY
================================================================================
```

## 🛠️ Troubleshooting

### Common Issues

**"Insufficient USDCe"**
```
Error: Insufficient USDCe. You have 0.2 USDCe but need 0.5 USDCe.
```
**Solution:** Fund your wallet with USDCe:
1. Get testnet CRO from [Cronos Faucet](https://cronos.org/faucet)
2. Swap CRO for USDCe on [VVS Finance](https://vvs.finance)

**"VVS Quote API error"**
```
Error: VVS Quote API error. Verify your Quote API Client ID is valid.
```
**Solution:** 
1. Verify `SWAP_SDK_QUOTE_API_CLIENT_ID_338` is set in `.env`
2. Request API access from [VVS Discord](https://discord.gg/vvsfinance)

**"Payment verification failed"**
```
Error: Verification failed: Invalid signature
```
**Solution:**
- Ensure `PRIVATE_KEY` is correct in `.env`
- Verify you have enough CRO for gas fees
- Check that recipient address is valid

**"PRIVATE_KEY not set in environment"**
```
Error: PRIVATE_KEY not set in environment
```
**Solution:** Add your wallet's private key to `.env`:
```bash
PRIVATE_KEY=0xYourPrivateKeyHere
```

**"Module not found" errors**
```
Error: Cannot find module '@anthropic-ai/sdk'
```
**Solution:** Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

Enable verbose logging:
```bash
# In .env
DEBUG=true

# Or run with environment variable
DEBUG=true npm run agent
```

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Never share your private keys

2. **Use testnet for development**
   - Set `NETWORK=testnet` in `.env`
   - Test thoroughly before mainnet

3. **Audit payment flows**
   - Review `x402-payments.log` regularly
   - Verify transactions on Cronos Explorer

4. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

5. **Limit payment recipient**
   - Set trusted `PAYMENT_RECIPIENT_ADDRESS`
   - Monitor recipient balance

## 📚 Resources

### Documentation
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Cronos Documentation](https://docs.cronos.org)
- [VVS Finance Docs](https://docs.vvs.finance)
- [x402 Protocol](https://github.com/crypto-com/facilitator-client)

### Network Information
- [Cronos Explorer](https://explorer.cronos.org)
- [Cronos Faucet](https://cronos.org/faucet)
- [VVS Finance DEX](https://vvs.finance)

### Community
- [Cronos Discord](https://discord.gg/cronos)
- [VVS Finance Discord](https://discord.gg/vvsfinance)
- [Anthropic Discord](https://discord.gg/anthropic)

## 🚀 Advanced Usage

### Adding Custom Tools

1. **Create tool implementation**
```typescript
// src/tools/premium/myCustomTool.ts
export async function myCustomTool(param1: string) {
  // Your logic here
  return {
    success: true,
    data: { result: "..." }
  };
}
```

2. **Add tool definition**
```typescript
// src/config/tools.ts
{
  id: 'my_custom_tool',
  name: 'My Custom Tool',
  description: 'Does something amazing',
  tier: 'premium',
  priceInCRO: 0.5,
  priceInUSDC: 0.01,
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'First parameter'
      }
    },
    required: ['param1']
  }
}
```

3. **Add execution logic**
```typescript
// src/index.ts - in executeTool() method
case 'my_custom_tool': {
  const { myCustomTool } = await import('./tools/premium/myCustomTool.js');
  const result = await myCustomTool(args.param1);
  return {
    success: true,
    tool: toolId,
    tier: 'premium',
    paymentMethod: 'x402',
    paymentDetails: paymentInfo,
    data: result
  };
}
```

4. **Rebuild and test**
```bash
npm run build
npm run agent
```

### Connecting to Claude Desktop

You can connect this MCP server to Claude Desktop:

1. **Build the server**
```bash
npm run build
```

2. **Add to Claude config**

On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cronos-payment": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-payment-server/dist/index.js"],
      "env": {
        "NETWORK": "testnet",
        "PRIVATE_KEY": "your_key",
        "ANTHROPIC_API_KEY": "your_key"
      }
    }
  }
}
```

3. **Restart Claude Desktop**

Now Claude Desktop can use all your payment-enabled tools!

## 📊 Payment Analytics

### View Payment History
```bash
# View all payments
cat x402-payments.log

# View recent payments
tail -100 x402-payments.log

# Search for specific tool
grep "vvs_swap" x402-payments.log

# Count total payments
grep "PAYMENT COMPLETED" x402-payments.log | wc -l
```

### Calculate Total Spent
```bash
# Extract amounts and sum
grep "AMOUNT SPENT:" x402-payments.log | \
  awk '{sum+=$3} END {print "Total: " sum " USDCe"}'
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual Testing Checklist

- [ ] Free tools work without payment
- [ ] Premium tools require USDCe payment
- [ ] Ultra tools execute transactions
- [ ] Payments are logged correctly
- [ ] Balance checks work
- [ ] VVS swaps execute successfully
- [ ] Error handling works properly
- [ ] Agent responds appropriately

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Code follows TypeScript best practices
- All tests pass
- Documentation is updated
- Changes are tested on testnet

## 📧 Support

For issues and questions:

- **GitHub Issues**: [Open an issue](https://github.com/your-repo/issues)
- **Email**: support@yourproject.com
- **Discord**: [Join our community](#)

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude AI
- [Cronos](https://cronos.org) for the blockchain infrastructure
- [VVS Finance](https://vvs.finance) for DEX integration
- [Crypto.com](https://crypto.com) for x402 Facilitator
- [Model Context Protocol](https://modelcontextprotocol.io) team

## 📈 Roadmap

- [ ] Mainnet deployment
- [ ] Additional DEX integrations
- [ ] NFT tools
- [ ] Governance tools
- [ ] Mobile app support
- [ ] Multi-chain support
- [ ] Advanced analytics dashboard

---

Built with ❤️ using Claude AI, Cronos, x402, and the Model Context Protocol