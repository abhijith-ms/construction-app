import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import type { Tables } from "@/types/database";

// Base types from database
export type SiteExpense = Tables<"site_expenses">;
export type OfficeExpense = Tables<"office_expenses">;

// Form input types (without DB-managed fields)
export interface SiteExpenseFormData {
  site_id: string;
  category: string;
  amount: number;
  date: string;
  description?: string | null;
  work_type?: string | null;
}

export interface OfficeExpenseFormData {
  category: string;
  amount: number;
  date: string;
  description?: string | null;
}

// Update params
interface SiteExpenseUpdateParams extends SiteExpenseFormData {
  id: string;
}

interface OfficeExpenseUpdateParams extends OfficeExpenseFormData {
  id: string;
}

// Site Expense Categories
export const SITE_EXPENSE_CATEGORIES = [
  { value: "material", label: "Material" },
  { value: "transport", label: "Transport" },
  { value: "food", label: "Food" },
  { value: "general", label: "General" },
] as const;

// Office Expense Categories
export const OFFICE_EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "staff_salary", label: "Staff Salary" },
  { value: "transport", label: "Transport" },
  { value: "general", label: "General" },
] as const;

// Fetch site expenses with optional site filter
export function useSiteExpenses(siteId?: string) {
  return useQuery({
    queryKey: ["site_expenses", siteId],
    queryFn: async () => {
      let query = supabase
        .from("site_expenses")
        .select("*, site:sites(name)")
        .order("date", { ascending: false });

      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
}

// Fetch office expenses (no filters - simple list)
export function useOfficeExpenses() {
  return useQuery({
    queryKey: ["office_expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("office_expenses")
        .select("*, last_editor:profiles(full_name)")
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Create site expense
export function useCreateSiteExpense() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (expense: SiteExpenseFormData) => {
      const { data, error } = await supabase
        .from("site_expenses")
        .insert({
          site_id: expense.site_id,
          category: expense.category,
          amount: expense.amount,
          date: expense.date,
          description: expense.description || null,
          work_type: expense.work_type || null,
          last_edited_by: profile?.id || "",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_expenses"] });
      toast.success("Site expense added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add site expense", {
        description: error.message,
      });
    },
  });
}

// Create office expense
export function useCreateOfficeExpense() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (expense: OfficeExpenseFormData) => {
      const { data, error } = await supabase
        .from("office_expenses")
        .insert({
          category: expense.category,
          amount: expense.amount,
          date: expense.date,
          description: expense.description || null,
          last_edited_by: profile?.id || "",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office_expenses"] });
      toast.success("Office expense added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add office expense", {
        description: error.message,
      });
    },
  });
}

// Update site expense
export function useUpdateSiteExpense() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (params: SiteExpenseUpdateParams) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("site_expenses")
        .update({
          site_id: updates.site_id,
          category: updates.category,
          amount: updates.amount,
          date: updates.date,
          description: updates.description || null,
          work_type: updates.work_type || null,
          last_edited_by: profile?.id || "",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_expenses"] });
      toast.success("Site expense updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update site expense", {
        description: error.message,
      });
    },
  });
}

// Update office expense
export function useUpdateOfficeExpense() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();

  return useMutation({
    mutationFn: async (params: OfficeExpenseUpdateParams) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("office_expenses")
        .update({
          category: updates.category,
          amount: updates.amount,
          date: updates.date,
          description: updates.description || null,
          last_edited_by: profile?.id || "",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office_expenses"] });
      toast.success("Office expense updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update office expense", {
        description: error.message,
      });
    },
  });
}

// Delete site expense
export function useDeleteSiteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_expenses").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_expenses"] });
      toast.success("Site expense deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete site expense", {
        description: error.message,
      });
    },
  });
}

// Delete office expense
export function useDeleteOfficeExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("office_expenses").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office_expenses"] });
      toast.success("Office expense deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete office expense", {
        description: error.message,
      });
    },
  });
}
