import { Facilitator, CronosNetwork } from '@crypto.com/facilitator-client';
import { ethers } from 'ethers';
import { getProvider, getSigner } from '../config/blockchain.js';

/**
 * X402 Payment Result
 */
interface X402PaymentResult {
  success: boolean;
  txHash?: string;
  amount: string;
  timestamp: number;
  verified: boolean;
  settled: boolean;
}

/**
 * X402Service - Handles x402 payments via Cronos Facilitator
 * Uses official @crypto.com/facilitator-client SDK
 */
export class X402Service {
  private facilitator: Facilitator;
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private network: CronosNetwork;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    // Initialize Facilitator with correct network
    this.network = network === 'mainnet' 
      ? CronosNetwork.CronosMainnet 
      : CronosNetwork.CronosTestnet;
    
    this.facilitator = new Facilitator({
      network: this.network,
    });

    this.provider = getProvider(network);
    this.signer = getSigner(network);

    console.error(`✅ x402 Facilitator initialized for ${network}`);
  }

  /**
   * Execute a payment via x402 Facilitator
   * This is the main method called by AI agents
   */
  async executePayment(
    recipientAddress: string,
    amountCRO: number,
    description: string,
    toolId: string
  ): Promise<X402PaymentResult> {
    try {
      console.error(`💳 Executing x402 payment via Facilitator...`);
      console.error(`   Recipient: ${recipientAddress}`);
      console.error(`   Amount: ${amountCRO} CRO`);
      console.error(`   Tool: ${toolId}`);

      // Convert CRO to wei (18 decimals)
      const amountWei = ethers.parseEther(amountCRO.toString()).toString();

      // Step 1: Generate Payment Header (EIP-3009)
      const validBefore = Math.floor(Date.now() / 1000) + 600; // 10 minutes validity
      
      const header = await this.facilitator.generatePaymentHeader({
        to: recipientAddress,
        value: amountWei,
        signer: this.signer,
        validBefore: validBefore,
      });

      console.error(`✅ Payment header generated`);

      // Step 2: Generate Payment Requirements
      const requirements = this.facilitator.generatePaymentRequirements({
        payTo: recipientAddress,
        description: `${description} (Tool: ${toolId})`,
        maxAmountRequired: amountWei,
      });

      console.error(`✅ Payment requirements generated`);

      // Step 3: Build Verify Request
      const verifyRequest = this.facilitator.buildVerifyRequest(header, requirements);

      // Step 4: Verify Payment
      const verifyResponse = await this.facilitator.verifyPayment(verifyRequest);
      
      console.error(`✅ Payment verified: ${verifyResponse.isValid}`);

      if (!verifyResponse.isValid) {
        throw new Error('Payment verification failed');
      }

      // Step 5: Settle Payment (execute on-chain)
      const settleResponse = await this.facilitator.settlePayment(verifyRequest);

      console.error(`✅ Payment settled on-chain`);
      console.error(`   Transaction Hash: ${settleResponse.txHash}`);

      return {
        success: true,
        txHash: settleResponse.txHash,
        amount: amountCRO.toString(),
        timestamp: Math.floor(Date.now() / 1000),
        verified: verifyResponse.isValid,
        settled: true,
      };

    } catch (error: any) {
      console.error('❌ x402 payment failed:', error.message);
      
      return {
        success: false,
        amount: amountCRO.toString(),
        timestamp: Math.floor(Date.now() / 1000),
        verified: false,
        settled: false,
      };
    }
  }

  /**
   * Execute payment for a specific tool
   */
  async executeToolPayment(
    recipientAddress: string,
    toolId: string,
    toolPrice: number
  ): Promise<X402PaymentResult> {
    return await this.executePayment(
      recipientAddress,
      toolPrice,
      `Payment for MCP tool: ${toolId}`,
      toolId
    );
  }

  /**
   * Get supported networks and capabilities
   */
  async getSupported() {
    try {
      const capabilities = await this.facilitator.getSupported();
      return capabilities;
    } catch (error: any) {
      console.error('❌ Failed to get supported capabilities:', error);
      return null;
    }
  }

  /**
   * Verify a payment without settling
   */
  async verifyPaymentOnly(
    recipientAddress: string,
    amountCRO: number,
    description: string
  ): Promise<boolean> {
    try {
      const amountWei = ethers.parseEther(amountCRO.toString()).toString();
      
      const header = await this.facilitator.generatePaymentHeader({
        to: recipientAddress,
        value: amountWei,
        signer: this.signer,
        validBefore: Math.floor(Date.now() / 1000) + 600,
      });

      const requirements = this.facilitator.generatePaymentRequirements({
        payTo: recipientAddress,
        description: description,
        maxAmountRequired: amountWei,
      });

      const verifyRequest = this.facilitator.buildVerifyRequest(header, requirements);
      const verifyResponse = await this.facilitator.verifyPayment(verifyRequest);

      return verifyResponse.isValid;

    } catch (error: any) {
      console.error('❌ Verification failed:', error);
      return false;
    }
  }

  /**
   * Check if user has sufficient balance for payment
   * Note: With x402, balance is checked at payment time via user's wallet
   */
  async canAffordPayment(amountCRO: number): Promise<boolean> {
    try {
      const signerAddress = await this.signer.getAddress();
      const balance = await this.provider.getBalance(signerAddress);
      const required = ethers.parseEther(amountCRO.toString());
      
      return balance >= required;
    } catch (error) {
      console.error('❌ Failed to check balance:', error);
      return false;
    }
  }

  /**
   * Get current signer balance
   */
  async getSignerBalance(): Promise<string> {
    try {
      const signerAddress = await this.signer.getAddress();
      const balance = await this.provider.getBalance(signerAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return '0';
    }
  }
}