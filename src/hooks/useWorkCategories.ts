import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type WorkCategory = Tables<"work_categories">;

export function useWorkCategories() {
  return useQuery({
    queryKey: ["work_categories"],
    queryFn: async (): Promise<WorkCategory[]> => {
      const { data, error } = await supabase
        .from("work_categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
  });
}

/**
 * Options for a work-category <select>: active categories, plus the
 * currently-selected value even if it's since been retired (is_active =
 * false) or otherwise missing — so a historical attendance/labour record
 * still displays its recorded category instead of silently blanking out.
 */
export function getCategoryOptions(
  categories: WorkCategory[] | undefined,
  currentValue?: string | null
): { name: string; retired: boolean }[] {
  const active = (categories || []).filter((c) => c.is_active);
  const options = active.map((c) => ({ name: c.name, retired: false }));

  if (currentValue && !active.some((c) => c.name === currentValue)) {
    options.push({ name: currentValue, retired: true });
  }

  return options;
}
