import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { isBigInt } from "../bigint-utils";

export class BigIntTransformPipe implements PipeTransform<string, bigint> {
  transform(value: string, metadata: ArgumentMetadata): bigint {
    if (!isBigInt(value)) {
      throw new Error(`Invalid BigInt value: ${value}`);
    }
    return BigInt(value);
  }
}
