import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { OrderFacade } from '../../../application/order/order.facade';
import { ApiResponse } from '../api-response';
import { ApiSuccessResponse } from '../api-success-response.decorator';
import { OrderV1ApiSpec } from './order-v1.api-spec';
import { CreateOrderRequest, OrderResponse } from './order-v1.dto';

@ApiTags('Order V1 API')
@Controller({ path: 'orders', version: '1' })
export class OrderV1Controller implements OrderV1ApiSpec {
  constructor(private readonly orderFacade: OrderFacade) {}

  @Post()
  @ApiOperation({
    summary: '주문 생성',
    description: '회원이 상품을 주문합니다.',
  })
  @ApiSuccessResponse(OrderResponse)
  async createOrder(
    @Body() request: CreateOrderRequest,
  ): Promise<ApiResponse<OrderResponse>> {
    const info = await this.orderFacade.createOrder(request.toCommand());
    return ApiResponse.success(OrderResponse.from(info));
  }

  @Get(':orderId')
  @ApiOperation({
    summary: '주문 단건 조회',
    description: '주문 ID로 주문 정보를 조회합니다.',
  })
  @ApiParam({ name: 'orderId', type: 'integer', description: '주문 ID' })
  @ApiSuccessResponse(OrderResponse)
  async getOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<ApiResponse<OrderResponse>> {
    const info = await this.orderFacade.getOrder(orderId);
    return ApiResponse.success(OrderResponse.from(info));
  }
}
