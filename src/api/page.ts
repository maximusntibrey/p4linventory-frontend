/**
 * The contract's `Page.results` is declared as `unknown[]` and each list operation narrows it with an
 * intersection, which TypeScript will not map over. This returns the rows typed as the operation says.
 */
export const rowsOf = <P extends { results?: unknown[] }>(page: P) =>
  (page.results ?? []) as NonNullable<P['results']>[number][];
