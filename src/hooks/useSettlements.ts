import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Settlement = Tables<'labour_settlements'>;

interface WeeklyRange {
  weekStart: string;
  weekEnd: string;
}

function getWeekRange(date: Date): WeeklyRange {
  const day = date.getDay(); // 0=Sunday, 1=Monday...
  const diff = day === 0 ? -6 : 1 - day; // if Sunday, go back 6 days; otherwise go to Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  return {
    weekStart: format(monday, 'yyyy-MM-dd'),
    weekEnd: format(saturday, 'yyyy-MM-dd'),
  };
}

export function useSettlements(weekDate: Date = new Date()) {
  const { weekStart } = getWeekRange(weekDate);

  return useQuery({
    queryKey: ['settlements', weekStart],
    queryFn: async (): Promise<Settlement[]> => {
      const { data, error } = await supabase
        .from('labour_settlements')
        .select(`
          *,
          labour:labour_id (
            id,
            full_name,
            default_work_category
          )
        `)
        .eq('week_start_date', weekStart)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Settlement[];
    },
  });
}

export function useLabourSettlement(labourId: string, weekDate: Date = new Date()) {
  const { weekStart } = getWeekRange(weekDate);

  return useQuery({
    queryKey: ['settlements', labourId, weekStart],
    queryFn: async (): Promise<Settlement | null> => {
      const { data, error } = await supabase
        .from('labour_settlements')
        .select('*')
        .eq('labour_id', labourId)
        .eq('week_start_date', weekStart)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Settlement | null;
    },
    enabled: !!labourId,
  });
}
