import { Injectable } from '@nestjs/common';
import { CreateOrderCommand } from '../../domain/order/order.command';
import { OrderService } from '../../domain/order/order.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { OrderInfo } from './order.info';

@Injectable()
export class OrderFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {}

  async createOrder(command: CreateOrderCommand): Promise<OrderInfo> {
    const order = await this.prisma.$transaction(async (tx) => {
      return this.orderService.createOrder(
        command.customerId,
        command.items,
        tx,
      );
    });
    return OrderInfo.from(order);
  }

  async getOrder(orderId: number): Promise<OrderInfo> {
    const order = await this.orderService.getOrder(orderId);
    return OrderInfo.from(order);
  }
}
