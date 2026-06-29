import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface RemoveSiteData {
  supervisorId: string;
  siteId: string;
}

export function useRemoveSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supervisorId, siteId }: RemoveSiteData) => {
      // Call the Postgres function which handles cascading delete atomically
      // Using any cast since the function is new and types may not be generated yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("remove_supervisor_site", {
        p_supervisor_id: supervisorId,
        p_site_id: siteId,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // Invalidate supervisors query to refresh assigned sites
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      toast.success("Site removed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove site");
    },
  });
}
