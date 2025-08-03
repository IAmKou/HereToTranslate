import { ValidationOptions, ValidateBy, buildMessage } from "class-validator";
import { isBigInt } from "@here-to-translate/common/bigint-utils";

/** Decorator extension for checking whether the given value can be coerced into a `BigInt`. */
export function IsBigInt(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: isBigInt.name,
      validator: {
        validate: (value: unknown): boolean => isBigInt(value),
        defaultMessage: buildMessage(
          eachPrefix => `${eachPrefix}$property must be a BigInt or a string/number that can be safely converted to BigInt`,
          validationOptions
        )
      }
    },
    validationOptions
  );
}
