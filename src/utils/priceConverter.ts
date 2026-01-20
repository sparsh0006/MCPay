import { ethers } from 'ethers';

export const toWei = (amount: string | number, decimals: number = 18): string => {
  return ethers.parseUnits(amount.toString(), decimals).toString();
};

export const fromWei = (amount: string | bigint, decimals: number = 18): string => {
  return ethers.formatUnits(amount, decimals);
};

export const calculateSlippage = (amount: bigint, slippagePercent: number): bigint => {
  const basisPoints = BigInt(Math.floor(slippagePercent * 100));
  return amount - (amount * basisPoints) / BigInt(10000);
};

export const estimateUSDValue = (amountCRO: string, croPrice: number): string => {
  const val = parseFloat(amountCRO) * croPrice;
  return val.toFixed(2);
};