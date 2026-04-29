import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  order as OrderRow,
  ordersDetail as OrderDetailRow,
} from '../../generated/prisma/client';
import { OrderErrorCode } from '../../domain/order/order-error-code';
import { OrderItem } from '../../domain/order/order-item.model';
import { Order } from '../../domain/order/order.model';
import { OrderRepository } from '../../domain/order/order.repository';
import { OrderStatus } from '../../domain/order/order-status';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { CoreException } from '../../support/error/core-exception';
import { ErrorType } from '../../support/error/error-type';

@Injectable()
export class OrderRepositoryImpl extends OrderRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(
    id: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Order | null> {
    const orderRow = await tx.order.findUnique({ where: { id } });
    if (!orderRow) {
      return null;
    }
    if (orderRow.order_no === null) {
      throw new CoreException(
        ErrorType.INTERNAL,
        OrderErrorCode.CORRUPTED_ROW,
        { id },
      );
    }
    const detailRows = await tx.ordersDetail.findMany({
      where: { order_no: orderRow.order_no },
    });
    return OrderRepositoryImpl.toOrder(orderRow, detailRows);
  }

  async save(
    order: Order,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Order> {
    if (order.id === 0) {
      return OrderRepositoryImpl.insert(order, tx);
    }
    return OrderRepositoryImpl.update(order, tx);
  }

  private static async insert(
    order: Order,
    tx: Prisma.TransactionClient,
  ): Promise<Order> {
    const now = new Date();
    const orderRow = await tx.order.create({
      data: {
        customer_id: order.customerId,
        order_no: order.orderNo,
        total_price: order.totalPrice,
        status: order.status,
        created_at: now,
        updated_at: now,
      },
    });

    if (order.orderItems.length > 0) {
      await tx.ordersDetail.createMany({
        data: order.orderItems.map((item) => ({
          order_no: order.orderNo,
          product_id: item.productId,
          unit_price: item.price,
          qty: item.quantity,
          created_at: now,
          updated_at: now,
        })),
      });
    }

    const detailRows = await tx.ordersDetail.findMany({
      where: { order_no: order.orderNo },
    });
    return OrderRepositoryImpl.toOrder(orderRow, detailRows);
  }

  private static async update(
    order: Order,
    tx: Prisma.TransactionClient,
  ): Promise<Order> {
    const now = new Date();
    const orderRow = await tx.order.update({
      where: { id: order.id },
      data: {
        status: order.status,
        total_price: order.totalPrice,
        updated_at: now,
      },
    });
    if (orderRow.order_no === null) {
      throw new CoreException(
        ErrorType.INTERNAL,
        OrderErrorCode.CORRUPTED_ROW,
        { id: order.id },
      );
    }
    const detailRows = await tx.ordersDetail.findMany({
      where: { order_no: orderRow.order_no },
    });
    return OrderRepositoryImpl.toOrder(orderRow, detailRows);
  }

  private static toOrder(
    orderRow: OrderRow,
    detailRows: OrderDetailRow[],
  ): Order {
    if (
      orderRow.customer_id === null ||
      orderRow.order_no === null ||
      orderRow.total_price === null ||
      orderRow.status === null
    ) {
      throw new CoreException(
        ErrorType.INTERNAL,
        OrderErrorCode.CORRUPTED_ROW,
        { id: orderRow.id },
      );
    }
    return Order.restore({
      id: orderRow.id,
      orderNo: orderRow.order_no,
      customerId: orderRow.customer_id,
      status: OrderRepositoryImpl.toStatus(orderRow.status),
      totalPrice: orderRow.total_price,
      originalPrice: orderRow.total_price,
      discountAmount: 0,
      couponId: null,
      orderItems: detailRows.map((row) => OrderRepositoryImpl.toOrderItem(row)),
    });
  }

  private static toOrderItem(row: OrderDetailRow): OrderItem {
    if (
      row.order_no === null ||
      row.product_id === null ||
      row.unit_price === null ||
      row.qty === null
    ) {
      throw new CoreException(
        ErrorType.INTERNAL,
        OrderErrorCode.CORRUPTED_ROW,
        { id: row.id },
      );
    }
    return OrderItem.restore({
      id: row.id,
      productId: row.product_id,
      productName: '',
      quantity: row.qty,
      price: row.unit_price,
    });
  }

  private static toStatus(value: string): OrderStatus {
    for (const status of Object.values(OrderStatus)) {
      if (status === value) {
        return status;
      }
    }
    throw new CoreException(ErrorType.INTERNAL, OrderErrorCode.CORRUPTED_ROW, {
      invalidStatus: value,
    });
  }
}
