import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/db/prisma.module';
import { OrderModule } from './order/order.module';
import { CartModule } from './cart/cart.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    OrderModule,
    CartModule,
    ProductModule,
  ],
})
export class AppModule {}
