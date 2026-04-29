import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test } from '@nestjs/testing';
import { ProductErrorCode } from '../product/product-error-code';
import { ProductRepository } from '../product/product.repository';
import { aProduct } from '../../../test/support/builders/product.builder';
import {
  anOrder,
  anOrderItem,
} from '../../../test/support/builders/order.builder';
import { expectCoreExceptionAsync } from '../../../test/support/expect-helpers';
import { CreateOrderItemCommand } from './order.command';
import { OrderErrorCode } from './order-error-code';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let orderService: OrderService;
  let orderRepository: DeepMocked<OrderRepository>;
  let productRepository: DeepMocked<ProductRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useValue: createMock<OrderRepository>() },
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
      ],
    }).compile();

    orderService = moduleRef.get(OrderService);
    orderRepository = moduleRef.get(OrderRepository);
    productRepository = moduleRef.get(ProductRepository);
  });

  describe('createOrder', () => {
    describe('성공 케이스', () => {
      it('단일 항목: 락 조회 → 재고 차감 → 상품 저장 → 주문 저장 순서로 호출된다', async () => {
        // given - 재고 10개 짜리 상품
        const productInStock = aProduct({
          id: 100,
          name: 'X',
          price: 5_000,
          stock: 10,
        });
        productRepository.findByIdForUpdate.mockResolvedValue(productInStock);
        productRepository.save.mockResolvedValue(productInStock);
        orderRepository.save.mockImplementation(async (order) => order);

        const items = [
          new CreateOrderItemCommand({ productId: 100, quantity: 3 }),
        ];

        // when
        const persistedOrder = await orderService.createOrder(1, items);

        // then - 호출 인자 + 도메인 상태 변화 검증
        expect(productRepository.findByIdForUpdate).toHaveBeenCalledWith(
          100,
          undefined,
        );
        expect(productInStock.stock).toBe(7); // 10 - 3
        expect(productRepository.save).toHaveBeenCalledWith(
          productInStock,
          undefined,
        );
        expect(orderRepository.save).toHaveBeenCalledTimes(1);

        // then - 결과 Order 검증
        expect(persistedOrder.customerId).toBe(1);
        expect(persistedOrder.orderItems).toHaveLength(1);
        expect(persistedOrder.orderItems[0]?.productId).toBe(100);
        expect(persistedOrder.orderItems[0]?.quantity).toBe(3);
        expect(persistedOrder.orderItems[0]?.price).toBe(5_000);
      });

      it('다중 항목: 항목별로 락 조회 + 차감이 반복된다', async () => {
        // given
        const productA = aProduct({ id: 1, stock: 10, price: 1_000 });
        const productB = aProduct({ id: 2, stock: 20, price: 2_000 });
        productRepository.findByIdForUpdate
          .mockResolvedValueOnce(productA)
          .mockResolvedValueOnce(productB);
        productRepository.save.mockImplementation(async (p) => p);
        orderRepository.save.mockImplementation(async (o) => o);

        const items = [
          new CreateOrderItemCommand({ productId: 1, quantity: 3 }),
          new CreateOrderItemCommand({ productId: 2, quantity: 5 }),
        ];

        // when
        const persistedOrder = await orderService.createOrder(1, items);

        // then
        expect(productRepository.findByIdForUpdate).toHaveBeenCalledTimes(2);
        expect(productRepository.save).toHaveBeenCalledTimes(2);
        expect(productA.stock).toBe(7);
        expect(productB.stock).toBe(15);
        expect(persistedOrder.orderItems).toHaveLength(2);
        expect(persistedOrder.totalPrice).toBe(3 * 1_000 + 5 * 2_000); // 13,000
      });
    });

    describe('실패 케이스', () => {
      it('항목이 비어있으면 ITEMS_EMPTY 예외를 던지고 어떤 repository 도 호출되지 않는다', async () => {
        // given
        const emptyItems: CreateOrderItemCommand[] = [];

        // when
        const action = (): Promise<unknown> =>
          orderService.createOrder(1, emptyItems);

        // then
        await expectCoreExceptionAsync(action, OrderErrorCode.ITEMS_EMPTY);
        expect(productRepository.findByIdForUpdate).not.toHaveBeenCalled();
        expect(productRepository.save).not.toHaveBeenCalled();
        expect(orderRepository.save).not.toHaveBeenCalled();
      });

      it('상품이 존재하지 않으면 NOT_FOUND 예외를 던지고 후속 저장이 발생하지 않는다', async () => {
        // given - 락 조회 결과 null
        productRepository.findByIdForUpdate.mockResolvedValue(null);
        const items = [
          new CreateOrderItemCommand({ productId: 999, quantity: 1 }),
        ];

        // when
        const action = (): Promise<unknown> =>
          orderService.createOrder(1, items);

        // then
        await expectCoreExceptionAsync(action, OrderErrorCode.NOT_FOUND);
        expect(productRepository.save).not.toHaveBeenCalled();
        expect(orderRepository.save).not.toHaveBeenCalled();
      });

      it('재고 부족이면 product.decreaseStock 에서 NOT_ENOUGH_STOCK 이 발생하고 주문이 저장되지 않는다', async () => {
        // given - 재고 1개에 5개 주문
        const lowStockProduct = aProduct({ id: 1, stock: 1 });
        productRepository.findByIdForUpdate.mockResolvedValue(lowStockProduct);
        const items = [
          new CreateOrderItemCommand({ productId: 1, quantity: 5 }),
        ];

        // when
        const action = (): Promise<unknown> =>
          orderService.createOrder(1, items);

        // then
        await expectCoreExceptionAsync(
          action,
          ProductErrorCode.NOT_ENOUGH_STOCK,
        );
        expect(productRepository.save).not.toHaveBeenCalled();
        expect(orderRepository.save).not.toHaveBeenCalled();
      });

      it('다중 항목 중 두 번째에서 재고 부족 시 첫 번째도 주문 저장에 포함되지 않는다', async () => {
        // given - 첫 상품은 충분, 두 번째는 부족
        const wellStockedProduct = aProduct({ id: 1, stock: 100 });
        const lowStockProduct = aProduct({ id: 2, stock: 1 });
        productRepository.findByIdForUpdate
          .mockResolvedValueOnce(wellStockedProduct)
          .mockResolvedValueOnce(lowStockProduct);
        productRepository.save.mockImplementation(async (p) => p);

        const items = [
          new CreateOrderItemCommand({ productId: 1, quantity: 3 }), // OK
          new CreateOrderItemCommand({ productId: 2, quantity: 5 }), // 부족
        ];

        // when
        const action = (): Promise<unknown> =>
          orderService.createOrder(1, items);

        // then - 주문은 저장되지 않음 (실제 트랜잭션 롤백은 facade 레벨)
        await expect(action()).rejects.toThrow();
        expect(orderRepository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('getOrder', () => {
    describe('성공 케이스', () => {
      it('repository 가 Order 를 반환하면 그대로 반환한다', async () => {
        // given
        const targetOrderId = 1;
        const expectedOrder = anOrder()
          .withId(targetOrderId)
          .withItem(anOrderItem())
          .build();
        orderRepository.findById.mockResolvedValue(expectedOrder);

        // when
        const result = await orderService.getOrder(targetOrderId);

        // then
        expect(result).toBe(expectedOrder);
      });
    });

    describe('실패 케이스', () => {
      it('repository 가 null 을 반환하면 NOT_FOUND 예외를 던진다', async () => {
        // given
        orderRepository.findById.mockResolvedValue(null);

        // when
        const action = (): Promise<unknown> => orderService.getOrder(999);

        // then
        await expectCoreExceptionAsync(action, OrderErrorCode.NOT_FOUND);
      });
    });
  });
});
