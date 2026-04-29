import { ApiResponse } from '../api-response';
import { AddCartItemRequest, CartItemResponse } from './cart-v1.dto';

export interface CartV1ApiSpec {
  addItem(request: AddCartItemRequest): Promise<ApiResponse<CartItemResponse>>;

  getCart(customerId: number): Promise<ApiResponse<CartItemResponse[]>>;

  clear(customerId: number): Promise<ApiResponse<null>>;
}
