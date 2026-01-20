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

  async processPayment(userAddress: string, toolId: string): Promise<boolean> {
    try {
      const tool = TOOLS.find(t => t.id === toolId);
      
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }

      if (tool.tier === 'free') {
        return true;
      }

      console.error(`\n💳 [PaymentService] Processing payment for ${toolId}`);
      console.error(`   Recipient: ${this.recipientAddress}`);
      console.error(`   Amount: ${tool.priceInCRO} CRO`);

      const result = await this.x402Service.executeToolPayment(
        this.recipientAddress,
        toolId,
        tool.priceInCRO
      );

      if (!result.success) {
        console.error(`❌ Payment failed: ${result.error}`);
        throw new Error(result.error || 'x402 payment execution failed');
      }

      console.error(`✅ Payment successful: ${result.txHash}`);
      return true;

    } catch (error: any) {
      console.error('❌ Payment processing error:', error.message);
      return false;
    }
  }

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

  async getBalance(userAddress: string): Promise<string> {
    try {
      // Return USDCe balance (the actual payment token)
      return await this.x402Service.getUSDCeBalance();
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  async getCROBalance(): Promise<string> {
    try {
      return await this.x402Service.getSignerBalance();
    } catch (error) {
      return '0';
    }
  }

  getToolPrice(toolId: string): { cro: number; usdc: number } | null {
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) return null;

    return {
      cro: tool.priceInCRO,
      usdc: tool.priceInUSDC
    };
  }

  async getX402Capabilities() {
    return await this.x402Service.getSupported();
  }

  async verifyPaymentCapability(amountCRO: number): Promise<boolean> {
    return await this.x402Service.verifyPaymentOnly(
      this.recipientAddress,
      amountCRO,
      'Test payment verification'
    );
  }
}