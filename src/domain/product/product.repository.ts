import type { Prisma } from '../../generated/prisma/client';
import { Product } from './product.model';

export abstract class ProductRepository {
  abstract findById(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Product | null>;

  abstract findByIdForUpdate(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Product | null>;

  abstract save(
    product: Product,
    tx?: Prisma.TransactionClient,
  ): Promise<Product>;
}
