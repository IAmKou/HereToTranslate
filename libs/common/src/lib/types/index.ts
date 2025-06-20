export type Nullable<T> = T | null;
export type Maybe<T> = T | undefined;
export type Fn<A extends unknown[] = [], R = void> = (...args: A) => R;
export type AsyncFn<A extends unknown[] = [], R = void> = Fn<A, Promise<R>>;
export type Constructor<T, A extends unknown[] = unknown[]> = new (...args: A) => T;

export interface IntoBigInt {
  toBigInt(): bigint;
}

export type BigIntCompatiblePrimitives = bigint | number | string | boolean;

export type Into<T extends new(...args: unknown[]) => T> = ConstructorParameters<T>
