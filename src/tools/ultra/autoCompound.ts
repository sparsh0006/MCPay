import { ethers } from 'ethers';
import { getSigner } from '../../config/blockchain.js';

const MASTERCHEF_ABI = [
  'function deposit(uint256 _pid, uint256 _amount) public',
  'function pendingCronos(uint256 _pid, address _user) external view returns (uint256)'
];

export async function autoCompound(protocol: string, poolAddress: string) {
  const signer = getSigner();
  
  // Note: PID mapping would usually be in a config file. 
  // We assume PID 0 for this demo.
  const pid = 0; 
  
  const chef = new ethers.Contract(poolAddress, MASTERCHEF_ABI, signer);

  try {
    // Check pending rewards
    // Cast to any to bypass TS strict property check on ABI methods
    const pending = await (chef as any).pendingCronos(pid, await signer.getAddress());
    
    if (pending === BigInt(0)) {
      return {
        success: false,
        message: 'No rewards pending to compound'
      };
    }

    // Compound: Deposit 0 is the standard way to harvest in MasterChef contracts
    const tx = await (chef as any).deposit(pid, 0);
    const receipt = await tx.wait();

    return {
      success: true,
      protocol,
      action: 'Compound',
      harvestedAmount: ethers.formatEther(pending),
      txHash: receipt.hash
    };

  } catch (error: any) {
    throw new Error(`Auto-compound failed: ${error.message}`);
  }
}