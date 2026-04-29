import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { AddCartItemCommand } from './cart.command';
import { Cart } from './cart.model';
import { CartRepository } from './cart.repository';

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}

  findByCustomerId(
    customerId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Cart[]> {
    return this.cartRepository.findByCustomerId(customerId, tx);
  }

  async addItem(
    command: AddCartItemCommand,
    tx?: Prisma.TransactionClient,
  ): Promise<Cart> {
    const cart = Cart.create({
      customerId: command.customerId,
      productId: command.productId,
      unitPrice: command.unitPrice,
      quantity: command.quantity,
    });
    return this.cartRepository.save(cart, tx);
  }

  async deleteByCustomerId(
    customerId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.cartRepository.deleteByCustomerId(customerId, tx);
  }
}
