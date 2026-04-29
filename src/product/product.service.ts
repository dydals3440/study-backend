import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductService {
  findAll() {
    return `This action returns all product`;
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }
}
