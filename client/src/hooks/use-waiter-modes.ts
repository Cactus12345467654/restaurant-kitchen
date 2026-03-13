import { useState, useEffect } from "react";

const PAGER_KEY = "waiter-pager-mode";
const PRINTER_KEY = "waiter-printer-mode";

function readPagerMode(): boolean {
  try {
    const v = localStorage.getItem(PAGER_KEY);
    if (v === "0" || v === "false") return false;
    return true;
  } catch {
    return true;
  }
}

function readPrinterMode(): boolean {
  try {
    const v = localStorage.getItem(PRINTER_KEY);
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

export function usePagerMode(): [boolean, (on: boolean) => void] {
  const [pagerMode, setPagerMode] = useState(() => readPagerMode());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PAGER_KEY) setPagerMode(readPagerMode());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const set = (on: boolean) => {
    setPagerMode(on);
    try {
      localStorage.setItem(PAGER_KEY, on ? "1" : "0");
    } catch {}
  };
  return [pagerMode, set];
}

export function usePrinterMode(): [boolean, (on: boolean) => void] {
  const [printerMode, setPrinterMode] = useState(() => readPrinterMode());
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PRINTER_KEY) setPrinterMode(readPrinterMode());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const set = (on: boolean) => {
    setPrinterMode(on);
    try {
      localStorage.setItem(PRINTER_KEY, on ? "1" : "0");
    } catch {}
  };
  return [printerMode, set];
}
