import { CronosService } from '../../services/CronosService.js';

export async function checkTransaction(txHash: string) {
  const service = new CronosService();
  return await service.getTransaction(txHash);
}