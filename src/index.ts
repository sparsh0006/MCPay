import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from './config/tools.js';
import { PaymentService } from './services/PaymentService.js';
import { CronosService } from './services/CronosService.js';
import { analyzePortfolio } from './tools/premium/analyzePortfolio.js';

class MCPPaymentServer {
  private server: Server;
  private paymentService: PaymentService;
  private cronosService: CronosService;

  constructor() {
    this.server = new Server(
      {
        name: 'cronos-mcp-x402-server',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.paymentService = new PaymentService('testnet');
    this.cronosService = new CronosService('testnet');

    this.setupHandlers();
    
    console.error('✅ MCP Payment Server initialized with x402');
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('📋 Listing tools...');
      
      return {
        tools: TOOLS.map(tool => ({
          name: tool.id,
          description: this.formatToolDescription(tool),
          inputSchema: tool.inputSchema,
        })),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      console.error(`\n${'='.repeat(60)}`);
      console.error(`🔧 Tool called: ${name}`);
      console.error(`📥 Arguments:`, JSON.stringify(args, null, 2));

      try {
        const userAddress = this.getUserAddress(args);
        const tool = TOOLS.find(t => t.id === name);
        
        if (!tool) {
          throw new Error(`Tool '${name}' not found`);
        }

        // Handle x402 status check
        if (name === 'check_x402_status') {
          const result = await this.handleX402Status();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // Process payment for paid tools
        if (tool.tier !== 'free') {
          console.error(`\n💰 This is a PAID tool (${tool.tier} tier)`);
          const paid = await this.handlePayment(userAddress, tool);
          if (!paid) {
            throw new Error('Payment verification failed. Check logs above for details.');
          }
        } else {
          console.error(`\n🆓 This is a FREE tool`);
        }

        // Execute tool
        const result = await this.executeTool(name, args, userAddress);

        console.error(`✅ Tool execution completed successfully`);
        console.error(`${'='.repeat(60)}\n`);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(`${'='.repeat(60)}\n`);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: error.message,
              tool: name,
              suggestion: this.getErrorSuggestion(error.message)
            }, null, 2),
          }],
          isError: true,
        };
      }
    });
  }

  private formatToolDescription(tool: any): string {
    let desc = tool.description;
    
    if (tool.tier === 'free') {
      desc += ' | 🆓 FREE';
    } else if (tool.tier === 'premium') {
      desc += ` | 💳 ${tool.priceInCRO} CRO [x402 Auto-Payment]`;
    } else if (tool.tier === 'ultra') {
      desc += ` | 💎 ${tool.priceInCRO} CRO [x402 Auto-Payment]`;
    }
    
    return desc;
  }

  private getUserAddress(args: any): string {
    return (args as any).address || 
           (args as any).userAddress || 
           process.env.DEFAULT_USER_ADDRESS || 
           '0x0000000000000000000000000000000000000000';
  }

  private async handlePayment(userAddress: string, tool: any): Promise<boolean> {
    console.error(`💰 Checking payment requirements...`);
    
    const usdceBalance = await this.paymentService.getBalance(userAddress);
    const croBalance = await this.paymentService.getCROBalance();
    const price = this.paymentService.getToolPrice(tool.id);
    
    console.error(`   💵 USDCe Balance: ${usdceBalance} USDCe`);
    console.error(`   💎 CRO Balance: ${croBalance} CRO`);
    console.error(`   💰 Tool Price: ${price?.cro} CRO (≈${price?.cro} USDCe)`);
    
    if (parseFloat(usdceBalance) < (price?.cro || 0)) {
      throw new Error(
        `Insufficient USDCe balance. You have ${usdceBalance} USDCe but need ${price?.cro} USDCe. ` +
        `Get testnet USDCe from: https://faucet.cronos.org`
      );
    }
    
    console.error(`\n🚀 Initiating x402 payment...`);
    const success = await this.paymentService.processPayment(userAddress, tool.id);
    
    if (success) {
      console.error(`✅ x402 payment completed successfully!`);
      return true;
    } else {
      console.error(`❌ x402 payment failed!`);
      return false;
    }
  }

  private async handleX402Status() {
    const capabilities = await this.paymentService.getX402Capabilities();
    const usdceBalance = await this.paymentService.getBalance('');
    const croBalance = await this.paymentService.getCROBalance();

    return {
      success: true,
      x402: {
        enabled: true,
        network: process.env.NETWORK || 'testnet',
        capabilities: capabilities,
        balances: {
          cro: `${croBalance} CRO`,
          usdce: `${usdceBalance} USDCe (payment token)`
        },
        recipientAddress: process.env.PAYMENT_RECIPIENT_ADDRESS || 'not set',
        note: 'x402 payments are processed in USDCe, not CRO'
      },
      message: '✅ x402 payment system is operational'
    };
  }

  private async executeTool(toolId: string, args: any, userAddress: string) {
    console.error(`⚙️  Executing ${toolId}...`);
    
    switch (toolId) {
      case 'get_cronos_balance': {
        const balance = await this.cronosService.getBalance(args.address, args.token);
        return {
          success: true,
          tool: toolId,
          tier: 'free',
          data: { address: args.address, balance, token: args.token || 'CRO' }
        };
      }

      case 'get_gas_price': {
        const gasPrice = await this.cronosService.getGasPrice();
        return {
          success: true,
          tool: toolId,
          tier: 'free',
          data: gasPrice
        };
      }

      case 'get_token_price': {
        const price = await this.cronosService.getTokenPrice(args.symbol);
        return {
          success: true,
          tool: toolId,
          tier: 'free',
          data: price
        };
      }

      case 'check_transaction_status': {
        const tx = await this.cronosService.getTransaction(args.txHash);
        return {
          success: true,
          tool: toolId,
          tier: 'free',
          data: tx
        };
      }

      case 'analyze_wallet_portfolio': {
        const analysis = await analyzePortfolio(args.address);
        return {
          success: true,
          tool: toolId,
          tier: 'premium',
          paymentMethod: 'x402',
          paidAmount: '0.5 CRO',
          data: analysis
        };
      }

      case 'get_historical_price_data': {
        return {
          success: true,
          tool: toolId,
          tier: 'premium',
          paymentMethod: 'x402',
          paidAmount: '0.25 CRO',
          data: {
            symbol: args.symbol,
            days: args.days,
            prices: [
              { date: '2026-01-12', close: 0.087 },
              { date: '2026-01-13', close: 0.088 },
            ]
          }
        };
      }

      case 'find_arbitrage_opportunities': {
        return {
          success: true,
          tool: toolId,
          tier: 'premium',
          paymentMethod: 'x402',
          paidAmount: '1.0 CRO',
          data: {
            opportunities: [],
            message: 'No arbitrage found'
          }
        };
      }

      case 'optimize_swap_route': {
        return {
          success: true,
          tool: toolId,
          tier: 'premium',
          paymentMethod: 'x402',
          paidAmount: '0.4 CRO',
          data: {
            bestRoute: 'VVS Finance',
            expectedOutput: '0.95'
          }
        };
      }

      case 'execute_token_swap': {
        return {
          success: true,
          tool: toolId,
          tier: 'ultra',
          paymentMethod: 'x402',
          paidAmount: '5.0 CRO',
          data: {
            message: 'Swap ready for execution',
            requiresApproval: true
          }
        };
      }

      case 'auto_compound_rewards': {
        return {
          success: true,
          tool: toolId,
          tier: 'ultra',
          paymentMethod: 'x402',
          paidAmount: '7.5 CRO',
          data: {
            message: 'Auto-compound ready',
            requiresApproval: true
          }
        };
      }

      default:
        throw new Error(`Tool implementation not found for ${toolId}`);
    }
  }

  private getErrorSuggestion(error: string): string {
    if (error.includes('Insufficient USDCe')) {
      return 'Get testnet USDCe from https://faucet.cronos.org then swap TCRO to USDCe on a testnet DEX';
    }
    if (error.includes('Insufficient balance')) {
      return 'Please add more funds to your wallet to use this paid tool.';
    }
    if (error.includes('not found')) {
      return 'Check the tool name and try again.';
    }
    return 'Please check the error and try again.';
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('');
    console.error('═══════════════════════════════════════════');
    console.error('🚀 Cronos MCP Server with x402 Payments');
    console.error('═══════════════════════════════════════════');
    console.error('💳 x402 Facilitator: ENABLED');
    console.error(`📍 Network: ${process.env.NETWORK || 'testnet'}`);
    console.error(`📊 Tools: ${TOOLS.length} total`);
    console.error('💵 Payment Token: USDCe (NOT CRO)');
    console.error('');
    console.error('✅ Ready for requests!');
    console.error('═══════════════════════════════════════════');
    console.error('');
  }
}

const server = new MCPPaymentServer();
server.run().catch(console.error);