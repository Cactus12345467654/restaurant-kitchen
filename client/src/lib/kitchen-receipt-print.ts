/**
 * Kitchen receipt printing for Cactus Food truck.
 * Day-based sequence numbers, receipt content, thermal printer.
 */

const DAY_BASE: Record<number, number> = {
  1: 100, // Monday
  2: 200, // Tuesday
  3: 300, // Wednesday
  4: 400, // Thursday
  5: 500, // Friday
  6: 600, // Saturday
  0: 700, // Sunday (getDay() returns 0)
};

const STORAGE_PREFIX = "kitchen-receipt-seq";

function getDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayBase(): number {
  return DAY_BASE[new Date().getDay()] ?? 100;
}

function getNextSequenceNumber(locationId: number): number {
  const key = `${STORAGE_PREFIX}-${locationId}-${getDateKey()}`;
  try {
    const raw = localStorage.getItem(key);
    const last = raw != null ? parseInt(raw, 10) : NaN;
    const base = getDayBase();
    const next = Number.isNaN(last) || last < base ? base : last + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    return getDayBase();
  }
}

export interface OrderLineForReceipt {
  itemName: string;
  modifiers: { optionName: string }[];
  totalPrice: number;
}

export interface ReceiptData {
  orderNumber: number;
  productLines: { name: string; qty: number; priceCents: number }[];
  totalCents: number;
  paidCents: number;
  time: string;
}

export function buildReceiptData(
  locationId: number,
  orderLines: OrderLineForReceipt[],
  totalCents: number
): ReceiptData {
  const orderNumber = getNextSequenceNumber(locationId);
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const grouped = new Map<string, { qty: number; priceCents: number }>();
  for (const line of orderLines) {
    const modStr = line.modifiers.map((m) => m.optionName).join(", ");
    const name = modStr ? `${line.itemName} (${modStr})` : line.itemName;
    const existing = grouped.get(name);
    if (existing) {
      existing.qty += 1;
      existing.priceCents += line.totalPrice;
    } else {
      grouped.set(name, { qty: 1, priceCents: line.totalPrice });
    }
  }

  const productLines = Array.from(grouped.entries()).map(([name, { qty, priceCents }]) => ({
    name,
    qty,
    priceCents,
  }));

  return {
    orderNumber,
    productLines,
    totalCents,
    paidCents: totalCents,
    time,
  };
}

function buildReceiptHtml(data: ReceiptData): string {
  const lines = data.productLines
    .map((l) => `${l.name} x${l.qty}  €${(l.priceCents / 100).toFixed(2)}`)
    .join("\n");
  const total = `€${(data.totalCents / 100).toFixed(2)}`;
  const paid = `€${(data.paidCents / 100).toFixed(2)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Virtuves čeks #${data.orderNumber}</title>
  <style>
    body { font-family: monospace; font-size: 12px; padding: 8px; max-width: 58mm; margin: 0; }
    h2 { margin: 0 0 8px 0; font-size: 14px; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
    .total { font-weight: bold; margin-top: 8px; }
    .time { margin-top: 4px; }
  </style>
</head>
<body>
  <h2>Pasūtījums #${data.orderNumber}</h2>
  <pre>${lines}</pre>
  <div class="total">Kopā: ${total}</div>
  <div>Samaksāts: ${paid}</div>
  <div class="time">Laiks: ${data.time}</div>
</body>
</html>`;
}

/**
 * Sends receipt to thermal printer via browser print.
 * Uses hidden iframe to avoid opening a new window (keeps main app visible).
 * Fails silently if printer unavailable.
 */
export function printKitchenReceipt(data: ReceiptData): void {
  try {
    const html = buildReceiptHtml(data);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 100);
  } catch {
    // Continue without error; printer may be unavailable
  }
}

export function isCactusFoodTruck(locationName: string | undefined): boolean {
  if (!locationName) return false;
  const lower = locationName.trim().toLowerCase();
  return lower === "cactus food truck" || lower.includes("cactus") && lower.includes("food truck");
}
