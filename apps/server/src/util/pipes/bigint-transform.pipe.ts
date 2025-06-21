import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';

export class BigIntTransformPipe implements PipeTransform<string, bigint> {
  transform(value: string, metadata: ArgumentMetadata): bigint {
    try {
      return BigInt(value);
    } catch (error) {
      throw new BadRequestException('Invalid bigint value');
    }
  }
}
