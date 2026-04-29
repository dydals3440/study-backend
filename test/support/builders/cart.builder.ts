import { faker } from '@faker-js/faker';
import type { Prisma } from '../../../src/generated/prisma/client';
import { AddCartItemCommand } from '../../../src/domain/cart/cart.command';
import { Cart } from '../../../src/domain/cart/cart.model';

type CartProps = Parameters<typeof Cart.restore>[0];
type CartCreateInput = Prisma.cartUncheckedCreateInput;
type AddCartItemProps = ConstructorParameters<typeof AddCartItemCommand>[0];

export const aCart = (overrides: Partial<CartProps> = {}): Cart =>
  Cart.restore({
    id: faker.number.int({ min: 1, max: 10_000 }),
    customerId: faker.number.int({ min: 1, max: 1_000 }),
    productId: faker.number.int({ min: 1, max: 10_000 }),
    unitPrice: faker.number.int({ min: 1_000, max: 100_000 }),
    quantity: faker.number.int({ min: 1, max: 10 }),
    ...overrides,
  });

export const aCartRow = (
  overrides: Partial<CartCreateInput> = {},
): CartCreateInput => {
  const now = new Date();
  return {
    customer_id: faker.number.int({ min: 1, max: 1_000 }),
    product_id: faker.number.int({ min: 1, max: 10_000 }),
    unit_price: faker.number.int({ min: 1_000, max: 100_000 }),
    qty: faker.number.int({ min: 1, max: 10 }),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

export const anAddCartItemCommand = (
  overrides: Partial<AddCartItemProps> = {},
): AddCartItemCommand =>
  new AddCartItemCommand({
    customerId: faker.number.int({ min: 1, max: 1_000 }),
    productId: faker.number.int({ min: 1, max: 10_000 }),
    unitPrice: faker.number.int({ min: 1_000, max: 100_000 }),
    quantity: faker.number.int({ min: 1, max: 10 }),
    ...overrides,
  });
