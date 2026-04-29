import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CartFacade } from '../../../application/cart/cart.facade';
import { ApiResponse } from '../api-response';
import {
  ApiSuccessEmptyResponse,
  ApiSuccessResponse,
} from '../api-success-response.decorator';
import { CartV1ApiSpec } from './cart-v1.api-spec';
import { AddCartItemRequest, CartItemResponse } from './cart-v1.dto';

@ApiTags('Cart V1 API')
@Controller({ path: 'carts', version: '1' })
export class CartV1Controller implements CartV1ApiSpec {
  constructor(private readonly cartFacade: CartFacade) {}

  @Post()
  @ApiOperation({
    summary: '장바구니 항목 추가',
    description: '회원의 장바구니에 상품을 추가합니다.',
  })
  @ApiSuccessResponse(CartItemResponse)
  async addItem(
    @Body() request: AddCartItemRequest,
  ): Promise<ApiResponse<CartItemResponse>> {
    const info = await this.cartFacade.addItem(request.toCommand());
    return ApiResponse.success(CartItemResponse.from(info));
  }

  @Get(':customerId')
  @ApiOperation({
    summary: '장바구니 조회',
    description: '회원의 장바구니 항목 목록을 조회합니다.',
  })
  @ApiParam({ name: 'customerId', type: 'integer', description: '회원 ID' })
  @ApiSuccessResponse(CartItemResponse, { isArray: true })
  async getCart(
    @Param('customerId', ParseIntPipe) customerId: number,
  ): Promise<ApiResponse<CartItemResponse[]>> {
    const items = await this.cartFacade.getCart(customerId);
    return ApiResponse.success(
      items.map((info) => CartItemResponse.from(info)),
    );
  }

  @Delete(':customerId')
  @ApiOperation({
    summary: '장바구니 비우기',
    description: '회원의 모든 장바구니 항목을 삭제합니다.',
  })
  @ApiParam({ name: 'customerId', type: 'integer', description: '회원 ID' })
  @ApiSuccessEmptyResponse()
  async clear(
    @Param('customerId', ParseIntPipe) customerId: number,
  ): Promise<ApiResponse<null>> {
    await this.cartFacade.clear(customerId);
    return ApiResponse.empty();
  }
}
