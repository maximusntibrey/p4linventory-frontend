/** Typed amounts such as "900" or "12.5". Format only; whether a cost is acceptable is the server's call. */
export const amountPattern = /^\d+(\.\d{1,2})?$/;

/** "1250" to "1250.00", "12.5" to "12.50": built from the typed digits, never through a float. */
export const twoDecimals = (text: string) => {
  const [whole, frac = ''] = text.trim().split('.');
  return `${whole}.${frac.padEnd(2, '0')}`;
};
