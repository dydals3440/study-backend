import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  product as ProductRow,
} from '../../generated/prisma/client';
import { ProductErrorCode } from '../../domain/product/product-error-code';
import { Product } from '../../domain/product/product.model';
import { ProductRepository } from '../../domain/product/product.repository';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';

@Injectable()
export class ProductRepositoryImpl extends ProductRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(
    id: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Product | null> {
    const row = await tx.product.findUnique({ where: { id } });
    return row ? ProductRepositoryImpl.toModel(row) : null;
  }

  async findByIdForUpdate(
    id: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Product | null> {
    const rows = await tx.$queryRaw<ProductRow[]>`
      SELECT * FROM product WHERE id = ${id} FOR UPDATE
    `;
    const [row] = rows;
    return row ? ProductRepositoryImpl.toModel(row) : null;
  }

  async save(
    product: Product,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Product> {
    if (product.id === 0) {
      const created = await tx.product.create({
        data: {
          productname: product.name,
          price: product.price,
          qty: product.stock,
        },
      });
      return ProductRepositoryImpl.toModel(created);
    }
    const updated = await tx.product.update({
      where: { id: product.id },
      data: {
        productname: product.name,
        price: product.price,
        qty: product.stock,
      },
    });
    return ProductRepositoryImpl.toModel(updated);
  }

  private static toModel(row: ProductRow): Product {
    if (row.productname === null || row.price === null || row.qty === null) {
      throw new CoreException(
        ErrorType.INTERNAL,
        ProductErrorCode.CORRUPTED_ROW,
        { id: row.id },
      );
    }
    return Product.restore({
      id: row.id,
      name: row.productname,
      price: row.price,
      stock: row.qty,
    });
  }
}
