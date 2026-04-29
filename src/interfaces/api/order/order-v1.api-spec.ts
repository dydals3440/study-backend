import { ApiResponse } from '../api-response';
import { CreateOrderRequest, OrderResponse } from './order-v1.dto';

export interface OrderV1ApiSpec {
  createOrder(request: CreateOrderRequest): Promise<ApiResponse<OrderResponse>>;

  getOrder(orderId: number): Promise<ApiResponse<OrderResponse>>;
}
