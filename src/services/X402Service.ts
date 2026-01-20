import { Facilitator, CronosNetwork, Contract } from '@crypto.com/facilitator-client';
import { ethers } from 'ethers';
import { getProvider } from '../config/blockchain.js';

interface X402PaymentResult {
  success: boolean;
  txHash?: string;
  amount: string;
  timestamp: number;
  verified: boolean;
  settled: boolean;
  error?: string;
  rawSettleResponse?: any;
}

export class X402Service {
  private facilitator: Facilitator;
  private network: CronosNetwork;
  private provider: ethers.Provider;
  private privateKey: string;

  // Use Contract enum from SDK
  private readonly USDCE_CONTRACT: Contract;
  private readonly USDCE_DECIMALS = 6;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network === 'mainnet' 
      ? CronosNetwork.CronosMainnet 
      : CronosNetwork.CronosTestnet;
    
    // Select correct USDCe contract based on network
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

    console.error('✅ x402 Facilitator initialized');
    console.error(`   Network: ${network}`);
    console.error(`   Payment Token: USDCe at ${this.USDCE_CONTRACT}`);
  }

  private getSigner(): ethers.Wallet {
    if (!this.privateKey) throw new Error('Private Key missing in .env');
    return new ethers.Wallet(this.privateKey, this.provider);
  }

  /**
   * Execute Payment via x402
   * Price is in CRO but payment is in USDCe (1:1 conversion for demo)
   */
  async executePayment(
    recipientAddress: string,
    amountCRO: number,
    description: string,
    toolId: string
  ): Promise<X402PaymentResult> {
    try {
      console.error(`\n${'='.repeat(70)}`);
      console.error(`🚀 [x402 PAYMENT] Starting payment for tool: ${toolId}`);
      console.error(`${'='.repeat(70)}`);
      
      const signer = this.getSigner();
      const walletAddress = await signer.getAddress();
      
      // Convert CRO price to USDCe amount (1:1 for demo)
      const usdceAmount = Math.floor(amountCRO * 1000000); // 6 decimals
      const paymentAmountWei = usdceAmount.toString();

      console.error(`\n📊 PAYMENT DETAILS:`);
      console.error(`   From Wallet:  ${walletAddress}`);
      console.error(`   To Recipient: ${recipientAddress}`);
      console.error(`   Tool Price:   ${amountCRO} CRO (display price)`);
      console.error(`   Actual Cost:  ${ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS)} USDCe`);
      console.error(`   Description:  ${description}`);
      console.error(`   Asset:        ${this.USDCE_CONTRACT}`);
      
      // Check USDCe balance BEFORE payment
      const usdceContract = new ethers.Contract(
        this.USDCE_CONTRACT,
        ['function balanceOf(address) view returns (uint256)'],
        signer
      );
      
      if (typeof usdceContract.balanceOf !== 'function') {
        throw new Error('usdceContract.balanceOf is undefined');
      }
      const balanceBefore = await usdceContract.balanceOf(walletAddress);
      const balanceBeforeFormatted = ethers.formatUnits(balanceBefore, this.USDCE_DECIMALS);
      
      console.error(`\n💰 BALANCE CHECK (BEFORE):`);
      console.error(`   USDCe Balance: ${balanceBeforeFormatted} USDCe`);
      console.error(`   Required:      ${ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS)} USDCe`);
      
      if (balanceBefore < BigInt(paymentAmountWei)) {
        throw new Error(
          `Insufficient USDCe. Have: ${balanceBeforeFormatted} USDCe, Need: ${ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS)} USDCe`
        );
      }

      console.error(`   ✅ Sufficient balance available`);

      // STEP 1: Generate Payment Header
      console.error(`\n🔐 STEP 1: Generating EIP-3009 payment header...`);
      const validBefore = Math.floor(Date.now() / 1000) + 3600;
      
      const header = await this.facilitator.generatePaymentHeader({
        to: recipientAddress,
        value: paymentAmountWei,
        signer: signer as any,
        validBefore: validBefore,
        asset: this.USDCE_CONTRACT, // FIXED: Added asset parameter
      });

      console.error(`   ✅ Header generated (${header.length} chars)`);

      // STEP 2: Generate Requirements
      console.error(`\n📝 STEP 2: Generating payment requirements...`);
      const requirements = this.facilitator.generatePaymentRequirements({
        payTo: recipientAddress,
        description: `${description} (${toolId})`,
        maxAmountRequired: paymentAmountWei,
        asset: this.USDCE_CONTRACT, // FIXED: Added asset parameter
      });

      console.error(`   ✅ Requirements generated:`);
      console.error(`   ${JSON.stringify(requirements, null, 6)}`);

      // STEP 3: Build Verify Request
      console.error(`\n🔨 STEP 3: Building verification request...`);
      const body = this.facilitator.buildVerifyRequest(header, requirements);
      console.error(`   ✅ Request body built`);

      // STEP 4: Verify Payment
      console.error(`\n🔍 STEP 4: Verifying payment with Facilitator...`);
      const verify = await this.facilitator.verifyPayment(body);
      
      console.error(`   📋 Verification Response:`);
      console.error(`   ${JSON.stringify(verify, null, 6)}`);
      
      if (!verify.isValid) {
        console.error(`\n   ❌ VERIFICATION FAILED`);
        console.error(`   Reason: ${verify.invalidReason || 'Unknown'}`);
        throw new Error(`Verification failed: ${verify.invalidReason || 'Unknown reason'}`);
      }

      console.error(`   ✅ Payment verified successfully!`);

      // STEP 5: Settle Payment On-Chain
      console.error(`\n⚡️ STEP 5: Settling payment on-chain via Facilitator...`);
      console.error(`   Please wait for blockchain confirmation...`);
      
      const settle = await this.facilitator.settlePayment(body);
      
      console.error(`\n   📋 Settlement Response:`);
      console.error(`   ${JSON.stringify(settle, null, 6)}`);
      
      // FIXED: Access txHash correctly from X402SettleResponse
      const txHash = settle.txHash;
      
      if (txHash) {
        console.error(`\n   🎉 PAYMENT SETTLED ON-CHAIN!`);
        console.error(`   🔗 Transaction Hash: ${txHash}`);
        console.error(`   📍 From: ${settle.from || 'N/A'}`);
        console.error(`   📍 To: ${settle.to || 'N/A'}`);
        console.error(`   💰 Value: ${settle.value || 'N/A'}`);
        console.error(`   🔢 Block: ${settle.blockNumber || 'pending'}`);
        console.error(`   🌐 Network: ${settle.network}`);
        console.error(`   🔍 Explorer: https://explorer.cronos.org/testnet/tx/${txHash}`);
        
        // Check balance AFTER payment
        const balanceAfter = await usdceContract.balanceOf(walletAddress);
        const balanceAfterFormatted = ethers.formatUnits(balanceAfter, this.USDCE_DECIMALS);
        const spent = ethers.formatUnits(balanceBefore - balanceAfter, this.USDCE_DECIMALS);
        
        console.error(`\n💰 BALANCE CHECK (AFTER):`);
        console.error(`   Before:  ${balanceBeforeFormatted} USDCe`);
        console.error(`   After:   ${balanceAfterFormatted} USDCe`);
        console.error(`   Spent:   ${spent} USDCe`);
        
        console.error(`\n${'='.repeat(70)}`);
        console.error(`✅ PAYMENT COMPLETED SUCCESSFULLY`);
        console.error(`${'='.repeat(70)}\n`);
        
        return {
          success: true,
          txHash: txHash,
          amount: ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS),
          timestamp: Math.floor(Date.now() / 1000),
          verified: true,
          settled: true,
          rawSettleResponse: settle
        };
      } else {
        console.error(`\n   ⚠️  Settlement response received but no transaction hash`);
        console.error(`   Event: ${settle.event}`);
        console.error(`   Error: ${settle.error || 'None'}`);
        
        // Check if balance was deducted anyway
        const balanceAfter = await usdceContract.balanceOf(walletAddress);
        const balanceAfterFormatted = ethers.formatUnits(balanceAfter, this.USDCE_DECIMALS);
        
        if (balanceAfter < balanceBefore) {
          const spent = ethers.formatUnits(balanceBefore - balanceAfter, this.USDCE_DECIMALS);
          console.error(`\n   💰 USDCe WAS DEDUCTED: ${spent} USDCe`);
          console.error(`   Balance Before: ${balanceBeforeFormatted} USDCe`);
          console.error(`   Balance After:  ${balanceAfterFormatted} USDCe`);
          console.error(`   ✅ Payment processed but txHash not in response`);
          
          return {
            success: true,
            txHash: 'Payment completed - check wallet history',
            amount: ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS),
            timestamp: Math.floor(Date.now() / 1000),
            verified: true,
            settled: true,
            rawSettleResponse: settle
          };
        }
        
        throw new Error(settle.error || 'Settlement failed - no txHash and balance unchanged');
      }

    } catch (error: any) {
      console.error(`\n${'='.repeat(70)}`);
      console.error(`❌ PAYMENT ERROR`);
      console.error(`${'='.repeat(70)}`);
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
      console.error(`${'='.repeat(70)}\n`);
      
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
      console.error('❌ Failed to get supported:', error);
      return { kinds: [] };
    }
  }

  async executeToolPayment(recipient: string, toolId: string, price: number) {
    return this.executePayment(recipient, price, `MCP Tool Payment: ${toolId}`, toolId);
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
      console.error('❌ Verify payment only failed:', e);
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
        throw new Error('usdceContract.balanceOf is undefined');
      }
      const balance = await usdceContract.balanceOf(await signer.getAddress());
      return ethers.formatUnits(balance, this.USDCE_DECIMALS);
    } catch (e) {
      console.error('❌ Failed to get USDCe balance:', e);
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
        throw new Error('usdceContract.balanceOf is undefined');
      }
      const balance = await usdceContract.balanceOf(await signer.getAddress());
      const required = BigInt(Math.floor(amountCRO * 1000000));
      
      return balance >= required;
    } catch (e) {
      console.error('❌ Failed to check affordability:', e);
      return false;
    }
  }
}