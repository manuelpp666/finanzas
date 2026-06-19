export const formatCurrency = (n: number, currency = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);

export const formatCompact = (n: number) =>
  new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" });

export const formatDateLong = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const monthKey = (iso: string) => iso.slice(0, 7); // yyyy-mm

export const inMonth = (iso: string, year: number, month: number) => {
  const d = new Date(iso + "T00:00:00");
  return d.getFullYear() === year && d.getMonth() === month;
};

export const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 86400000);
