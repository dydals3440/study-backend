import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';
import { ProductErrorCode } from './product-error-code';
import { Product } from './product.model';
import { ProductRepository } from './product.repository';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async findById(id: number, tx?: Prisma.TransactionClient): Promise<Product> {
    const product = await this.productRepository.findById(id, tx);
    if (!product) {
      throw new CoreException(ErrorType.NOT_FOUND, ProductErrorCode.NOT_FOUND, {
        id,
      });
    }
    return product;
  }
}
