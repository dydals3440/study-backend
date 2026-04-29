import type { Prisma } from '../../generated/prisma/client';
import { Cart } from './cart.model';

export abstract class CartRepository {
  abstract findByCustomerId(
    customerId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Cart[]>;

  abstract save(cart: Cart, tx?: Prisma.TransactionClient): Promise<Cart>;

  abstract deleteByCustomerId(
    customerId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
}
