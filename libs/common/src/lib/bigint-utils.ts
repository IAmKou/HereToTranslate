import { Fn } from "./types";

export const isBigNumber = (num: string) => !Number.isSafeInteger(+num);

export const enquoteBigNumber = (jsonString: string, bigNumChecker: Fn<[string], boolean>) =>
  jsonString.replaceAll(/([:\s[,]*)(\d+)([\s,\]]*)/g, (matchingSubstr, prefix, bigNum, suffix) =>
    bigNumChecker(bigNum) ? `${prefix}"${bigNum}"${suffix}` : matchingSubstr
  );

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
