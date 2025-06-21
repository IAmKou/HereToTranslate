import { isBigInt } from "@here-to-translate/common/bigint-utils";
import { PipeTransform } from "@nestjs/common";

export class BigIntTransformPipe implements PipeTransform<string, bigint> {
  transform(value: string /* , metadata: ArgumentMetadata */): bigint {
    if (!isBigInt(value)) {
      throw new Error(`Invalid BigInt value: ${value}`);
    }
    return BigInt(value);
  }
}
