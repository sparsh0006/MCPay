// ============================================================
// File 2: src/tools/ultra/vvsSwap.ts
// ============================================================

import { VVSSwapService } from '../../agent/vvsSwapIntegration.js';

export async function vvsSwap(
  inputToken: string,
  outputToken: string,
  amountIn: string,
  executeImmediately: boolean = false
) {
  const vvsService = new VVSSwapService('testnet');
  
  try {
    const inputAddress = vvsService.getTokenAddress(inputToken);
    const outputAddress = vvsService.getTokenAddress(outputToken);
    
    console.log(`🔍 Input: ${inputToken} → ${inputAddress}`);
    console.log(`🔍 Output: ${outputToken} → ${outputAddress}`);
    
    const tradeResult = await vvsService.getBestTrade(
      inputAddress,
      outputAddress,
      amountIn
    );

    if (!executeImmediately) {
      return {
        success: true,
        action: 'quote',
        input: inputToken,
        output: outputToken,
        ...tradeResult.details,
        message: 'Trade route found. Set executeImmediately=true to execute.'
      };
    }

    const swapResult = await vvsService.executeSwap(tradeResult.trade);

    return {
      success: true,
      action: 'executed',
      input: inputToken,
      output: outputToken,
      ...tradeResult.details,
      transaction: {
        hash: swapResult.txHash,
        blockNumber: swapResult.blockNumber,
        explorerUrl: swapResult.explorerUrl,
        gasUsed: swapResult.gasUsed
      }
    };
  } catch (error: any) {
    console.error('❌ VVS Swap Error:', error.message);
    
    return {
      success: false,
      error: error.message,
      suggestion: error.message.includes('Quote API') 
        ? 'Get VVS Quote API Client ID from Discord and add to .env as SWAP_SDK_QUOTE_API_CLIENT_ID_338'
        : 'Try again or check VVS Finance status'
    };
  }
}