import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

export const CRONOS_CONFIG = {
  MAINNET: {
    rpcUrl: 'https://evm.cronos.org',
    chainId: 25,
    name: 'Cronos Mainnet'
  },
  TESTNET: {
    rpcUrl: 'https://evm-t3.cronos.org',
    chainId: 338,
    name: 'Cronos Testnet'
  }
};

export const CONTRACT_ADDRESSES = {
  PAYMENT_GATEWAY: process.env.PAYMENT_GATEWAY_ADDRESS || '',
  USDC: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59', // Cronos USDC
  VVS_ROUTER: '0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae'
};

export const getProvider = (network: 'mainnet' | 'testnet' = 'testnet') => {
  const config = network === 'mainnet' ? CRONOS_CONFIG.MAINNET : CRONOS_CONFIG.TESTNET;
  return new ethers.JsonRpcProvider(config.rpcUrl);
};

export const getSigner = (network: 'mainnet' | 'testnet' = 'testnet') => {
  const provider = getProvider(network);
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment');
  }
  
  return new ethers.Wallet(privateKey, provider);
};