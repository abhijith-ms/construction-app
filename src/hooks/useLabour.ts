import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import type { Tables } from "@/types/database";

export type Labour = Tables<"labour">;

export function useLabour() {
  return useQuery<Labour[]>({
    queryKey: ["labour"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labour")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}
