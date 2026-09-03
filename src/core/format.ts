const SUFFIXES = [
  "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No",
  "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg",
];

/** Compact number for display. Never returns more than 6 characters for sane inputs. */
export function fmt(n: number): string {
  if (!isFinite(n)) return "∞";
  if (n < 0) return "-" + fmt(-n);
  if (n === 0) return "0";
  if (n < 1) return n < 0.01 ? n.toExponential(1) : n.toFixed(2);
  if (n < 1000) return n < 10 ? String(Math.round(n * 10) / 10) : String(Math.floor(n));
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) {
    const v = n / 1000 ** tier;
    const s = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : String(Math.floor(v));
    return s + SUFFIXES[tier];
  }
  return n.toExponential(2).replace("e+", "e");
}

export const money = (n: number) => "$" + fmt(n);

export function pct(x: number): string {
  const v = x * 100;
  return (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : String(Math.round(v))) + "%";
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function duration(seconds: number): string {
  if (seconds < 60) return Math.round(seconds) + "s";
  const m = Math.floor(seconds / 60);
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  return h + "h " + (m % 60) + "m";
}
