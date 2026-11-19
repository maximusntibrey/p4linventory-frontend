// js-yaml ships no types; only `load` is used (tests and scripts read the contract with it).
declare module 'js-yaml' {
  export function load(input: string): unknown;
}
