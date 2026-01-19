import { ethers } from 'ethers';
import { TOOLS } from '../config/tools.js';
import { X402Service } from './X402Service.js';

export class PaymentService {
  private x402Service: X402Service;
  private recipientAddress: string;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.x402Service = new X402Service(network);
    this.recipientAddress = process.env.PAYMENT_RECIPIENT_ADDRESS || '';
    
    if (!this.recipientAddress) {
      console.warn('⚠️  PAYMENT_RECIPIENT_ADDRESS not set in .env');
    }
  }

  /**
   * Process payment for a tool call via x402
   */
  async processPayment(userAddress: string, toolId: string): Promise<boolean> {
    try {
      const tool = TOOLS.find(t => t.id === toolId);
      
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }

      // Free tools don't require payment
      if (tool.tier === 'free') {
        return true;
      }

      // Execute x402 payment
      const result = await this.x402Service.executeToolPayment(
        this.recipientAddress,
        toolId,
        tool.priceInCRO
      );

      if (!result.success) {
        throw new Error('x402 payment execution failed');
      }

      console.error(`✅ Payment successful: ${result.txHash}`);
      return true;

    } catch (error: any) {
      console.error('❌ Payment processing error:', error.message);
      throw error;
    }
  }

  /**
   * Check if user can afford a tool
   */
  async canAffordTool(userAddress: string, toolId: string): Promise<boolean> {
    try {
      const tool = TOOLS.find(t => t.id === toolId);
      
      if (!tool || tool.tier === 'free') {
        return true;
      }

      return await this.x402Service.canAffordPayment(tool.priceInCRO);

    } catch (error) {
      console.error('Error checking affordability:', error);
      return false;
    }
  }

  /**
   * Get current balance
   */
  async getBalance(userAddress: string): Promise<string> {
    try {
      return await this.x402Service.getSignerBalance();
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  /**
   * Get tool price
   */
  getToolPrice(toolId: string): { cro: number; usdc: number } | null {
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) return null;

    return {
      cro: tool.priceInCRO,
      usdc: tool.priceInUSDC
    };
  }

  /**
   * Get x402 supported capabilities
   */
  async getX402Capabilities() {
    return await this.x402Service.getSupported();
  }

  /**
   * Verify payment capability without executing
   */
  async verifyPaymentCapability(amountCRO: number): Promise<boolean> {
    return await this.x402Service.verifyPaymentOnly(
      this.recipientAddress,
      amountCRO,
      'Test payment verification'
    );
  }
}