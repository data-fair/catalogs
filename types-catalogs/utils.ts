/** Utility type to check if a type T includes a type U */
export type Includes<T extends any[], U> = U extends T[number] ? true : false
