import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Site = Database["public"]["Tables"]["sites"]["Row"];
type SiteExpense = Database["public"]["Tables"]["site_expenses"]["Row"];
type StockTransaction = Database["public"]["Tables"]["stock_transactions"]["Row"];

interface DashboardData {
  site: Site | null;
  labourCost: number;
  siteExpenses: number;
  supplierBills: number;
  materialUsageCost: number;
  totalReceived: number;
  workforce: {
    count: number;
    workers: Array<{
      labour_id: string;
      full_name: string;
      status: string | null;
    }>;
  };
  stockSummary: Array<{
    material_id: string;
    name: string;
    unit: string;
    quantity_on_hand: number;
  }>;
  recentExpenses: SiteExpense[];
  recentStockTransactions: Array<StockTransaction & { material: { name: string; unit: string } | null }>;
}

// Get Monday of current week (week starts Monday, ends Saturday per spec)
function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  return { monday, saturday };
}

export function useSiteDashboard(siteId: string | undefined) {
  return useQuery<DashboardData, Error>({
    queryKey: ["site-dashboard", siteId],
    queryFn: async () => {
      if (!siteId) {
        throw new Error("Site ID is required");
      }

      const { monday, saturday } = getWeekDates();
      const weekStartStr = monday.toISOString().split("T")[0];
      const weekEndStr = saturday.toISOString().split("T")[0];
      const todayStr = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

      // Fetch all data in parallel
      const [
        siteResult,
        labourCostResult,
        siteExpensesResult,
        supplierBillsResult,
        materialUsageResult,
        totalReceivedResult,
        workforceResult,
        stockSummaryResult,
        recentExpensesResult,
        recentStockTransactionsResult,
      ] = await Promise.all([
        // 1. Site details
        supabase
          .from("sites")
          .select("*")
          .eq("id", siteId)
          .single(),

        // 2. Labour cost (sum of net_payable for this site)
        supabase
          .from("labour_settlements")
          .select("net_payable")
          .eq("site_id", siteId),

        // 3. Site expenses (sum of amount for this site)
        supabase
          .from("site_expenses")
          .select("amount")
          .eq("site_id", siteId),

        // 4. Supplier bills via purchase_orders for this site
        supabase
          .from("bills")
          .select("amount, purchase_order: purchase_orders!inner(site_id)")
          .eq("purchase_orders.site_id", siteId),

        // 5. Material usage cost (sum of approved material_usage for this site)
        supabase
          .from("material_usage")
          .select("total_cost")
          .eq("site_id", siteId)
          .eq("state", "approved"),

        // 6. Total received (sum of pay_receipts for this site)
        supabase
          .from("pay_receipts")
          .select("amount")
          .eq("site_id", siteId),

        // 7. This week's workforce - attendance records for this week
        supabase
          .from("labour_attendance_secure")
          .select("date, labour_id, status, labour: labour(full_name)")
          .eq("site_id", siteId)
          .gte("date", weekStartStr)
          .lte("date", weekEndStr),

        // 8. Stock summary - materials with quantities for this site
        supabase
          .from("stock_levels")
          .select("quantity_on_hand, material: materials(id, name, unit)")
          .eq("site_id", siteId)
          .gt("quantity_on_hand", 0),

        // 9. Recent site expenses (last 7 days, limit 5)
        supabase
          .from("site_expenses")
          .select("*")
          .eq("site_id", siteId)
          .gte("date", sevenDaysAgoStr)
          .order("date", { ascending: false })
          .limit(5),

        // 10. Recent stock transactions (last 7 days, limit 5)
        supabase
          .from("stock_transactions")
          .select("*, material: materials(name, unit)")
          .eq("site_id", siteId)
          .gte("created_at", sevenDaysAgoStr)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Calculate aggregates
      const labourCost = (labourCostResult.data || []).reduce(
        (sum, s) => sum + (s.net_payable || 0),
        0
      );

      const siteExpenses = (siteExpensesResult.data || []).reduce(
        (sum, e) => sum + (e.amount || 0),
        0
      );

      const supplierBills = (supplierBillsResult.data || []).reduce(
        (sum, b) => sum + (b.amount || 0),
        0
      );

      const materialUsageCost = (materialUsageResult.data || []).reduce(
        (sum, m) => sum + (m.total_cost || 0),
        0
      );

      const totalReceived = (totalReceivedResult.data || []).reduce(
        (sum, r) => sum + (r.amount || 0),
        0
      );

      // Process workforce data - get unique labourers with today's status
      const workforceData = workforceResult.data || [];
      const labourerMap = new Map<string, { full_name: string; status: string | null }>();

      workforceData.forEach((record: any) => {
        const labourId = record.labour_id;
        const fullName = record.labour?.full_name || "Unknown";

        if (!labourerMap.has(labourId)) {
          labourerMap.set(labourId, { full_name: fullName, status: null });
        }

        // If this record is for today, capture the status
        if (record.date === todayStr) {
          labourerMap.set(labourId, { full_name: fullName, status: record.status });
        }
      });

      const workers = Array.from(labourerMap.entries()).map(([labour_id, data]) => ({
        labour_id,
        full_name: data.full_name,
        status: data.status,
      }));

      // Process stock summary - map to typed array
      const stockSummary = (stockSummaryResult.data || []).map((record: any) => ({
        material_id: record.material?.id || "",
        name: record.material?.name || "Unknown",
        unit: record.material?.unit || "",
        quantity_on_hand: record.quantity_on_hand || 0,
      }));

      // Process recent stock transactions
      const recentStockTransactions = (recentStockTransactionsResult.data || []).map((record: any) => ({
        ...record,
        material: record.material,
      }));

      return {
        site: siteResult.data as Site | null,
        labourCost,
        siteExpenses,
        supplierBills,
        materialUsageCost,
        totalReceived,
        workforce: {
          count: workers.length,
          workers,
        },
        stockSummary,
        recentExpenses: recentExpensesResult.data || [],
        recentStockTransactions,
      };
    },
    enabled: !!siteId,
  });
}
