export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'premium' | 'ultra';
  priceInCRO: number;
  priceInUSDC: number;
  inputSchema: any;
}

export const TOOLS: ToolDefinition[] = [
  // FREE TIER
  {
    id: 'get_cronos_balance',
    name: 'Get Cronos Balance',
    description: 'Check CRO and token balances for any address',
    tier: 'free',
    priceInCRO: 0,
    priceInUSDC: 0,
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Wallet address to check'
        },
        token: {
          type: 'string',
          description: 'Token contract address (optional, defaults to CRO)'
        }
      },
      required: ['address']
    }
  },
  {
    id: 'get_gas_price',
    name: 'Get Gas Price',
    description: 'Get current gas prices on Cronos network',
    tier: 'free',
    priceInCRO: 0,
    priceInUSDC: 0,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    id: 'get_token_price',
    name: 'Get Token Price',
    description: 'Get current price of tokens',
    tier: 'free',
    priceInCRO: 0,
    priceInUSDC: 0,
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Token symbol (e.g., CRO, BTC, ETH)'
        }
      },
      required: ['symbol']
    }
  },
  {
    id: 'check_transaction_status',
    name: 'Check Transaction Status',
    description: 'Look up transaction details by hash',
    tier: 'free',
    priceInCRO: 0,
    priceInUSDC: 0,
    inputSchema: {
      type: 'object',
      properties: {
        txHash: {
          type: 'string',
          description: 'Transaction hash'
        }
      },
      required: ['txHash']
    }
  },
  {
    id: 'check_x402_status',
    name: 'Check x402 Status',
    description: 'Check x402 payment system status and capabilities',
    tier: 'free',
    priceInCRO: 0,
    priceInUSDC: 0,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  // PREMIUM TIER
  {
    id: 'analyze_wallet_portfolio',
    name: 'Analyze Wallet Portfolio',
    description: 'Deep analysis of wallet holdings with diversification metrics',
    tier: 'premium',
    priceInCRO: 0.5,
    priceInUSDC: 0.01,
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Wallet address to analyze'
        }
      },
      required: ['address']
    }
  },
  {
    id: 'get_historical_price_data',
    name: 'Get Historical Price Data',
    description: 'Historical price charts and OHLCV data',
    tier: 'premium',
    priceInCRO: 0.25,
    priceInUSDC: 0.005,
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Token symbol'
        },
        days: {
          type: 'number',
          description: 'Number of days (7, 30, 90)'
        }
      },
      required: ['symbol', 'days']
    }
  },
  {
    id: 'find_arbitrage_opportunities',
    name: 'Find Arbitrage Opportunities',
    description: 'Scan Cronos DEXs for profitable arbitrage routes',
    tier: 'premium',
    priceInCRO: 1.0,
    priceInUSDC: 0.02,
    inputSchema: {
      type: 'object',
      properties: {
        minProfitUSD: {
          type: 'number',
          description: 'Minimum profit threshold in USD'
        }
      }
    }
  },
  {
    id: 'optimize_swap_route',
    name: 'Optimize Swap Route',
    description: 'Find best route for token swaps across Cronos DEXs',
    tier: 'premium',
    priceInCRO: 0.4,
    priceInUSDC: 0.008,
    inputSchema: {
      type: 'object',
      properties: {
        tokenIn: {
          type: 'string',
          description: 'Input token address'
        },
        tokenOut: {
          type: 'string',
          description: 'Output token address'
        },
        amountIn: {
          type: 'string',
          description: 'Amount to swap'
        }
      },
      required: ['tokenIn', 'tokenOut', 'amountIn']
    }
  },
  
  // ULTRA TIER
  {
    id: 'execute_token_swap',
    name: 'Execute Token Swap',
    description: 'Execute a token swap on VVS Finance',
    tier: 'ultra',
    priceInCRO: 5.0,
    priceInUSDC: 0.10,
    inputSchema: {
      type: 'object',
      properties: {
        tokenIn: { type: 'string' },
        tokenOut: { type: 'string' },
        amountIn: { type: 'string' },
        slippage: { 
          type: 'number',
          description: 'Slippage tolerance (e.g., 0.5 for 0.5%)'
        }
      },
      required: ['tokenIn', 'tokenOut', 'amountIn']
    }
  },
  {
    id: 'auto_compound_rewards',
    name: 'Auto Compound Rewards',
    description: 'Claim and reinvest DeFi yields automatically',
    tier: 'ultra',
    priceInCRO: 7.5,
    priceInUSDC: 0.15,
    inputSchema: {
      type: 'object',
      properties: {
        protocol: {
          type: 'string',
          description: 'Protocol name (e.g., VVS)'
        },
        poolAddress: {
          type: 'string',
          description: 'Liquidity pool address'
        }
      },
      required: ['protocol', 'poolAddress']
    }
  }
];