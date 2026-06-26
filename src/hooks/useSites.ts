import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

type Site = Tables<"sites">;

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async (): Promise<Site[]> => {
      const { data, error } = await supabase
        .from("sites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
  });
}