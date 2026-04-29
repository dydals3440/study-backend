import { ApiResponse } from '../api-response';
import { ProductResponse } from './product-v1.dto';

export interface ProductV1ApiSpec {
  getProduct(id: number): Promise<ApiResponse<ProductResponse>>;
}
