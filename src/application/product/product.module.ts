import { Module } from '@nestjs/common';
import { ProductRepository } from '../../domain/product/product.repository';
import { ProductService } from '../../domain/product/product.service';
import { ProductRepositoryImpl } from '../../infrastructure/product/product.repository.impl';
import { ProductV1Controller } from '../../interfaces/api/product/product-v1.controller';
import { ProductFacade } from './product.facade';

@Module({
  controllers: [ProductV1Controller],
  providers: [
    ProductFacade,
    ProductService,
    {
      provide: ProductRepository,
      useClass: ProductRepositoryImpl,
    },
  ],
  exports: [ProductRepository],
})
export class ProductModule {}
