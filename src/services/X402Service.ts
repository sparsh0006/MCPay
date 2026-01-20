import { Facilitator, CronosNetwork } from '@crypto.com/facilitator-client';
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
}

export class X402Service {
  private facilitator: Facilitator;
  private network: CronosNetwork;
  private provider: ethers.Provider;
  private privateKey: string;

  // CRITICAL: USDCe contract address on Cronos Testnet
  private readonly USDCE_ADDRESS = '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';
  private readonly USDCE_DECIMALS = 6;

  constructor(network: 'mainnet' | 'testnet' = 'testnet') {
    this.network = network === 'mainnet' 
      ? CronosNetwork.CronosMainnet 
      : CronosNetwork.CronosTestnet;
    
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
    console.error(`   USDCe Address: ${this.USDCE_ADDRESS}`);
  }

  private getSigner(): ethers.Wallet {
    if (!this.privateKey) throw new Error('Private Key missing in .env');
    return new ethers.Wallet(this.privateKey, this.provider);
  }

  /**
   * CRITICAL FIX: x402 works with USDCe, NOT native CRO
   * The SDK documentation shows payment in USDCe (base units)
   */
  async executePayment(
    recipientAddress: string,
    amountCRO: number,
    description: string,
    toolId: string
  ): Promise<X402PaymentResult> {
    try {
      console.error(`\n🚀 [x402] Starting Payment for tool: ${toolId}`);
      
      const signer = this.getSigner();
      const walletAddress = await signer.getAddress();
      
      // CRITICAL: Convert CRO price to USDCe amount
      // Assuming 1 CRO ≈ $0.02, so we need to convert
      // For demo purposes: 1 CRO tool price = 1 USDCe
      const usdceAmount = Math.floor(amountCRO * 1000000); // Convert to 6 decimals
      const paymentAmountWei = usdceAmount.toString();

      console.error(`   👤 From: ${walletAddress}`);
      console.error(`   📬 To:   ${recipientAddress}`);
      console.error(`   💰 Price: ${amountCRO} CRO`);
      console.error(`   💵 USDCe: ${ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS)} USDCe`);
      
      // Check USDCe balance
      const usdceContract = new ethers.Contract(
        this.USDCE_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        signer
      );
      
      if (typeof usdceContract.balanceOf !== 'function') {
        throw new Error('balanceOf function is not available on the USDCe contract');
      }
      const balance = await usdceContract.balanceOf(walletAddress);
      const balanceFormatted = ethers.formatUnits(balance, this.USDCE_DECIMALS);
      
      console.error(`   💳 USDCe Balance: ${balanceFormatted} USDCe`);
      
      if (balance < BigInt(paymentAmountWei)) {
        throw new Error(
          `Insufficient USDCe balance. Have: ${balanceFormatted} USDCe, Need: ${ethers.formatUnits(paymentAmountWei, this.USDCE_DECIMALS)} USDCe. ` +
          `Get testnet USDCe from: https://faucet.cronos.org`
        );
      }

      // 1. Generate Payment Header
      console.error('   🔐 Generating payment header...');
      const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      
      // FIX: Cast signer to 'any' to avoid type mismatch with Facilitator SDK
      const header = await this.facilitator.generatePaymentHeader({
        to: recipientAddress,
        value: paymentAmountWei,
        signer: signer as any, // TypeScript workaround for SDK compatibility
        validBefore: validBefore,
      });

      console.error('   ✅ Header generated');

      // 2. Generate Requirements
      console.error('   📝 Generating requirements...');
      const requirements = this.facilitator.generatePaymentRequirements({
        payTo: recipientAddress,
        description: `${description} (Tool: ${toolId})`,
        maxAmountRequired: paymentAmountWei,
      });

      console.error('   ✅ Requirements:', JSON.stringify(requirements, null, 2));

      // 3. Build Verify Request
      console.error('   🔨 Building verification request...');
      const body = this.facilitator.buildVerifyRequest(header, requirements);

      // 4. Verify Payment Off-Chain
      console.error('   🔍 Verifying payment...');
      const verify = await this.facilitator.verifyPayment(body);
      
      console.error('   📋 Verify Response:', JSON.stringify(verify, null, 2));
      
      if (!verify.isValid) {
        console.error('   ❌ Verification FAILED');
        throw new Error(`Payment verification failed: ${JSON.stringify(verify)}`);
      }

      console.error('   ✅ Payment verified!');

      // 5. Settle Payment On-Chain
      console.error('   ⚡️ Settling payment on-chain...');
      const settle = await this.facilitator.settlePayment(body);
      
      console.error('   📋 Settle Response:', JSON.stringify(settle, null, 2));
      
      if (settle.txHash) {
        console.error('\n   🎉 PAYMENT SUCCESS!');
        console.error(`   🔗 Hash: ${settle.txHash}`);
        console.error(`   🔍 Explorer: https://explorer.cronos.org/testnet/tx/${settle.txHash}`);
        
        return {
          success: true,
          txHash: settle.txHash,
          amount: amountCRO.toString(),
          timestamp: Math.floor(Date.now() / 1000),
          verified: true,
          settled: true,
        };
      } else {
        console.error('   ❌ Settlement returned no hash');
        throw new Error('Settlement completed but no transaction hash returned');
      }

    } catch (error: any) {
      console.error('\n   ❌ PAYMENT ERROR:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack);
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

  // --- Required Service Methods ---

  async getSupported() {
    try {
      return await this.facilitator.getSupported();
    } catch (error: any) {
      console.error('❌ Failed to get supported:', error);
      return { kinds: [] };
    }
  }

  async executeToolPayment(recipient: string, toolId: string, price: number) {
    return this.executePayment(recipient, price, `Payment for ${toolId}`, toolId);
  }

  async verifyPaymentOnly(recipient: string, amountCRO: number, desc: string): Promise<boolean> {
    try {
      const signer = this.getSigner();
      const usdceAmount = Math.floor(amountCRO * 1000000).toString();
      
      // FIX: Cast signer to 'any' to avoid type mismatch
      const header = await this.facilitator.generatePaymentHeader({
        to: recipient,
        value: usdceAmount,
        signer: signer as any, // TypeScript workaround
        validBefore: Math.floor(Date.now() / 1000) + 3600
      });
      
      const req = this.facilitator.generatePaymentRequirements({
        payTo: recipient,
        description: desc,
        maxAmountRequired: usdceAmount
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
        this.USDCE_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        signer
      ) as ethers.Contract & { balanceOf(address: string): Promise<bigint> };
      
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
        this.USDCE_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        signer
      );
      
      if (typeof usdceContract.balanceOf !== 'function') {
        throw new Error('balanceOf function is not available on the USDCe contract');
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