import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface UpdateWorkCategoryData {
  id: string;
  isActive: boolean;
}

/**
 * Toggles is_active only. name is immutable by design (see migration
 * 20260724080001) — retiring + creating a new category is the supported
 * path for a "rename", so this hook deliberately has no way to change name.
 */
export function useUpdateWorkCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, isActive }: UpdateWorkCategoryData) => {
      const { error } = await supabase
        .from("work_categories")
        .update({
          is_active: isActive,
          last_edited_by: user?.id ?? null,
          last_edited_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_categories"] });
    },
  });
}
