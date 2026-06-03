// Firestore SDK logs PERMISSION_DENIED via console.warn for assertFails cases — expected noise.
// The Firebase logger passes ("[timestamp]  @firebase/firestore:", message) as separate args,
// so we must check all args, not just args[0].
const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (args.map(String).join(' ').includes('PERMISSION_DENIED')) return;
  originalWarn(...args);
};
