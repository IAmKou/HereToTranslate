import { Fn } from "./types";
export declare const isBigNumber: (num: string) => boolean;
export declare const enquoteBigNumber: (jsonString: string, bigNumChecker: Fn<[string], boolean>) => string;
export declare const parseWithBigInt: (jsonString: string, bigNumChecker: Fn<[string], boolean>) => any;
export declare const JsonParseWithBigInt: (jsonString: string) => any;
export declare const JsonStringifyWithBigInt: (obj: object) => string;
/** Determines if a value can be coerced into a `BigInt`. */
export declare const isBigInt: (value: unknown) => value is bigint;
//# sourceMappingURL=bigint-utils.d.ts.map