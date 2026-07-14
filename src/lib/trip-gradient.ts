const GRADIENTS = [
  { from: "#3b82f6", to: "#8b5cf6" },
  { from: "#10b981", to: "#06b6d4" },
  { from: "#f59e0b", to: "#ef4444" },
  { from: "#6366f1", to: "#ec4899" },
  { from: "#14b8a6", to: "#3b82f6" },
  { from: "#7c3aed", to: "#db2777" },
];

export function getTripGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++)
    h = (seed.charCodeAt(i) + ((h << 5) - h)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}
