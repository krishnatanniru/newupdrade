/**
 * localStorage-based database helper.
 * Replaces Supabase with a simple persistent in-memory store.
 */

const PREFIX = 'ironflow_db_';

export function getTable<T>(table: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + table);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function setTable<T>(table: string, rows: T[]): void {
  localStorage.setItem(PREFIX + table, JSON.stringify(rows));
}

export function insertRow<T extends { id: string }>(table: string, row: T): void {
  const rows = getTable<T>(table);
  rows.push(row);
  setTable(table, rows);
}

export function updateRow<T extends { id: string }>(
  table: string,
  id: string,
  updates: Partial<T>
): void {
  const rows = getTable<T>(table);
  const idx = rows.findIndex((r) => (r as any).id === id);
  if (idx !== -1) {
    rows[idx] = { ...rows[idx], ...updates };
    setTable(table, rows);
  }
}

export function deleteRow(table: string, id: string): void {
  const rows = getTable<{ id: string }>(table);
  setTable(table, rows.filter((r) => r.id !== id));
}

export function deleteWhere(table: string, field: string, value: string): void {
  const rows = getTable<Record<string, any>>(table);
  setTable(table, rows.filter((r) => r[field] !== value));
}

export function clearTable(table: string): void {
  localStorage.removeItem(PREFIX + table);
}
