import { CronosService } from '../../services/CronosService.js';

export async function getBalance(address: string, tokenAddress?: string) {
  const service = new CronosService();
  const balance = await service.getBalance(address, tokenAddress);
  return {
    address,
    token: tokenAddress || 'CRO',
    balance
  };
}