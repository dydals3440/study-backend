import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ProductFacade } from '../../../application/product/product.facade';
import { ApiResponse } from '../api-response';
import { ApiSuccessResponse } from '../api-success-response.decorator';
import { ProductV1ApiSpec } from './product-v1.api-spec';
import { ProductResponse } from './product-v1.dto';

@ApiTags('Product V1 API')
@Controller({ path: 'products', version: '1' })
export class ProductV1Controller implements ProductV1ApiSpec {
  constructor(private readonly productFacade: ProductFacade) {}

  @Get(':id')
  @ApiOperation({
    summary: '상품 단건 조회',
    description: '상품 ID로 상품 정보를 조회합니다.',
  })
  @ApiParam({ name: 'id', type: 'integer', description: '상품 ID' })
  @ApiSuccessResponse(ProductResponse)
  async getProduct(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<ProductResponse>> {
    const info = await this.productFacade.getProduct(id);
    return ApiResponse.success(ProductResponse.from(info));
  }
}
