import { Constructor, IntoBigInt } from '@here-to-translate/common/types';
import { ValueTransformer } from 'typeorm';

export function BigIntColumnTransformer<T extends IntoBigInt>(
  cls: Constructor<T, [bigint]>
): ValueTransformer {
  return {
    from: (value: unknown): T => {
      if (typeof value === 'object' && value !== null && value instanceof cls) {
        return value as T;
      }
      if (typeof value === "bigint" || typeof value === "string" || typeof value === "number") {
        return new cls(BigInt(value));
      }
      throw new TypeError(
        "Value must be a bigint, string, number or instance of the specified class."
      );
    },
    to: (value: T): bigint => {
      if (typeof value === 'object' && value !== null && value instanceof cls) {
        return value.toBigInt();
      }
      throw new TypeError("Value must be an instance of the specified class.");
    }
  };
}

