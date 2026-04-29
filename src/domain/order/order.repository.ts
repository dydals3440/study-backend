import type { Prisma } from '../../generated/prisma/client';
import { Order } from './order.model';

export abstract class OrderRepository {
  abstract findById(
    id: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Order | null>;

  abstract save(order: Order, tx?: Prisma.TransactionClient): Promise<Order>;
}
