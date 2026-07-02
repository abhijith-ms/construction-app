import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface CreateMaterialUsageInput {
  site_id: string;
  material_id: string;
  quantity: number;
  unit_price: number;
  usage_date: string;
  notes?: string | null;
}

export function useCreateMaterialUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMaterialUsageInput) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("material_usage")
        .insert([
          {
            ...input,
            last_edited_by: userData.user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.message.includes("row-level security")) {
          throw new Error("Permission denied: You can only log material usage for your assigned sites");
        }
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Material usage logged successfully");
      queryClient.invalidateQueries({ queryKey: ["materialUsage"] });
      queryClient.invalidateQueries({ queryKey: ["siteDashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to log material usage");
    },
  });
}
