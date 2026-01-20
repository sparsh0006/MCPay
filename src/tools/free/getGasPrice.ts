import { CronosService } from '../../services/CronosService.js';

export async function getGasPrice() {
  const service = new CronosService();
  return await service.getGasPrice();
}