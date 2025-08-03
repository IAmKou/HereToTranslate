"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBigInt = exports.JsonStringifyWithBigInt = exports.JsonParseWithBigInt = exports.parseWithBigInt = exports.enquoteBigNumber = exports.isBigNumber = void 0;
const isBigNumber = (num) => !Number.isSafeInteger(+num);
exports.isBigNumber = isBigNumber;
const enquoteBigNumber = (jsonString, bigNumChecker) => jsonString.replaceAll(/([:\s[,]*)(\d+)([\s,\]]*)/g, (matchingSubstr, prefix, bigNum, suffix) => bigNumChecker(bigNum) ? `${prefix}"${bigNum}"${suffix}` : matchingSubstr);
exports.enquoteBigNumber = enquoteBigNumber;
const parseWithBigInt = (jsonString, bigNumChecker) => JSON.parse((0, exports.enquoteBigNumber)(jsonString, bigNumChecker), (key, value) => !isNaN(value) && bigNumChecker(value) ? BigInt(value) : value);
exports.parseWithBigInt = parseWithBigInt;
const JsonParseWithBigInt = (jsonString) => (0, exports.parseWithBigInt)(jsonString, exports.isBigNumber);
exports.JsonParseWithBigInt = JsonParseWithBigInt;
const JsonStringifyWithBigInt = (obj) => JSON.stringify(obj, (key, value) => (typeof value === "bigint" ? value.toString() : value));
exports.JsonStringifyWithBigInt = JsonStringifyWithBigInt;
/** Determines if a value can be coerced into a `BigInt`. */
const isBigInt = (value) => typeof value === "bigint" ||
    (typeof value === "string" && /^-?\d+$/.test(value)) ||
    (typeof value === "number" && Number.isSafeInteger(value) && value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER));
exports.isBigInt = isBigInt;
