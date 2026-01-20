import { CronosService } from './CronosService.js';
import { analyzePortfolio } from '../tools/premium/analyzePortfolio.js';
import { findArbitrage } from '../tools/premium/findArbitrage.js';
import { getHistoricalData } from '../tools/premium/getHistoricalData.js';
import { optimizeSwapRoute } from '../tools/premium/optimizeSwapRoute.js';
import { executeSwap } from '../tools/ultra/executeSwap.js';
import { autoCompound } from '../tools/ultra/autoCompound.js';

export class ToolExecutor {
  private cronosService: CronosService;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.cronosService = new CronosService(network);
  }

  async execute(toolId: string, args: any) {
    switch (toolId) {
      // Free Tools (Direct Service Calls)
      case 'get_cronos_balance':
        return await this.cronosService.getBalance(args.address, args.token);
      
      case 'get_gas_price':
        return await this.cronosService.getGasPrice();
      
      case 'get_token_price':
        return await this.cronosService.getTokenPrice(args.symbol);
      
      case 'check_transaction_status':
        return await this.cronosService.getTransaction(args.txHash);

      // Premium Tools
      case 'analyze_wallet_portfolio':
        return await analyzePortfolio(args.address);
      
      case 'get_historical_price_data':
        return await getHistoricalData(args.symbol, args.days);
      
      case 'find_arbitrage_opportunities':
        return await findArbitrage(args.minProfitUSD);
      
      case 'optimize_swap_route':
        return await optimizeSwapRoute(args.tokenIn, args.tokenOut, args.amountIn);

      // Ultra Tools
      case 'execute_token_swap':
        return await executeSwap(args.tokenIn, args.tokenOut, args.amountIn, args.slippage);
      
      case 'auto_compound_rewards':
        return await autoCompound(args.protocol, args.poolAddress);

      default:
        throw new Error(`Executor implementation missing for tool: ${toolId}`);
    }
  }
}