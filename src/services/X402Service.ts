import { Facilitator, CronosNetwork, Contract } from '@crypto.com/facilitator-client';
import { ethers } from 'ethers';
import { getProvider } from '../config/blockchain.js';
import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

interface X402PaymentResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  amount: string;
  timestamp: number;
  verified: boolean;
  settled: boolean;
  error?: string;
  balanceBefore?: string;
  balanceAfter?: string;
  amountSpent?: string;
}

export class X402Service {
  private facilitator: Facilitator;
  private network: CronosNetwork;
  private provider: ethers.Provider;
  private privateKey: string;
  private logFile: string;

  private readonly USDCE_CONTRACT: Contract;
  private readonly USDCE_DECIMALS = 6;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network === 'mainnet' 
      ? CronosNetwork.CronosMainnet 
      : CronosNetwork.CronosTestnet;
    
    this.USDCE_CONTRACT = network === 'mainnet' 
      ? Contract.USDCe 
      : Contract.DevUSDCe;
    
    this.facilitator = new Facilitator({
      network: this.network,
    });

    this.provider = getProvider(network);
    
    this.privateKey = process.env.PRIVATE_KEY || '';
    if (!this.privateKey) {
       console.error('❌ PRIVATE_KEY not found in .env file');
    }

    // Setup file logging
    this.logFile = join(process.cwd(), 'x402-payments.log');
    this.log(`\n${'='.repeat(80)}\nX402 Service Initialized - ${new Date().toISOString()}\n${'='.repeat(80)}`);

    console.error('✅ x402 Facilitator initialized');
    console.error(`   Network: ${network}`);
    console.error(`   Payment Token: USDCe at ${this.USDCE_CONTRACT}`);
    console.error(`   Log file: ${this.logFile}`);
  }

  private log(message: string) {
    try {
      appendFileSync(this.logFile, `${message}\n`);
      console.error(message); // Also log to console
    } catch (e) {
      console.error('Failed to write to log file:', e);
    }
  }

  private getSigner(): ethers.Wallet {
    if (!this.privateKey) throw new Error('Private Key missing in .env');
    return new ethers.Wallet(this.privateKey, this.provider);
  }

  async executePayment(
    recipientAddress: string,
    amountCRO: number,
    description: string,
    toolId: string
  ): Promise<X402PaymentResult> {
    const paymentId = `${toolId}-${Date.now()}`;
    
    try {
      this.log(`\n${'='.repeat(70)}`);
      this.log(`🚀 [PAYMENT ${paymentId}] Starting payment`);
      this.log(`${'='.repeat(70)}`);
      
      const signer = this.getSigner();
      const walletAddress = await signer.getAddress();
      
      const usdceAmount = Math.floor(amountCRO * 1000000);
      const paymentAmountWei = usdceAmount.toString();

      this.log(`📊 PAYMENT DETAILS:`);
      this.log(`   Payment ID:   ${paymentId}`);
      this.log(`   From:         ${walletAddress}`);
      this.log(`   To:           ${recipientAddress}`);
      this.log(`   Tool:         ${toolId}`);
      this.log(`   Amount:       ${ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS)} USDCe`);
      this.log(`   Asset:        ${this.USDCE_CONTRACT}`);
      
      // Check balance BEFORE
      const usdceContract = new ethers.Contract(
        this.USDCE_CONTRACT,
        ['function balanceOf(address) view returns (uint256)'],
        signer
      );
      
      if (typeof usdceContract.balanceOf !== 'function') {
        throw new Error('usdceContract.balanceOf is not a function');
      }
      const balanceBefore = await usdceContract.balanceOf(walletAddress);
      const balanceBeforeFormatted = ethers.formatUnits(balanceBefore, this.USDCE_DECIMALS);
      
      this.log(`\n💰 BALANCE BEFORE: ${balanceBeforeFormatted} USDCe`);
      
      if (balanceBefore < BigInt(paymentAmountWei)) {
        throw new Error(`Insufficient USDCe. Have: ${balanceBeforeFormatted}, Need: ${ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS)}`);
      }

      // Generate header
      this.log(`\n🔐 Generating payment header...`);
      const validBefore = Math.floor(Date.now() / 1000) + 3600;
      
      const header = await this.facilitator.generatePaymentHeader({
        to: recipientAddress,
        value: paymentAmountWei,
        signer: signer as any,
        validBefore: validBefore,
        asset: this.USDCE_CONTRACT,
      });

      this.log(`✅ Header generated (${header.length} chars)`);

      // Generate requirements
      this.log(`\n📝 Generating requirements...`);
      const requirements = this.facilitator.generatePaymentRequirements({
        payTo: recipientAddress,
        description: `${description} (${toolId})`,
        maxAmountRequired: paymentAmountWei,
        asset: this.USDCE_CONTRACT,
      });

      this.log(`✅ Requirements: ${JSON.stringify(requirements, null, 2)}`);

      // Build request
      this.log(`\n🔨 Building verify request...`);
      const body = this.facilitator.buildVerifyRequest(header, requirements);

      // Verify
      this.log(`\n🔍 Verifying payment...`);
      const verify = await this.facilitator.verifyPayment(body);
      
      this.log(`📋 Verify Response: ${JSON.stringify(verify, null, 2)}`);
      
      if (!verify.isValid) {
        this.log(`❌ VERIFICATION FAILED: ${verify.invalidReason}`);
        throw new Error(`Verification failed: ${verify.invalidReason || 'Unknown'}`);
      }

      this.log(`✅ Payment verified!`);

      // Settle
      this.log(`\n⚡️ Settling payment on-chain...`);
      const settle = await this.facilitator.settlePayment(body);
      
      this.log(`\n📋 SETTLE RESPONSE:`);
      this.log(JSON.stringify(settle, null, 2));
      
      const txHash = settle.txHash;
      
      if (txHash) {
        const explorerUrl = `https://explorer.cronos.org/testnet/tx/${txHash}`;
        
        this.log(`\n🎉 PAYMENT SETTLED!`);
        this.log(`   Transaction: ${txHash}`);
        this.log(`   Explorer: ${explorerUrl}`);
        this.log(`   From: ${settle.from}`);
        this.log(`   To: ${settle.to}`);
        this.log(`   Value: ${settle.value}`);
        this.log(`   Block: ${settle.blockNumber}`);
        this.log(`   Network: ${settle.network}`);
        this.log(`   Timestamp: ${settle.timestamp}`);
        
        // Check balance AFTER
        const balanceAfter = await usdceContract.balanceOf(walletAddress);
        const balanceAfterFormatted = ethers.formatUnits(balanceAfter, this.USDCE_DECIMALS);
        const spent = ethers.formatUnits(balanceBefore - balanceAfter, this.USDCE_DECIMALS);
        
        this.log(`\n💰 BALANCE AFTER: ${balanceAfterFormatted} USDCe`);
        this.log(`💸 AMOUNT SPENT: ${spent} USDCe`);
        
        this.log(`\n${'='.repeat(70)}`);
        this.log(`✅ PAYMENT ${paymentId} COMPLETED`);
        this.log(`${'='.repeat(70)}\n`);
        
        return {
          success: true,
          txHash: txHash,
          explorerUrl: explorerUrl,
          amount: ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS),
          timestamp: Math.floor(Date.now() / 1000),
          verified: true,
          settled: true,
          balanceBefore: balanceBeforeFormatted,
          balanceAfter: balanceAfterFormatted,
          amountSpent: spent,
        };
      } else {
        this.log(`⚠️  No txHash in settle response`);
        this.log(`Event: ${settle.event}`);
        this.log(`Error: ${settle.error || 'None'}`);
        
        // Check if balance changed
        const balanceAfter = await usdceContract.balanceOf(walletAddress);
        const balanceAfterFormatted = ethers.formatUnits(balanceAfter, this.USDCE_DECIMALS);
        
        if (balanceAfter < balanceBefore) {
          const spent = ethers.formatUnits(balanceBefore - balanceAfter, this.USDCE_DECIMALS);
          this.log(`💰 USDCe WAS DEDUCTED: ${spent} USDCe`);
          this.log(`✅ Payment processed (check wallet history)`);
          
          return {
            success: true,
            txHash: 'Check wallet history - payment completed',
            amount: ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS),
            timestamp: Math.floor(Date.now() / 1000),
            verified: true,
            settled: true,
            balanceBefore: balanceBeforeFormatted,
            balanceAfter: balanceAfterFormatted,
            amountSpent: spent,
          };
        }
        
        throw new Error(settle.error || 'Settlement failed');
      }

    } catch (error: any) {
      this.log(`\n❌ PAYMENT ${paymentId} FAILED`);
      this.log(`Error: ${error.message}`);
      if (error.stack) {
        this.log(`Stack: ${error.stack}`);
      }
      
      return {
        success: false,
        amount: amountCRO.toString(),
        timestamp: Math.floor(Date.now() / 1000),
        verified: false,
        settled: false,
        error: error.message
      };
    }
  }

  async getSupported() {
    try {
      return await this.facilitator.getSupported();
    } catch (error: any) {
      this.log('❌ Failed to get supported: ' + error.message);
      return { kinds: [] };
    }
  }

  async executeToolPayment(recipient: string, toolId: string, price: number) {
    return this.executePayment(recipient, price, `MCP Tool: ${toolId}`, toolId);
  }

  async verifyPaymentOnly(recipient: string, amountCRO: number, desc: string): Promise<boolean> {
    try {
      const signer = this.getSigner();
      const usdceAmount = Math.floor(amountCRO * 1000000).toString();
      
      const header = await this.facilitator.generatePaymentHeader({
        to: recipient,
        value: usdceAmount,
        signer: signer as any,
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        asset: this.USDCE_CONTRACT,
      });
      
      const req = this.facilitator.generatePaymentRequirements({
        payTo: recipient,
        description: desc,
        maxAmountRequired: usdceAmount,
        asset: this.USDCE_CONTRACT,
      });
      
      const body = this.facilitator.buildVerifyRequest(header, req);
      const res = await this.facilitator.verifyPayment(body);
      
      return res.isValid;
    } catch (e) {
      return false;
    }
  }

  async getSignerBalance(): Promise<string> {
    try {
      const signer = this.getSigner();
      const balance = await this.provider.getBalance(await signer.getAddress());
      return ethers.formatEther(balance);
    } catch (e) {
      return '0';
    }
  }

  async getUSDCeBalance(): Promise<string> {
    try {
      const signer = this.getSigner();
      const usdceContract = new ethers.Contract(
        this.USDCE_CONTRACT,
        ['function balanceOf(address) view returns (uint256)'],
        signer
      );
      
      if (typeof usdceContract.balanceOf !== 'function') {
        throw new Error('usdceContract.balanceOf is not a function');
      }
      if (typeof usdceContract.balanceOf !== 'function') {
        throw new Error('usdceContract.balanceOf is not a function');
      }
      // Type assertion to ensure balanceOf exists
      if (typeof usdceContract.balanceOf !== 'function') {
        throw new Error('usdceContract.balanceOf is not a function');
      }
      const balance = await (usdceContract.balanceOf as (address: string) => Promise<bigint>)(await signer.getAddress());
      return ethers.formatUnits(balance, this.USDCE_DECIMALS);
    } catch (e) {
      return '0';
    }
  }

  async canAffordPayment(amountCRO: number): Promise<boolean> {
    try {
      const signer = this.getSigner();
      const usdceContract = new ethers.Contract(
        this.USDCE_CONTRACT,
        ['function balanceOf(address) view returns (uint256)'],
        signer
      );
      
      if (typeof usdceContract.balanceOf !== 'function') {
        throw new Error('usdceContract.balanceOf is not a function');
      }
      const balance = await (usdceContract.balanceOf as (address: string) => Promise<bigint>)(await signer.getAddress());
      const required = BigInt(Math.floor(amountCRO * 1000000));
      
      return balance >= required;
    } catch (e) {
      return false;
    }
  }
}