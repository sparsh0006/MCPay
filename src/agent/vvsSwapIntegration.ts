import { 
  fetchBestTrade, 
  executeTrade, 
  approveIfNeeded,
  PoolType, 
  BuiltInChainId,
  TradeType,
  utils as SwapSdkUtils,
  type Trade
} from '@vvs-finance/swap-sdk';
import { ethers } from 'ethers';
import { getSigner } from '../config/blockchain.js';
import dotenv from 'dotenv';

dotenv.config();

export class VVSSwapService {
  private chainId: number;
  private quoteApiClientId: string;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.chainId = network === 'mainnet' 
      ? BuiltInChainId.CRONOS_MAINNET 
      : BuiltInChainId.CRONOS_TESTNET;
    
    this.quoteApiClientId = process.env.SWAP_SDK_QUOTE_API_CLIENT_ID_338 || 
                           process.env.VVS_QUOTE_API_CLIENT_ID || '';
    
    if (!this.quoteApiClientId) {
      console.error('⚠️  VVS Quote API Client ID not found!');
      console.error('⚠️  Set SWAP_SDK_QUOTE_API_CLIENT_ID_338 in .env');
      console.error('⚠️  Request one from VVS Discord: https://discord.gg/vvsfinance');
    }
  }

  /**
   * Safely extract BigInt value from nested object
   */
  private extractBigInt(value: any): bigint {
    // If it's already a bigint, return it
    if (typeof value === 'bigint') {
      return value;
    }
    
    // If it's a number or string, convert it
    if (typeof value === 'number' || typeof value === 'string') {
      return BigInt(value);
    }
    
    // If it's an object, try to find the actual value
    if (value && typeof value === 'object') {
      // Try common property names
      if (value.quotient !== undefined) return this.extractBigInt(value.quotient);
      if (value.numerator !== undefined) return this.extractBigInt(value.numerator);
      if (value.value !== undefined) return this.extractBigInt(value.value);
      if (value._hex !== undefined) return BigInt(value._hex);
      if (value.toString && typeof value.toString === 'function') {
        const str = value.toString();
        if (str && str !== '[object Object]') {
          return BigInt(str);
        }
      }
    }
    
    // Fallback to 0
    console.warn('⚠️  Could not extract BigInt, defaulting to 0:', value);
    return BigInt(0);
  }

  /**
   * Fetch best trade route using VVS SDK
   */
  async getBestTrade(
    inputToken: string,
    outputToken: string,
    amount: string
  ) {
    try {
      console.log('📊 Fetching best trade...');
      console.log(`   Input: ${inputToken}`);
      console.log(`   Output: ${outputToken}`);
      console.log(`   Amount: ${amount}`);
      console.log(`   Quote API: ${this.quoteApiClientId ? 'SET ✅' : 'MISSING ❌'}`);

      if (!this.quoteApiClientId) {
        throw new Error('VVS Quote API Client ID is required. Set SWAP_SDK_QUOTE_API_CLIENT_ID_338 in .env');
      }

      const trade: Trade = await fetchBestTrade(
        this.chainId,
        inputToken,
        outputToken,
        amount,
        {
          tradeType: TradeType.EXACT_INPUT,
          poolTypes: [
            PoolType.V2,
            PoolType.V3_100,
            PoolType.V3_500,
            PoolType.V3_3000,
            PoolType.V3_10000
          ],
          maxHops: 3,
          maxSplits: 2,
          slippageTolerance: 0.5,
          quoteApiClientId: this.quoteApiClientId
        }
      );

      console.log('✅ Trade fetched successfully');
      console.log('🔍 Debug - Trade object:', JSON.stringify(trade, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2));

      // Safe property access
      const tradeAny = trade as any;
      const firstRoute = trade.routes?.[0];

      // Build route path
      const routePath = firstRoute?.path?.map((t: any) => t.symbol || 'Unknown').join(' → ') || 
                       `${inputToken} → ${outputToken}`;

      // Extract amounts using safe BigInt extraction
      const inputAmountBigInt = this.extractBigInt(tradeAny.amountIn?.amount);
      const outputAmountBigInt = this.extractBigInt(tradeAny.amountOut?.amount);
      
      const inputDecimals = tradeAny.amountIn?.token?.decimals || 18;
      const outputDecimals = tradeAny.amountOut?.token?.decimals || 18;

      const inputFormatted = ethers.formatUnits(inputAmountBigInt, inputDecimals);
      const outputFormatted = ethers.formatUnits(outputAmountBigInt, outputDecimals);

      // Extract price safely
      let priceStr = 'N/A';
      try {
        if (tradeAny.price) {
          if (typeof tradeAny.price.toSignificant === 'function') {
            priceStr = tradeAny.price.toSignificant(6);
          } else if (typeof tradeAny.price.toString === 'function') {
            priceStr = tradeAny.price.toString();
          }
        }
      } catch (e) {
        console.warn('Could not extract price:', e);
      }

      // Extract LP fee ratio
      let lpFeeRatioNum = 0;
      try {
        if (tradeAny.lpFeeRatio) {
          if (typeof tradeAny.lpFeeRatio.toSignificant === 'function') {
            lpFeeRatioNum = parseFloat(tradeAny.lpFeeRatio.toSignificant(4));
          } else if (typeof tradeAny.lpFeeRatio.toString === 'function') {
            lpFeeRatioNum = parseFloat(tradeAny.lpFeeRatio.toString());
          }
        }
      } catch (e) {
        console.warn('Could not extract lpFeeRatio:', e);
      }

      // Extract LP fee amount
      const lpFeeAmountBigInt = this.extractBigInt(tradeAny.lpFee?.amount);
      const lpFeeDecimals = tradeAny.lpFee?.token?.decimals || 18;
      const lpFeeSymbol = tradeAny.lpFee?.token?.symbol || '';
      const lpFeeFormatted = ethers.formatUnits(lpFeeAmountBigInt, lpFeeDecimals);

      // Extract slippage info
      let minReceivedStr = 'N/A';
      try {
        const minReceived = tradeAny.slippage?.minimumReceived;
        if (minReceived) {
          const minReceivedBigInt = this.extractBigInt(minReceived.amount);
          const minReceivedDecimals = minReceived.token?.decimals || 18;
          const minReceivedSymbol = minReceived.token?.symbol || '';
          minReceivedStr = `${ethers.formatUnits(minReceivedBigInt, minReceivedDecimals)} ${minReceivedSymbol}`;
        }
      } catch (e) {
        console.warn('Could not extract minimumReceived:', e);
      }

      // Extract slippage tolerance
      let slippageToleranceStr = '0.5';
      try {
        if (tradeAny.slippage?.tolerance) {
          if (typeof tradeAny.slippage.tolerance.toSignificant === 'function') {
            slippageToleranceStr = tradeAny.slippage.tolerance.toSignificant(2);
          } else if (typeof tradeAny.slippage.tolerance.toString === 'function') {
            slippageToleranceStr = tradeAny.slippage.tolerance.toString();
          }
        }
      } catch (e) {
        console.warn('Could not extract slippage tolerance:', e);
      }

      return {
        success: true,
        trade,
        formatted: SwapSdkUtils.formatTrade(trade),
        details: {
          inputAmount: inputFormatted,
          inputTokenSymbol: tradeAny.amountIn?.token?.symbol || inputToken,
          outputAmount: outputFormatted,
          outputTokenSymbol: tradeAny.amountOut?.token?.symbol || outputToken,
          executionPrice: priceStr,
          lpFeeRatio: `${(lpFeeRatioNum * 100).toFixed(2)}%`,
          lpFee: `${lpFeeFormatted} ${lpFeeSymbol}`,
          route: routePath,
          poolVersion: (firstRoute as any)?.pool?.[0]?.version || 'V2',
          minimumReceived: minReceivedStr,
          slippageTolerance: `${slippageToleranceStr}%`
        }
      };
    } catch (error: any) {
      console.error('❌ VVS Trade Fetch Error:', error);
      
      if (error.message?.includes('Server error')) {
        throw new Error('VVS Quote API error. Verify your Quote API Client ID is valid.');
      }
      
      throw new Error(`Failed to fetch best trade: ${error.message}`);
    }
  }

  /**
   * Execute swap using VVS SDK
   */
  async executeSwap(trade: Trade, slippageTolerance: number = 0.5) {
    try {
      const signer = getSigner('testnet');
      
      console.log('🔐 Approving tokens if needed...');
      const approvalTx = await approveIfNeeded(this.chainId, trade, signer);
      
      if (approvalTx) {
        console.log(`✅ Approval tx: ${approvalTx.hash}`);
        await approvalTx.wait();
        console.log('✅ Approval confirmed');
      }

      console.log('🔄 Executing swap...');
      const tx = await executeTrade(this.chainId, trade, signer);
      
      console.log(`✅ Swap tx: ${tx.hash}`);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber || 0,
        explorerUrl: `https://explorer.cronos.org/testnet/tx/${tx.hash}`,
        gasUsed: receipt?.gasUsed?.toString() || 'N/A'
      };
    } catch (error: any) {
      console.error('❌ Swap Execution Error:', error);
      throw new Error(`Swap execution failed: ${error.message}`);
    }
  }

  /**
   * Helper to convert token symbols to addresses
   */
  getTokenAddress(symbol: string): string {
    const tokenMap: Record<string, string> = {
      'NATIVE': 'NATIVE',
      'CRO': 'NATIVE',
      'WCRO': '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23',
      'USDC': '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
      'USDT': '0x66e428c3f67a68878562e79A0234c1F83c208770',
      'DAI': '0xF2001B145b43032AAF5Ee2884e456CCd805F677D',
      'WETH': '0xe44Fd7fCb2b1581822D0c862B68222998a0c299a',
      'WBTC': '0x062E66477Faf219F25D27dCED647BF57C3107d52',
      'VVS': '0x904Bd5a5AAC0B9d88A0D47864724218986Ad4a3a'
    };

    const upperSymbol = symbol.toUpperCase();
    return tokenMap[upperSymbol] || symbol;
  }

  /**
   * Get supported token list
   */
  getSupportedTokens(): string[] {
    return ['NATIVE', 'CRO', 'WCRO', 'USDC', 'USDT', 'DAI', 'WETH', 'WBTC', 'VVS'];
  }
}