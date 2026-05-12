/**
 * Helper client-side pra exportar dados pra CSV.
 *
 * Limitação: exporta apenas o que o caller passar. Não busca dados além
 * da página atual — se precisar exportar a tabela inteira, fazer fetch
 * paginado antes.
 *
 * Encoding: UTF-8 com BOM pra Excel reconhecer acentos.
 */

export interface CsvColumn<T> {
  /** Nome do header no CSV */
  header: string;
  /** Função que extrai o valor da linha */
  accessor: (row: T) => string | number | null | undefined;
}

/**
 * Escapa um valor pra cell CSV.
 * Regras (RFC 4180):
 *   - se contém vírgula, aspas ou newline → wrap em aspas duplas
 *   - aspas duplas internas → escapar duplicando (")
 *   - null/undefined → string vazia
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "number" ? String(value) : value;
  const needsQuotes = /[",\n\r]/.test(s);
  if (!needsQuotes) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Constrói o conteúdo CSV completo.
 */
export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines: string[] = [];
  // Header
  lines.push(columns.map((c) => escapeCsvCell(c.header)).join(","));
  // Data rows
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsvCell(c.accessor(row))).join(","));
  }
  return lines.join("\r\n");
}

/**
 * Dispara download de um CSV no browser.
 *
 * @param filename Nome do arquivo (sem precisar .csv — adicionado automaticamente)
 * @param rows Linhas a exportar
 * @param columns Definição das colunas
 */
export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const csv = buildCsv(rows, columns);
  // BOM UTF-8 pra Excel reconhecer encoding corretamente
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const safeName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Helper de timestamp pra nome de arquivo:
 *   "transactions_2026-05-12_18-30.csv"
 */
export function timestampedFilename(prefix: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `${prefix}_${date}_${time}`;
}
