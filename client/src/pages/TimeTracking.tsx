import { useMemo, useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-users";
import { useLocations } from "@/hooks/use-locations";
import { useTimeEntries } from "@/hooks/use-time-entries";
import { useTranslation } from "@/i18n";
import { getDaysInMonth } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

function formatDisplayName(username: string): string {
  const part = username.split("@")[0] || username;
  return part
    .replace(/\./g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function minutesToHHMM(m: number): string {
  if (m <= 0) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, "0")}`;
}

export default function TimeTracking() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isSuperAdmin = hasRole(user, "super_admin");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    isSuperAdmin ? null : (user?.locationId ?? null)
  );
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: locations = [] } = useLocations();
  const { data: entries = [] } = useTimeEntries(selectedLocationId, year, month);

  useEffect(() => {
    if (isSuperAdmin && locations.length > 0 && selectedLocationId == null) {
      setSelectedLocationId(locations[0].id);
    }
  }, [isSuperAdmin, locations, selectedLocationId]);

  const employees = users.filter((u) => {
    if (!u.locationId || u.locationId !== selectedLocationId) return false;
    if (!u.isActive) return false;
    const roles = Array.isArray(u.roles) ? u.roles : [(u as any).role];
    if (roles.includes("manager")) return false;
    return roles.includes("waiter") || roles.includes("kitchen_staff");
  });

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isWeekend = (day: number) => {
    const d = new Date(year, month - 1, day);
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  };

  const { byUserDay, byUserTotal, byDayTotal } = useMemo(() => {
    const byUserDay: Record<number, Record<number, number>> = {};
    const byUserTotal: Record<number, number> = {};
    const byDayTotal: Record<number, number> = {};
    for (const e of entries) {
      const start = new Date(e.startedAt);
      const end = e.endedAt ? new Date(e.endedAt) : new Date();
      const totalMins = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000) - (e.totalPauseMinutes || 0));
      const day = start.getDate();
      if (start.getMonth() === month - 1 && start.getFullYear() === year) {
        byUserDay[e.userId] = byUserDay[e.userId] || {};
        byUserDay[e.userId][day] = (byUserDay[e.userId][day] || 0) + totalMins;
        byUserTotal[e.userId] = (byUserTotal[e.userId] || 0) + totalMins;
        byDayTotal[day] = (byDayTotal[day] || 0) + totalMins;
      }
    }
    return { byUserDay, byUserTotal, byDayTotal };
  }, [entries, year, month]);

  if (!selectedLocationId && !isSuperAdmin) {
    return (
      <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager"]}>
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("nav.timeTracking")}
          </h1>
          <p className="text-muted-foreground">{t("timeTracking.noLocation")}</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager"]}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {t("nav.timeTracking")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("timeTracking.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isSuperAdmin && locations.length > 0 && (
              <Select
                value={selectedLocationId != null ? String(selectedLocationId) : ""}
                onValueChange={(val) => setSelectedLocationId(Number(val))}
              >
                <SelectTrigger className="w-[200px] bg-black/20 border-border/50">
                  <SelectValue placeholder={t("timeTracking.selectLocation")} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={String(month)}
              onValueChange={(val) => setMonth(Number(val))}
            >
              <SelectTrigger className="w-[160px] bg-black/20 border-border/50">
                <SelectValue placeholder={t("timeTracking.selectMonth")} />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {t(`timeTracking.month${m}` as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(val) => setYear(Number(val))}
            >
              <SelectTrigger className="w-[120px] bg-black/20 border-border/50">
                <SelectValue placeholder={t("timeTracking.selectYear")} />
              </SelectTrigger>
              <SelectContent>
                {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {usersLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">{t("common.loading")}</p>
          </div>
        ) : employees.length === 0 ? (
          <Card className="p-8 border-border/50">
            <p className="text-muted-foreground text-center">
              {t("timeTracking.noEmployees")}
            </p>
          </Card>
        ) : (
          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="min-w-[100px] h-8 px-2 py-1.5 font-semibold text-muted-foreground sticky left-0 bg-card z-10">
                      {t("common.name")}
                    </TableHead>
                    {days.map((day) => (
                      <TableHead
                        key={day}
                        className={`min-w-[44px] h-8 px-1.5 py-1.5 text-center font-semibold text-muted-foreground ${
                          isWeekend(day) ? "bg-red-500/10" : ""
                        }`}
                      >
                        {String(day).padStart(2, "0")}.
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[52px] h-8 px-1.5 py-1.5 text-right font-semibold text-muted-foreground bg-muted/30">
                      {t("timeTracking.total")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="border-border/50 hover:bg-white/5"
                    >
                      <TableCell className="px-2 py-1.5 font-medium text-foreground sticky left-0 bg-card z-10">
                        {formatDisplayName(emp.username)}
                      </TableCell>
                      {days.map((day) => {
                        const mins = byUserDay[emp.id]?.[day] ?? 0;
                        return (
                          <TableCell
                            key={day}
                            className={`px-1.5 py-1.5 text-center text-muted-foreground ${
                              isWeekend(day) ? "bg-red-500/5" : ""
                            }`}
                          >
                            {minutesToHHMM(mins)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="px-1.5 py-1.5 text-right font-medium bg-muted/20">
                        {minutesToHHMM(byUserTotal[emp.id] ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="border-border/50 bg-muted/30 font-medium">
                    <TableCell className="px-2 py-1.5 sticky left-0 bg-muted/50 z-10">
                      {t("timeTracking.total")}
                    </TableCell>
                    {days.map((day) => (
                      <TableCell
                        key={day}
                        className={`px-1.5 py-1.5 text-center ${
                          isWeekend(day) ? "bg-red-500/10" : ""
                        }`}
                      >
                        {minutesToHHMM(byDayTotal[day] ?? 0)}
                      </TableCell>
                    ))}
                    <TableCell className="px-1.5 py-1.5 text-right font-semibold">
                      {minutesToHHMM(Object.values(byUserTotal).reduce((a, b) => a + b, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
