import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

const STAFF_QUERY_KEY = "staff" as const;

export function useStaff() {
  return useQuery({
    queryKey: [STAFF_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("full_name");

      if (error) throw error;
      return data as Tables<"staff">[];
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staff: TablesInsert<"staff">) => {
      const { data, error } = await supabase
        .from("staff")
        .insert(staff)
        .select()
        .single();

      if (error) throw error;
      return data as Tables<"staff">;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
      toast.success("Staff member added");
    },
    onError: (error) => {
      toast.error(`Failed to add staff: ${error.message}`);
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & TablesUpdate<"staff">) => {
      const { data, error } = await supabase
        .from("staff")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Tables<"staff">;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
      toast.success("Staff member updated");
    },
    onError: (error) => {
      toast.error(`Failed to update staff: ${error.message}`);
    },
  });
}
