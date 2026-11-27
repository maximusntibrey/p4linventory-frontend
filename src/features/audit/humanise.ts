/** Turns an action code such as dispatch_created into Dispatch created. The action list is open-ended, so unknown codes still read. */
export const humanise = (code: string) => {
  const words = code.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};
