import { getOrderTimestamp, type SharedOrder } from "@/lib/order-store";

/** Extract base product name (without modifiers). "Rīsu burito (Halapenjo)" → "Rīsu burito" */
export function getBaseProductName(item: string): string {
  const idx = item.indexOf(" (");
  return idx >= 0 ? item.slice(0, idx).trim() : item.trim();
}

/** Group product sales by day. Returns Map<productName, Map<day, quantity>> */
export function groupProductSalesByDay(
  orders: SharedOrder[],
  year: number,
  month: number
): Map<string, Map<number, number>> {
  const productByDay = new Map<string, Map<number, number>>();

  const monthStart = new Date(year, month - 1, 1).getTime();
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  for (const order of orders) {
    const ts = getOrderTimestamp(order);
    if (ts < monthStart || ts > monthEnd) continue;

    const date = new Date(ts);
    const day = date.getDate();

    const items = order.items ?? [];
    for (const itemStr of items) {
      const productName = getBaseProductName(itemStr);
      if (!productName) continue;

      let dayMap = productByDay.get(productName);
      if (!dayMap) {
        dayMap = new Map<number, number>();
        productByDay.set(productName, dayMap);
      }
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }
  }

  return productByDay;
}

export interface ProductDayRow {
  productName: string;
  dayQuantities: number[];
  rowTotal: number;
}

export interface MonthlyMatrix {
  products: string[];
  rows: ProductDayRow[];
  daysInMonth: number;
  columnTotals: number[];
  grandTotal: number;
}

/** Build monthly product matrix for table display. */
export function buildMonthlyProductMatrix(
  orders: SharedOrder[],
  year: number,
  month: number
): MonthlyMatrix {
  const productByDay = groupProductSalesByDay(orders, year, month);
  const daysInMonth = new Date(year, month, 0).getDate();

  const products = Array.from(productByDay.keys()).sort((a, b) =>
    a.localeCompare(b, "lv")
  );

  const rows: ProductDayRow[] = products.map((productName) => {
    const dayMap = productByDay.get(productName)!;
    const dayQuantities: number[] = [];
    let rowTotal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const q = dayMap.get(d) ?? 0;
      dayQuantities.push(q);
      rowTotal += q;
    }
    return { productName, dayQuantities, rowTotal };
  });

  const columnTotals: number[] = [];
  let grandTotal = 0;
  for (let d = 0; d < daysInMonth; d++) {
    let colSum = 0;
    for (const row of rows) {
      colSum += row.dayQuantities[d];
    }
    columnTotals.push(colSum);
    grandTotal += colSum;
  }

  return {
    products,
    rows,
    daysInMonth,
    columnTotals,
    grandTotal,
  };
}

/** Calculate row totals from matrix (already in ProductDayRow). */
export function calculateRowTotals(rows: ProductDayRow[]): number[] {
  return rows.map((r) => r.rowTotal);
}

/** Calculate column totals (already in MonthlyMatrix). */
export function calculateColumnTotals(matrix: MonthlyMatrix): number[] {
  return matrix.columnTotals;
}
