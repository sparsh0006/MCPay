import { ethers } from 'ethers';
import { getSigner, CONTRACT_ADDRESSES } from '../../config/blockchain.js';
import { calculateSlippage } from '../../utils/priceConverter.js';

const ROUTER_ABI = [
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)'
];

export async function executeSwap(
  tokenIn: string, 
  tokenOut: string, 
  amountIn: string, 
  slippagePercent: number = 0.5
) {
  const signer = getSigner();
  const router = new ethers.Contract(CONTRACT_ADDRESSES.VVS_ROUTER, ROUTER_ABI, signer);

  try {
    const amountInWei = ethers.parseEther(amountIn);
    const path = [tokenIn, tokenOut];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins

    // 1. Get Expected Output
    // Cast to any to access dynamic ABI methods
    const amounts = await (router as any).getAmountsOut(amountInWei, path);
    const expectedOut = amounts[amounts.length - 1];

    // 2. Calculate Min Output with Slippage
    const amountOutMin = calculateSlippage(expectedOut, slippagePercent);

    // 3. Approve Token (if not CRO)
    if (tokenIn.toLowerCase() !== ethers.ZeroAddress && !tokenIn.toLowerCase().includes('cro')) {
      const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, signer);
      console.log('Approving token...');
      const approveTx = await (tokenContract as any).approve(CONTRACT_ADDRESSES.VVS_ROUTER, amountInWei);
      await approveTx.wait();
    }

    // 4. Execute Swap
    console.log('Executing swap...');
    const tx = await (router as any).swapExactTokensForTokens(
      amountInWei,
      amountOutMin,
      path,
      await signer.getAddress(),
      deadline
    );

    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      swappedAmount: amountIn,
      receivedMin: ethers.formatEther(amountOutMin)
    };

  } catch (error: any) {
    throw new Error(`Swap execution failed: ${error.message}`);
  }
}