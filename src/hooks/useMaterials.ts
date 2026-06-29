import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface Material {
  id: string;
  name: string;
  unit: string;
  is_active: boolean;
  created_at: string;
}

export function useMaterials(includeInactive = false) {
  return useQuery<Material[], Error>({
    queryKey: ["materials", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("materials").select("*").order("name");

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return (data as Material[]) ?? [];
    },
  });
}
