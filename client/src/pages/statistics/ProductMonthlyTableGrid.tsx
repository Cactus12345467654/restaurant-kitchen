import { useTranslation } from "@/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonthlyMatrix } from "./table-report-utils";

interface ProductMonthlyTableGridProps {
  matrix: MonthlyMatrix;
  year: number;
  month: number;
}

/** Check if day (1-based) is weekend in given month/year. */
function isWeekend(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function ProductMonthlyTableGrid({
  matrix,
  year,
  month,
}: ProductMonthlyTableGridProps) {
  const { t } = useTranslation();
  const { rows, daysInMonth, columnTotals, grandTotal } = matrix;

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50 dark:border dark:border-white/50 bg-card/30">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent h-8">
            <TableHead className="sticky left-0 z-20 min-w-[180px] bg-muted/90 font-semibold text-xs px-2 py-1.5 border-r border-border/50">
              {t("tableReport.productName")}
            </TableHead>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
              <TableHead
                key={day}
                className={`min-w-[2.5rem] text-center font-semibold text-xs px-1 py-1.5 ${
                  isWeekend(year, month, day)
                    ? "bg-red-500/10 dark:bg-red-500/5"
                    : "bg-muted/50"
                }`}
              >
                {day.toString().padStart(2, "0")}.
              </TableHead>
            ))}
            <TableHead className="sticky right-0 z-10 min-w-[3.5rem] bg-primary/10 font-semibold text-xs px-2 py-1.5 text-center border-l border-primary/30 dark:border-l dark:border-white/50">
              {t("tableReport.total")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={daysInMonth + 2}
                className="py-12 text-center text-muted-foreground text-sm"
              >
                {t("tableReport.noData")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.productName}
                className="border-border/30 dark:border-white/50 hover:bg-muted/20 h-8"
              >
                <TableCell className="sticky left-0 z-10 bg-card/80 font-medium text-xs px-2 py-1.5 border-r border-border/30 dark:border-white/50">
                  {row.productName}
                </TableCell>
                {row.dayQuantities.map((q, i) => (
                  <TableCell
                    key={i}
                    className={`min-w-[2.5rem] text-center text-xs px-1 py-1.5 ${
                      isWeekend(year, month, i + 1)
                        ? "bg-red-500/5 dark:bg-red-500/5"
                        : ""
                    }`}
                  >
                    {q > 0 ? q : ""}
                  </TableCell>
                ))}
                <TableCell className="sticky right-0 z-10 bg-primary/5 font-semibold text-xs px-2 py-1.5 text-center border-l border-primary/20 dark:border-l dark:border-white/50">
                  {row.rowTotal > 0 ? row.rowTotal : ""}
                </TableCell>
              </TableRow>
            ))
          )}
          {rows.length > 0 && (
            <TableRow className="border-t-2 border-primary/30 bg-primary/10 font-semibold h-9">
              <TableCell className="sticky left-0 z-10 bg-primary/15 font-semibold text-xs px-2 py-1.5 border-r border-border/50">
                {t("tableReport.total")}
              </TableCell>
              {columnTotals.map((tot, i) => (
                <TableCell
                  key={i}
                  className={`min-w-[2.5rem] text-center text-xs px-1 py-1.5 font-semibold ${
                    isWeekend(year, month, i + 1)
                      ? "bg-red-500/10 dark:bg-red-500/5"
                      : ""
                  }`}
                >
                  {tot > 0 ? tot : ""}
                </TableCell>
              ))}
              <TableCell className="sticky right-0 z-10 bg-primary/20 font-bold text-xs px-2 py-1.5 text-center border-l border-primary/40 dark:border-l dark:border-white/50">
                {grandTotal}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
