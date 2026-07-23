// Utilitário de CSV compartilhado pelo export/import de estoque.
// Delimitador ';' — Excel em pt-BR trata ',' como separador decimal e não
// quebra colunas de um CSV separado por vírgula (tudo cai na coluna A).
const DELIMITER = ';'

export function toCsv(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const escape = (v: string | number | boolean | null) => `"${(v ?? '').toString().replace(/"/g, '""')}"`
  return [headers, ...rows].map((row) => row.map(escape).join(DELIMITER)).join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM UTF-8 — evita o Excel interpretar acentos como caracteres errados.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = false }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === DELIMITER) {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line).map((c) => c.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
    return row
  })
}
