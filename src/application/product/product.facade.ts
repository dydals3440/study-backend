import { Injectable } from '@nestjs/common';
import { ProductService } from '../../domain/product/product.service';
import { ProductInfo } from './product.info';

@Injectable()
export class ProductFacade {
  constructor(private readonly productService: ProductService) {}

  async getProduct(id: number): Promise<ProductInfo> {
    const product = await this.productService.findById(id);
    return ProductInfo.from(product);
  }
}
