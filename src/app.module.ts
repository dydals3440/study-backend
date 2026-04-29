import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { CartModule } from './cart/cart.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [OrderModule, CartModule, ProductModule],
})
export class AppModule {}
