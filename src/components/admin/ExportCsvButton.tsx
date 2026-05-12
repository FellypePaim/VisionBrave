"use client";

import { Download } from "lucide-react";
import { downloadCsv, timestampedFilename, type CsvColumn } from "@/lib/admin/csv";

interface Props<T> {
  data: T[];
  columns: CsvColumn<T>[];
  filenamePrefix: string;
  disabled?: boolean;
  label?: string;
}

export function ExportCsvButton<T>({
  data, columns, filenamePrefix, disabled, label = "Exportar CSV",
}: Props<T>) {
  function handleExport() {
    if (!data.length) return;
    downloadCsv(timestampedFilename(filenamePrefix), data, columns);
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      title={
        data.length === 0
          ? "Nenhum dado para exportar"
          : `Exportar ${data.length} ${data.length === 1 ? "linha" : "linhas"} (página atual)`
      }
      className="px-3 py-1.5 rounded-[8px] border text-[11.5px] font-medium flex items-center gap-1.5 transition-colors bg-card2 border-b1 text-t2 hover:border-b2 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download size={11} />
      {label}
    </button>
  );
}
