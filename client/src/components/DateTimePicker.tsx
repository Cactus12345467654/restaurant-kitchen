import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useTranslation } from "@/i18n";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** ISO datetime string "YYYY-MM-DDTHH:mm" or empty */
export interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function toDate(dt: string): Date {
  if (!dt) return new Date();
  const d = new Date(dt);
  return isNaN(d.getTime()) ? new Date() : d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Izvēlies datumu un laiku",
  className,
}: DateTimePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const date = toDate(value);
  const [hour, setHour] = useState(() => String(date.getHours()).padStart(2, "0"));
  const [minute, setMinute] = useState(() => String(date.getMinutes()).padStart(2, "0"));

  useEffect(() => {
    if (open) {
      const d = toDate(value);
      setHour(String(d.getHours()).padStart(2, "0"));
      setMinute(String(d.getMinutes()).padStart(2, "0"));
    }
  }, [open, value]);

  const syncTime = (d: Date) => {
    setHour(String(d.getHours()).padStart(2, "0"));
    setMinute(String(d.getMinutes()).padStart(2, "0"));
  };

  const applyTime = () => {
    const h = Math.min(23, Math.max(0, parseInt(hour, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(minute, 10) || 0));
    const next = new Date(date);
    next.setHours(h, m, 0, 0);
    onChange(toISO(next));
  };

  const handleSelect = (d: Date | undefined) => {
    if (!d) return;
    const next = new Date(d);
    next.setHours(parseInt(hour, 10) || 0, parseInt(minute, 10) || 0, 0, 0);
    onChange(toISO(next));
  };

  const handleNow = () => {
    const now = new Date();
    onChange(toISO(now));
    syncTime(now);
  };

  const handleDone = () => {
    applyTime();
    setOpen(false);
  };

  const displayValue = value
    ? format(toDate(value), "dd.MM.yyyy HH:mm")
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "min-h-9 h-auto py-2.5 px-4 justify-start text-left font-normal bg-background/50 leading-normal w-full",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{displayValue || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
        <div className="p-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
          />
          <div className="border-t border-border/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t("datetimePicker.time")}</Label>
              <span className="text-sm font-medium tabular-nums">{hour}:{minute}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-12 shrink-0">{t("datetimePicker.hour")}</Label>
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={parseInt(hour, 10) || 0}
                  onChange={(e) => setHour(String(e.target.value).padStart(2, "0"))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-12 shrink-0">{t("datetimePicker.minute")}</Label>
                <input
                  type="range"
                  min={0}
                  max={59}
                  value={parseInt(minute, 10) || 0}
                  onChange={(e) => setMinute(String(e.target.value).padStart(2, "0"))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 p-3 pt-0">
            <Button variant="outline" size="sm" onClick={handleNow}>
              {t("datetimePicker.now")}
            </Button>
            <Button size="sm" onClick={handleDone} className="ml-auto">
              {t("datetimePicker.done")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
