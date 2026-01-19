import { ethers } from 'ethers';
import { getProvider } from '../config/blockchain.js';
import axios from 'axios';

export class CronosService {
  private provider: ethers.Provider;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.provider = getProvider(network);
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string, tokenAddress?: string): Promise<string> {
    try {
      if (!tokenAddress) {
        // Get native CRO balance
        const balance = await this.provider.getBalance(address);
        return ethers.formatEther(balance);
      } else {
        // Get ERC20 token balance
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          this.provider
        );
        const balance = await tokenContract.balanceOf(address);
        return ethers.formatUnits(balance, 18);
      }
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<{ gwei: string; wei: string }> {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      
      return {
        gwei: ethers.formatUnits(gasPrice, 'gwei'),
        wei: gasPrice.toString()
      };
    } catch (error) {
      throw new Error(`Failed to get gas price: ${error}`);
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash: string) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) {
        throw new Error('Transaction not found');
      }

      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasPrice: ethers.formatUnits(tx.gasPrice || BigInt(0), 'gwei'),
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        blockNumber: tx.blockNumber,
        confirmations: receipt ? await receipt.confirmations() : 0
      };
    } catch (error) {
      throw new Error(`Failed to get transaction: ${error}`);
    }
  }

  /**
   * Get token price from Crypto.com Market Data
   */
  async getTokenPrice(symbol: string): Promise<{ symbol: string; price: number; change24h: number }> {
    try {
      // This would integrate with Crypto.com Market Data MCP Server
      // For now, using a placeholder API call
      const response = await axios.get(`https://api.crypto.com/v2/public/get-ticker?instrument_name=${symbol}_USD`);
      
      const data = response.data.result.data[0];
      
      return {
        symbol: symbol,
        price: parseFloat(data.a), // ask price
        change24h: parseFloat(data.c) // 24h change
      };
    } catch (error) {
      throw new Error(`Failed to get token price: ${error}`);
    }
  }
}