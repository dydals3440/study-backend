import { Module } from '@nestjs/common';
import { CartRepository } from '../../domain/cart/cart.repository';
import { CartService } from '../../domain/cart/cart.service';
import { CartRepositoryImpl } from '../../infrastructure/cart/cart.repository.impl';
import { CartV1Controller } from '../../interfaces/api/cart/cart-v1.controller';
import { CartFacade } from './cart.facade';

@Module({
  controllers: [CartV1Controller],
  providers: [
    CartFacade,
    CartService,
    {
      provide: CartRepository,
      useClass: CartRepositoryImpl,
    },
  ],
})
export class CartModule {}
