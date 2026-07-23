import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface CreateWorkCategoryData {
  name: string;
}

export function useCreateWorkCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ name }: CreateWorkCategoryData) => {
      const { data, error } = await supabase
        .from("work_categories")
        .insert([
          {
            name,
            created_by: user?.id ?? null,
            last_edited_by: user?.id ?? null,
            last_edited_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_categories"] });
    },
  });
}
