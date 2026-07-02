import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useAssignedSites } from "./useAssignedSites";

export interface MaterialUsageRecord {
  id: string;
  site_id: string;
  material_id: string;
  quantity: number;
  unit_price: number;
  total_cost: number;
  usage_date: string;
  notes: string | null;
  state: "pending" | "approved";
  last_edited_by: string;
  last_edited_at: string;
  created_at: string;
  site: {
    id: string;
    name: string;
  } | null;
  material: {
    id: string;
    name: string;
    unit: string;
  } | null;
  editor: {
    id: string;
    full_name: string | null;
  } | null;
}

interface UseMaterialUsageOptions {
  siteId?: string | null;
}

export function useMaterialUsage(options: UseMaterialUsageOptions = {}) {
  const { siteId } = options;
  const { profile } = useAuthStore();
  const { data: assignedSites } = useAssignedSites();

  return useQuery<MaterialUsageRecord[], Error>({
    queryKey: ["materialUsage", siteId],
    queryFn: async () => {
      let query = supabase
        .from("material_usage")
        .select(`
          *,
          site: sites(id, name),
          material: materials(id, name, unit),
          editor: profiles(id, full_name)
        `)
        .order("usage_date", { ascending: false })
        .order("created_at", { ascending: false });

      // Filter by site if specified
      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      // For supervisors, only show their assigned sites
      if (profile?.role === "supervisor" && assignedSites) {
        const siteIds = assignedSites.map((s) => s.id);
        if (siteIds.length > 0) {
          query = query.in("site_id", siteIds);
        } else {
          // No assigned sites means no records visible
          return [];
        }
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as MaterialUsageRecord[];
    },
    enabled: !!profile && (profile.role !== "supervisor" || !!assignedSites),
  });
}
