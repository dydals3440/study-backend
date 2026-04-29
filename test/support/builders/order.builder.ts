import { faker } from '@faker-js/faker';
import type { Prisma } from '../../../src/generated/prisma/client';
import {
  CreateOrderCommand,
  CreateOrderItemCommand,
} from '../../../src/domain/order/order.command';
import { OrderItem } from '../../../src/domain/order/order-item.model';
import { Order } from '../../../src/domain/order/order.model';
import { OrderStatus } from '../../../src/domain/order/order-status';

type OrderProps = Parameters<typeof Order.restore>[0];
type OrderItemProps = Parameters<typeof OrderItem.restore>[0];
type OrderRowInput = Prisma.orderUncheckedCreateInput;
type OrderDetailRowInput = Prisma.ordersDetailUncheckedCreateInput;

export const anOrderItem = (
  overrides: Partial<OrderItemProps> = {},
): OrderItem =>
  OrderItem.restore({
    id: faker.number.int({ min: 1, max: 10_000 }),
    productId: faker.number.int({ min: 1, max: 10_000 }),
    productName: faker.commerce.productName(),
    quantity: faker.number.int({ min: 1, max: 10 }),
    price: faker.number.int({ min: 1_000, max: 100_000 }),
    ...overrides,
  });

/**
 * Aggregate 인 Order 는 builder 패턴으로 — 자식(OrderItem)을 누적하며 합계 자동 계산.
 */
export class OrderBuilder {
  private props: OrderProps = {
    id: faker.number.int({ min: 1, max: 10_000 }),
    orderNo: `ORD-${faker.string.uuid()}`,
    customerId: faker.number.int({ min: 1, max: 1_000 }),
    status: OrderStatus.CREATED,
    totalPrice: 0,
    originalPrice: 0,
    discountAmount: 0,
    couponId: null,
    orderItems: [],
  };

  withId(id: number): this {
    this.props = { ...this.props, id };
    return this;
  }

  withOrderNo(orderNo: string): this {
    this.props = { ...this.props, orderNo };
    return this;
  }

  withCustomerId(customerId: number): this {
    this.props = { ...this.props, customerId };
    return this;
  }

  withStatus(status: OrderStatus): this {
    this.props = { ...this.props, status };
    return this;
  }

  withItem(item: OrderItem): this {
    const orderItems = [...this.props.orderItems, item];
    const total = orderItems.reduce((sum, it) => sum + it.totalPrice(), 0);
    this.props = {
      ...this.props,
      orderItems,
      originalPrice: total,
      totalPrice: total,
    };
    return this;
  }

  withDiscount(discountAmount: number, couponId: number): this {
    this.props = {
      ...this.props,
      discountAmount,
      couponId,
      totalPrice: this.props.originalPrice - discountAmount,
    };
    return this;
  }

  build(): Order {
    return Order.restore(this.props);
  }
}

export const anOrder = (): OrderBuilder => new OrderBuilder();

type CreateOrderProps = ConstructorParameters<typeof CreateOrderCommand>[0];

export const aCreateOrderCommand = (
  overrides: Partial<CreateOrderProps> = {},
): CreateOrderCommand => {
  const items = overrides.items ?? [
    new CreateOrderItemCommand({
      productId: faker.number.int({ min: 1, max: 10_000 }),
      quantity: faker.number.int({ min: 1, max: 5 }),
    }),
  ];
  return new CreateOrderCommand({
    customerId: faker.number.int({ min: 1, max: 1_000 }),
    items,
    ...overrides,
  });
};

/**
 * E2E 테스트의 HTTP body 빌더 — `POST /api/v1/orders` 에 그대로 send 가능.
 */
export const buildCreateOrderRequest = (
  overrides: {
    customerId?: number;
    items?: ReadonlyArray<{ productId: number; quantity: number }>;
  } = {},
): {
  customerId: number;
  items: ReadonlyArray<{ productId: number; quantity: number }>;
} => ({
  customerId: overrides.customerId ?? faker.number.int({ min: 1, max: 1_000 }),
  items: overrides.items ?? [
    {
      productId: faker.number.int({ min: 1, max: 10_000 }),
      quantity: faker.number.int({ min: 1, max: 5 }),
    },
  ],
});

/**
 * Integration 테스트에서 `tx.order.create({ data })` 에 그대로 넘길 row 빌더.
 */
export const anOrderRow = (
  overrides: Partial<OrderRowInput> = {},
): OrderRowInput => {
  const now = new Date();
  return {
    customer_id: faker.number.int({ min: 1, max: 1_000 }),
    order_no: `ORD-${faker.string.uuid()}`,
    total_price: faker.number.int({ min: 1_000, max: 1_000_000 }),
    status: OrderStatus.CREATED,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

export const anOrderDetailRow = (
  overrides: Partial<OrderDetailRowInput> = {},
): OrderDetailRowInput => {
  const now = new Date();
  return {
    order_no: `ORD-${faker.string.uuid()}`,
    product_id: faker.number.int({ min: 1, max: 10_000 }),
    unit_price: faker.number.int({ min: 1_000, max: 100_000 }),
    qty: faker.number.int({ min: 1, max: 10 }),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};
