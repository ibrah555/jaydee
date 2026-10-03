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

declare module '@supabase/supabase-js' {
  export type SupabaseClient = any;
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
}

declare module 'jspdf' {
  class jsPDF {
    constructor(options?: any);
    text(text: string, x: number, y: number, options?: any): jsPDF;
    setFontSize(size: number): jsPDF;
    setTextColor(ch1: number | string, ch2?: number, ch3?: number): jsPDF;
    save(filename: string): jsPDF;
    [key: string]: any;
  }
  export default jsPDF;
}

declare module 'jspdf-autotable' {
  export default function autoTable(doc: any, options: any): void;
}
