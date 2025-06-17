import { Fn } from "@here-to-translate/common/types";
import { buildMessage, ValidateBy, ValidationOptions } from "class-validator";

export const isBigNumber = (num: string) => !Number.isSafeInteger(+num);

export const enquoteBigNumber = (jsonString: string, bigNumChecker: Fn<[string], boolean>) =>
  jsonString.replaceAll(/([:\s[,]*)(\d+)([\s,\]]*)/g, (matchingSubstr, prefix, bigNum, suffix) =>
    bigNumChecker(bigNum) ? `${prefix}"${bigNum}"${suffix}` : matchingSubstr
  );

// parser that turns matching *big numbers* in
// source JSON string to bigint

export const parseWithBigInt = (jsonString: string, bigNumChecker: Fn<[string], boolean>) =>
  JSON.parse(enquoteBigNumber(jsonString, bigNumChecker), (key, value) =>
    !isNaN(value) && bigNumChecker(value) ? BigInt(value) : value
  );

export const JsonParseWithBigInt = (jsonString: string) => parseWithBigInt(jsonString, isBigNumber);
export const JsonStringifyWithBigInt = (obj: object) =>
  JSON.stringify(obj, (key, value) => (typeof value === "bigint" ? value.toString() : value));

/** Determines if a value can be coerced into a `BigInt`. */
export const isBigInt = (value: unknown): value is bigint =>
  typeof value === "bigint" ||
  (typeof value === "string" && /^-?\d+$/.test(value)) ||
  (typeof value === "number" && Number.isSafeInteger(value) && value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER));


/** Decorator extension for checking whether value is a `BigInt`. */
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
  )
}
