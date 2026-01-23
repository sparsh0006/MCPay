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

      console.error(`\n${'='.repeat(80)}`);
      console.error(`🔧 TOOL CALLED: ${name}`);
      console.error(`${'='.repeat(80)}`);
      console.error(`📥 Arguments:`, JSON.stringify(args, null, 2));

      try {
        const userAddress = this.getUserAddress(args);
        const tool = TOOLS.find(t => t.id === name);

        if (!tool) {
          throw new Error(`Tool '${name}' not found`);
        }

        if (name === 'check_x402_status') {
          const result = await this.handleX402Status();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        let paymentInfo = null;

        if (tool.tier !== 'free') {
          console.error(`\n💳 PAID TOOL (${tool.tier} tier) - Payment required`);
          paymentInfo = await this.handlePayment(userAddress, tool);
        } else {
          console.error(`\n🆓 FREE TOOL - No payment required`);
        }

        const result = await this.executeTool(
          name,
          args,
          userAddress,
          paymentInfo
        );

        console.error(`\n✅ TOOL EXECUTION COMPLETED SUCCESSFULLY`);
        console.error(`${'='.repeat(80)}\n`);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        console.error(`\n❌ ERROR: ${error.message}`);
        console.error(`${'='.repeat(80)}\n`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: error.message,
                  tool: name,
                  suggestion: this.getErrorSuggestion(error.message),
                },
                null,
                2
              ),
            },
          ],
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
      desc += ` | 💳 ${tool.priceInCRO} USDCe [x402 Auto-Payment]`;
    } else if (tool.tier === 'ultra') {
      desc += ` | 💎 ${tool.priceInCRO} USDCe [x402 Auto-Payment]`;
    }

    return desc;
  }

  private getUserAddress(args: any): string {
    return (
      args?.address ||
      args?.userAddress ||
      process.env.DEFAULT_USER_ADDRESS ||
      '0x0000000000000000000000000000000000000000'
    );
  }

  private async handlePayment(userAddress: string, tool: any): Promise<any> {
    console.error(`\n💰 PAYMENT PROCESSING FOR: ${tool.id}`);

    const usdceBalance = await this.paymentService.getBalance(userAddress);
    const croBalance = await this.paymentService.getCROBalance();
    const price = this.paymentService.getToolPrice(tool.id);

    console.error(`\n📊 BALANCE CHECK:`);
    console.error(`   💵 USDCe Balance: ${usdceBalance} USDCe`);
    console.error(`   💎 CRO Balance:   ${croBalance} CRO`);
    console.error(`   💰 Tool Price:    ${price?.cro} USDCe`);

    if (parseFloat(usdceBalance) < (price?.cro || 0)) {
      throw new Error(
        `Insufficient USDCe. You have ${usdceBalance} USDCe but need ${price?.cro} USDCe.`
      );
    }

    console.error(`   ✅ Sufficient balance - proceeding with payment\n`);

    const paymentResult = await this.paymentService.processPayment(
      userAddress,
      tool.id
    );

    if (paymentResult.success) {
      console.error(`\n✅ PAYMENT COMPLETED SUCCESSFULLY`);
      if (paymentResult.payment?.txHash) {
        console.error(`   Transaction: ${paymentResult.payment.txHash}`);
        console.error(
          `   Explorer: ${paymentResult.payment.explorerUrl || 'N/A'}`
        );
      }
      return paymentResult.payment;
    }

    throw new Error('Payment failed');
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
        capabilities,
        balances: {
          cro: `${croBalance} CRO (gas only)`,
          usdce: `${usdceBalance} USDCe`,
        },
        paymentToken: 'USDCe',
      },
      message: '✅ x402 payment system is operational',
    };
  }

  private async executeTool(
    toolId: string,
    args: any,
    userAddress: string,
    paymentInfo: any = null
  ) {
    console.error(`\n⚙️ EXECUTING TOOL: ${toolId}...`);

    switch (toolId) {
      /* ---------- FREE TOOLS ---------- */

      case 'get_cronos_balance':
        return {
          success: true,
          tool: toolId,
          tier: 'free',
          data: {
            address: args.address,
            token: args.token || 'CRO',
            balance: await this.cronosService.getBalance(
              args.address,
              args.token
            ),
          },
        };

      case 'get_gas_price':
        return {
          success: true,
          tool: toolId,
          tier: 'free',
          data: await this.cronosService.getGasPrice(),
        };

      case 'get_token_price':
        return {
          success: true,
          tool: toolId,
          tier: 'free',
          data: await this.cronosService.getTokenPrice(args.symbol),
        };

      case 'check_transaction_status':
        return {
          success: true,
          tool: toolId,
          tier: 'free',
          data: await this.cronosService.getTransaction(args.txHash),
        };

      /* ---------- PREMIUM TOOLS ---------- */

      case 'analyze_wallet_portfolio': {
        const analysis = await analyzePortfolio(args.address);
        return {
          success: true,
          tool: toolId,
          tier: 'premium',
          paymentMethod: 'x402',
          paymentDetails: paymentInfo,
          data: analysis,
        };
      }

      case 'get_historical_price_data':
        return {
          success: true,
          tool: toolId,
          tier: 'premium',
          paymentMethod: 'x402',
          paymentDetails: paymentInfo,
          data: {
            symbol: args.symbol,
            days: args.days,
            prices: [
              { date: '2026-01-12', close: 0.087 },
              { date: '2026-01-13', close: 0.088 },
            ],
          },
        };

      case 'find_arbitrage_opportunities':
        return {
          success: true,
          tool: toolId,
          tier: 'premium',
          paymentMethod: 'x402',
          paymentDetails: paymentInfo,
          data: {
            opportunities: [],
            message: 'No arbitrage found',
          },
        };

      case 'optimize_swap_route':
        return {
          success: true,
          tool: toolId,
          tier: 'premium',
          paymentMethod: 'x402',
          paymentDetails: paymentInfo,
          data: {
            bestRoute: 'VVS Finance',
            expectedOutput: '0.95',
          },
        };

      /* ---------- ULTRA TOOLS ---------- */

      case 'vvs_swap': {
        const { vvsSwap } = await import('./tools/ultra/vvsSwap.js');
        const swapResult = await vvsSwap(
          args.inputToken,
          args.outputToken,
          args.amountIn,
          args.executeImmediately || false
        );
        return {
          success: true,
          tool: toolId,
          tier: 'ultra',
          paymentMethod: 'x402',
          paymentDetails: paymentInfo,
          data: swapResult
        };
      }

      case 'execute_token_swap':
        return {
          success: true,
          tool: toolId,
          tier: 'ultra',
          paymentMethod: 'x402',
          paymentDetails: paymentInfo,
          data: {
            message: 'Swap ready for execution',
            requiresApproval: true,
          },
        };

      case 'auto_compound_rewards':
        return {
          success: true,
          tool: toolId,
          tier: 'ultra',
          paymentMethod: 'x402',
          paymentDetails: paymentInfo,
          data: {
            message: 'Auto-compound ready',
            requiresApproval: true,
          },
        };

      default:
        throw new Error(`Tool implementation not found for ${toolId}`);
    }
  }

  private getErrorSuggestion(error: string): string {
    if (error.includes('Insufficient USDCe')) {
      return 'Fund your wallet with USDCe and retry.';
    }
    if (error.includes('not found')) {
      return 'Check the tool name and try again.';
    }
    return 'Please check the error and try again.';
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('🚀 Cronos MCP Server with x402 Payments READY');
  }
}

const server = new MCPPaymentServer();
server.run().catch(console.error);