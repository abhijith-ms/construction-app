import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface DashboardStats {
  activeSitesCount: number;
  activeWorkersCount: number;
  pendingSettlementsCount: number;
  monthlyIncome: number;
}

/**
 * Hook to fetch dashboard statistics
 * - Active Sites count (from sites table where status = 'active')
 * - Active Workers count (from labour where is_active = true)
 * - This week's pending settlements count (from labour_settlements where payment_status IN ('pending', 'overdue'))
 * - This month's total income (from pay_receipts where date in current month)
 */
export function useDashboardStats() {
  const { profile, user } = useAuthStore();
  const isSupervisor = profile?.role === "supervisor";

  return useQuery({
    queryKey: ["dashboardStats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) {
        return {
          activeSitesCount: 0,
          activeWorkersCount: 0,
          pendingSettlementsCount: 0,
          monthlyIncome: 0,
        };
      }

      // Get current date info
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const monthStartStr = format(monthStart, "yyyy-MM-dd");
      const monthEndStr = format(monthEnd, "yyyy-MM-dd");

      // Build promises for parallel fetching
      const promises: Promise<unknown>[] = [];

      // 1. Active Sites count
      // For supervisors, only count their assigned sites
      const sitesPromise = (async () => {
        if (isSupervisor) {
          // Supervisor: get sites via supervisor_site_assignments
          const { data: siteAccess, error } = await supabase
            .from("supervisor_site_assignments")
            .select("site_id")
            .eq("supervisor_id", user.id);

          if (error) throw error;
          if (!siteAccess?.length) return 0;

          const siteIds = siteAccess.map((a) => a.site_id);
          const { count, error: countError } = await supabase
            .from("sites")
            .select("*", { count: "exact", head: true })
            .in("id", siteIds)
            .eq("status", "active");

          if (countError) throw countError;
          return count || 0;
        } else {
          // Admin/Office Manager: all active sites
          const { count, error } = await supabase
            .from("sites")
            .select("*", { count: "exact", head: true })
            .eq("status", "active");

          if (error) throw error;
          return count || 0;
        }
      })();
      promises.push(sitesPromise);

      // 2. Active Workers count
      const workersPromise = (async () => {
        const { count, error } = await supabase
          .from("labour")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        if (error) throw error;
        return count || 0;
      })();
      promises.push(workersPromise);

      // 3. This week's pending settlements count
      const settlementsPromise = (async () => {
        const { count, error } = await supabase
          .from("labour_settlements")
          .select("*", { count: "exact", head: true })
          .in("payment_status", ["pending", "overdue"]);

        if (error) throw error;
        return count || 0;
      })();
      promises.push(settlementsPromise);

      // 4. This month's total income
      const incomePromise = (async () => {
        const { data, error } = await supabase
          .from("pay_receipts")
          .select("amount")
          .gte("date", monthStartStr)
          .lte("date", monthEndStr);

        if (error) throw error;
        return data?.reduce((sum, receipt) => sum + (receipt.amount || 0), 0) || 0;
      })();
      promises.push(incomePromise);

      // Execute all queries in parallel
      const [activeSitesCount, activeWorkersCount, pendingSettlementsCount, monthlyIncome] =
        await Promise.all(promises);

      return {
        activeSitesCount: activeSitesCount as number,
        activeWorkersCount: activeWorkersCount as number,
        pendingSettlementsCount: pendingSettlementsCount as number,
        monthlyIncome: monthlyIncome as number,
      };
    },
    enabled: !!user?.id,
  });
}
