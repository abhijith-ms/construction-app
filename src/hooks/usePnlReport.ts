import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PnLReportRow {
  site_id: string;
  site_name: string;
  total_income: number;
  labour_cost: number;
  site_expense_cost: number;
  supplier_bill_cost: number;
  material_usage_cost: number;
  total_cost: number;
  net_profit: number;
}

interface UsePnlReportOptions {
  siteId?: string | null;
  fromDate: string;
  toDate: string;
}

export function usePnlReport({ siteId, fromDate, toDate }: UsePnlReportOptions) {
  return useQuery({
    queryKey: ['pnlReport', siteId || 'all', fromDate, toDate],
    queryFn: async (): Promise<PnLReportRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_site_pnl', {
        p_site_id: siteId || null,
        p_from: fromDate,
        p_to: toDate,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    enabled: !!fromDate && !!toDate,
  });
}
