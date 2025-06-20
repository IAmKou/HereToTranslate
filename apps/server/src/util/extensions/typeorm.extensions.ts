import { Constructor, IntoBigInt } from "@here-to-translate/common/types";
import { ValueTransformer } from "typeorm";

export function BigIntColumnTransformer<T extends IntoBigInt>(cls: Constructor<T, [bigint]>): ValueTransformer {
  return {
    from: (value: bigint | string | number | T): T => {
      if (value instanceof cls) {
        return value;
      }
      if (typeof value === "bigint") {
        return new cls(value);
      } else if (typeof value === "string" || typeof value === "number") {
        const bigIntValue = BigInt(value);
        return new cls(bigIntValue);
      }
      throw new TypeError("Value must be a bigint, string, or number that can be safely converted to a BigInt.");
    },
    to: (value: T): bigint => {
      if (value instanceof cls) {
        const result = value.toBigInt();
        if (typeof result === "bigint") {
          return result;
        }
        /* unreachable */ throw new TypeError(`${cls.name}#toBigInt() must return a BigInt.`);
      }
      throw new TypeError("Value must be an instance of the specified class.");
    }
  };
}
