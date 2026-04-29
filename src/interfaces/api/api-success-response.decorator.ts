import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

const metaSchema = {
  type: 'object',
  properties: {
    result: { type: 'string', enum: ['SUCCESS'] },
  },
};

export const ApiSuccessResponse = <T extends Type<unknown>>(
  model: T,
  options: { isArray?: boolean } = {},
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          meta: metaSchema,
          data: options.isArray
            ? { type: 'array', items: { $ref: getSchemaPath(model) } }
            : { $ref: getSchemaPath(model) },
        },
      },
    }),
  );

export const ApiSuccessEmptyResponse = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          meta: metaSchema,
          data: { type: 'object', nullable: true },
        },
      },
    }),
  );
