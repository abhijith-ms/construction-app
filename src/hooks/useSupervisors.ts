import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;
type Site = Tables<"sites">;

export interface SupervisorWithAssignments extends Profile {
  assignedSites: Site[];
  wagePermissions: { site_id: string; can_view_set_wages: boolean }[];
}

/**
 * Hook to fetch all supervisors with their site assignments and wage permissions
 */
export function useSupervisors() {
  return useQuery({
    queryKey: ["supervisors"],
    queryFn: async (): Promise<SupervisorWithAssignments[]> => {
      // Fetch supervisors
      const { data: supervisors, error: supError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "supervisor")
        .eq("is_active", true)
        .order("full_name");

      if (supError) throw supError;

      // Fetch all site assignments
      const { data: assignments, error: assignError } = await supabase
        .from("supervisor_site_assignments")
        .select("*, sites:site_id(*)")
        .in(
          "supervisor_id",
          supervisors?.map((s) => s.id) || []
        );

      if (assignError) throw assignError;

      // Fetch all wage permissions
      const { data: permissions, error: permError } = await supabase
        .from("supervisor_wage_permissions")
        .select("*")
        .in(
          "supervisor_id",
          supervisors?.map((s) => s.id) || []
        );

      if (permError) throw permError;

      // Combine data
      const supervisorsWithData: SupervisorWithAssignments[] =
        supervisors?.map((supervisor) => {
          const supervisorAssignments =
            assignments?.filter((a) => a.supervisor_id === supervisor.id) || [];
          const supervisorPermissions =
            permissions?.filter((p) => p.supervisor_id === supervisor.id) || [];

          return {
            ...supervisor,
            assignedSites: supervisorAssignments.map(
              (a) => a.sites as unknown as Site
            ),
            wagePermissions: supervisorPermissions.map((p) => ({
              site_id: p.site_id,
              can_view_set_wages: p.can_view_set_wages,
            })),
          };
        }) || [];

      return supervisorsWithData;
    },
  });
}