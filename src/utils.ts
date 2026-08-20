export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatViewer(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}jt`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}rb`;
  return String(count);
}

export function formatScheduled(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function discountPercent(normal: number, sale: number): number {
  return Math.round(((normal - sale) / normal) * 100);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
