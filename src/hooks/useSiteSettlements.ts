import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { startOfWeek } from "date-fns";

export interface SiteSettlement {
  id: string;
  labourId: string;
  workerName: string;
  weekStart: string;
  weekEnd: string;
  grossWages: number;
  totalAdvances: number;
  carriedOverDue: number;
  netPayable: number;
  amountPaid: number;
  paymentStatus: "pending" | "partial" | "paid" | "overdue";
}

export function useSiteSettlements(siteId: string, weekStart?: Date) {
  const targetWeek = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = targetWeek.toISOString().split("T")[0];

  return useQuery<SiteSettlement[]>({
    queryKey: ["site-settlements", siteId, weekStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labour_settlements")
        .select(`
          id,
          labour_id,
          week_start_date,
          week_end_date,
          gross_wages,
          total_advances,
          carried_over_due,
          net_payable,
          amount_paid,
          payment_status,
          labour (
            id,
            full_name
          )
        `)
        .eq("site_id", siteId)
        .eq("week_start_date", weekStartStr)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((s: any) => ({
        id: s.id,
        labourId: s.labour_id,
        workerName: s.labour?.full_name || "Unknown",
        weekStart: s.week_start_date,
        weekEnd: s.week_end_date,
        grossWages: s.gross_wages,
        totalAdvances: s.total_advances,
        carriedOverDue: s.carried_over_due,
        netPayable: s.net_payable,
        amountPaid: s.amount_paid,
        paymentStatus: s.payment_status as
          | "pending"
          | "partial"
          | "paid"
          | "overdue",
      }));
    },
    enabled: !!siteId,
  });
}
