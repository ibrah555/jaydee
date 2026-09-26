declare module 'dexie-export-import' {
  export function exportDB(db: any, options?: any): Promise<Blob>;
  export function importDB(blob: Blob | File, options?: any): Promise<any>;
}

declare module 'date-fns' {
  export function format(date: Date | number, formatStr: string, options?: any): string;
  export function subDays(date: Date | number, amount: number): Date;
  export function startOfMonth(date: Date | number): Date;
  export function endOfDay(date: Date | number): Date;
  export function startOfDay(date: Date | number): Date;
  export function isWithinInterval(date: Date | number, interval: { start: Date | number; end: Date | number }): boolean;
}
