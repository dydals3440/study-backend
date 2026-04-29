import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test } from '@nestjs/testing';
import type { Prisma } from '../../generated/prisma/client';
import { OrderService } from '../../domain/order/order.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import {
  aCreateOrderCommand,
  anOrder,
  anOrderItem,
} from '../../../test/support/builders/order.builder';
import { OrderFacade } from './order.facade';
import { OrderInfo } from './order.info';

describe('OrderFacade', () => {
  let orderFacade: OrderFacade;
  let orderService: DeepMocked<OrderService>;
  let prismaService: DeepMocked<PrismaService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrderFacade,
        { provide: OrderService, useValue: createMock<OrderService>() },
        { provide: PrismaService, useValue: createMock<PrismaService>() },
      ],
    }).compile();

    orderFacade = moduleRef.get(OrderFacade);
    orderService = moduleRef.get(OrderService);
    prismaService = moduleRef.get(PrismaService);

    // $transaction 은 콜백 패턴만 사용 — 콜백을 즉시 실행하도록 mock
    prismaService.$transaction.mockImplementation((callback: any) =>
      callback(createMock<Prisma.TransactionClient>()),
    );
  });

  describe('createOrder', () => {
    describe('성공 케이스', () => {
      it('prisma.$transaction 안에서 service.createOrder 를 호출하고 결과를 OrderInfo 로 변환한다', async () => {
        // given
        const command = aCreateOrderCommand({ customerId: 1 });
        const persistedOrder = anOrder()
          .withCustomerId(1)
          .withItem(
            anOrderItem({
              productId: 100,
              quantity: 2,
              price: 10_000,
            }),
          )
          .build();
        orderService.createOrder.mockResolvedValue(persistedOrder);

        // when
        const result = await orderFacade.createOrder(command);

        // then - 트랜잭션 + 서비스 호출 검증
        expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
        expect(orderService.createOrder).toHaveBeenCalledWith(
          command.customerId,
          command.items,
          expect.anything(),
        );

        // then - 결과 OrderInfo 검증
        expect(result).toBeInstanceOf(OrderInfo);
        expect(result.customerId).toBe(1);
        expect(result.totalPrice).toBe(20_000);
        expect(result.orderItems).toHaveLength(1);
        expect(result.orderItems[0]?.productId).toBe(100);
        expect(result.orderItems[0]?.quantity).toBe(2);
      });
    });

    describe('실패 케이스', () => {
      it('service 가 예외를 던지면 그대로 전파된다 (트랜잭션은 호출됨)', async () => {
        // given
        const command = aCreateOrderCommand();
        const expectedError = new Error('재고 부족');
        orderService.createOrder.mockRejectedValue(expectedError);

        // when
        const action = (): Promise<OrderInfo> =>
          orderFacade.createOrder(command);

        // then
        await expect(action()).rejects.toBe(expectedError);
        expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('getOrder', () => {
    describe('성공 케이스', () => {
      it('service.getOrder 결과를 OrderInfo 로 변환한다 (트랜잭션 X)', async () => {
        // given
        const targetId = 42;
        const persistedOrder = anOrder()
          .withId(targetId)
          .withCustomerId(7)
          .withItem(anOrderItem())
          .build();
        orderService.getOrder.mockResolvedValue(persistedOrder);

        // when
        const result = await orderFacade.getOrder(targetId);

        // then
        expect(result).toBeInstanceOf(OrderInfo);
        expect(result.id).toBe(targetId);
        expect(result.customerId).toBe(7);
        expect(prismaService.$transaction).not.toHaveBeenCalled();
      });
    });

    describe('실패 케이스', () => {
      it('service 가 예외를 던지면 그대로 전파한다', async () => {
        // given
        const expectedError = new Error('NOT_FOUND');
        orderService.getOrder.mockRejectedValue(expectedError);

        // when
        const action = (): Promise<OrderInfo> => orderFacade.getOrder(999);

        // then
        await expect(action()).rejects.toBe(expectedError);
      });
    });
  });
});
