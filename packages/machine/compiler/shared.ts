export const keywords = ['machine', 'state', 'initial', 'final', '@', 'on', 'wait', 'is'] as const;
export type Keyword = typeof keywords[number];
export function isKeyword(word: string): word is Keyword {
    return keywords.includes((word as Keyword));
}


export function assert(value: boolean, message: string): asserts value;
export function assert<T>(value: T | null | undefined, message?: string): asserts value is T;
export function assert(value: any, message?: string) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message || "Assertion failed")
  }
}
