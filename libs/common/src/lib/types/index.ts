export type Nullable<T> = T | null;
export type Fn<A extends unknown[] = [], R = void> = (...args: A) => R;
export type AsyncFn<A extends unknown[] = [], R = void> = Fn<A, Promise<R>>;
