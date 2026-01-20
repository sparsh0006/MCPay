import { CronosService } from '../../services/CronosService.js';

export async function getTokenPrice(symbol: string) {
  const service = new CronosService();
  return await service.getTokenPrice(symbol);
}