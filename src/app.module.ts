import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CartModule } from './application/cart/cart.module';
import { OrderModule } from './application/order/order.module';
import { ProductModule } from './application/product/product.module';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    ProductModule,
    CartModule,
    OrderModule,
  ],
})
export class AppModule {}
