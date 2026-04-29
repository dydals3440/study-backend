import { Injectable } from '@nestjs/common';
import type { Prisma, cart as CartRow } from '../../generated/prisma/client';
import { CartErrorCode } from '../../domain/cart/cart-error-code';
import { Cart } from '../../domain/cart/cart.model';
import { CartRepository } from '../../domain/cart/cart.repository';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';

@Injectable()
export class CartRepositoryImpl extends CartRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByCustomerId(
    customerId: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Cart[]> {
    const rows = await tx.cart.findMany({
      where: { customer_id: customerId },
    });
    return rows.map((row) => CartRepositoryImpl.toModel(row));
  }

  async save(
    cart: Cart,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Cart> {
    const now = new Date();
    if (cart.id === 0) {
      const created = await tx.cart.create({
        data: {
          customer_id: cart.customerId,
          product_id: cart.productId,
          unit_price: cart.unitPrice,
          qty: cart.quantity,
          created_at: now,
          updated_at: now,
        },
      });
      return CartRepositoryImpl.toModel(created);
    }
    const updated = await tx.cart.update({
      where: { id: cart.id },
      data: {
        customer_id: cart.customerId,
        product_id: cart.productId,
        unit_price: cart.unitPrice,
        qty: cart.quantity,
        updated_at: now,
      },
    });
    return CartRepositoryImpl.toModel(updated);
  }

  async deleteByCustomerId(
    customerId: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.cart.deleteMany({ where: { customer_id: customerId } });
  }

  private static toModel(row: CartRow): Cart {
    if (
      row.customer_id === null ||
      row.product_id === null ||
      row.unit_price === null ||
      row.qty === null
    ) {
      throw new CoreException(ErrorType.INTERNAL, CartErrorCode.CORRUPTED_ROW, {
        id: row.id,
      });
    }
    return Cart.restore({
      id: row.id,
      customerId: row.customer_id,
      productId: row.product_id,
      unitPrice: row.unit_price,
      quantity: row.qty,
    });
  }
}
