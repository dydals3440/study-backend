import { Module } from '@nestjs/common';
import { OrderRepository } from '../../domain/order/order.repository';
import { OrderService } from '../../domain/order/order.service';
import { OrderRepositoryImpl } from '../../infrastructure/order/order.repository.impl';
import { OrderV1Controller } from '../../interfaces/api/order/order-v1.controller';
import { ProductModule } from '../product/product.module';
import { OrderFacade } from './order.facade';

@Module({
  imports: [ProductModule],
  controllers: [OrderV1Controller],
  providers: [
    OrderFacade,
    OrderService,
    {
      provide: OrderRepository,
      useClass: OrderRepositoryImpl,
    },
  ],
})
export class OrderModule {}
