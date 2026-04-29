import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';
import { ProductRepository } from '../product/product.repository';
import { CreateOrderItemCommand } from './order.command';
import { OrderErrorCode } from './order-error-code';
import { OrderItem } from './order-item.model';
import { Order } from './order.model';
import { OrderRepository } from './order.repository';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async createOrder(
    customerId: number,
    items: readonly CreateOrderItemCommand[],
    tx?: Prisma.TransactionClient,
  ): Promise<Order> {
    if (items.length === 0) {
      throw new CoreException(
        ErrorType.BAD_REQUEST,
        OrderErrorCode.ITEMS_EMPTY,
      );
    }

    const orderItems: OrderItem[] = [];
    for (const item of items) {
      const product = await this.productRepository.findByIdForUpdate(
        item.productId,
        tx,
      );
      if (!product) {
        throw new CoreException(ErrorType.NOT_FOUND, OrderErrorCode.NOT_FOUND, {
          productId: item.productId,
        });
      }
      product.decreaseStock(item.quantity);
      await this.productRepository.save(product, tx);

      orderItems.push(
        OrderItem.create({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          price: product.price,
        }),
      );
    }

    const order = Order.create({
      customerId,
      orderNo: `ORD-${randomUUID()}`,
      items: orderItems,
    });
    return this.orderRepository.save(order, tx);
  }

  async getOrder(
    orderId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Order> {
    const order = await this.orderRepository.findById(orderId, tx);
    if (!order) {
      throw new CoreException(ErrorType.NOT_FOUND, OrderErrorCode.NOT_FOUND, {
        id: orderId,
      });
    }
    return order;
  }
}
