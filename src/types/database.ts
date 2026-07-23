[0m[31mWARN: config section [inbucket] is deprecated. Please use [local_smtp] instead.[0m
Connecting to db 5432
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bills: {
        Row: {
          amount: number
          bill_date: string
          bill_number: string | null
          created_at: string
          id: string
          last_edited_at: string
          last_edited_by: string
          notes: string | null
          purchase_order_id: string
        }
        Insert: {
          amount: number
          bill_date: string
          bill_number?: string | null
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by: string
          notes?: string | null
          purchase_order_id: string
        }
        Update: {
          amount?: number
          bill_date?: string
          bill_number?: string | null
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by?: string
          notes?: string | null
          purchase_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      labour: {
        Row: {
          created_at: string
          default_daily_rate: number
          default_work_category: string
          full_name: string
          half_day_rate: number | null
          id: string
          is_active: boolean
          overtime_rate: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_daily_rate: number
          default_work_category: string
          full_name: string
          half_day_rate?: number | null
          id?: string
          is_active?: boolean
          overtime_rate?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_daily_rate?: number
          default_work_category?: string
          full_name?: string
          half_day_rate?: number | null
          id?: string
          is_active?: boolean
          overtime_rate?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      labour_advances: {
        Row: {
          amount: number
          created_at: string
          date_given: string
          id: string
          labour_id: string
          last_edited_at: string
          last_edited_by: string
          notes: string | null
          settlement_id: string | null
          site_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date_given: string
          id?: string
          labour_id: string
          last_edited_at?: string
          last_edited_by: string
          notes?: string | null
          settlement_id?: string | null
          site_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date_given?: string
          id?: string
          labour_id?: string
          last_edited_at?: string
          last_edited_by?: string
          notes?: string | null
          settlement_id?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labour_advances_labour_id_fkey"
            columns: ["labour_id"]
            isOneToOne: false
            referencedRelation: "labour"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_advances_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_advances_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "labour_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_advances_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      labour_attendance: {
        Row: {
          date: string
          id: string
          labour_id: string
          last_edited_at: string | null
          last_edited_by: string | null
          overtime_hours: number | null
          rate_applied: number | null
          site_id: string
          status: string
          work_category: string | null
        }
        Insert: {
          date: string
          id?: string
          labour_id: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          overtime_hours?: number | null
          rate_applied?: number | null
          site_id: string
          status: string
          work_category?: string | null
        }
        Update: {
          date?: string
          id?: string
          labour_id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          overtime_hours?: number | null
          rate_applied?: number | null
          site_id?: string
          status?: string
          work_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labour_attendance_labour_id_fkey"
            columns: ["labour_id"]
            isOneToOne: false
            referencedRelation: "labour"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_attendance_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      labour_settlements: {
        Row: {
          amount_paid: number
          carried_over_due: number
          created_at: string
          gross_wages: number
          id: string
          labour_id: string
          last_edited_at: string
          last_edited_by: string
          net_payable: number
          paid_at: string | null
          payment_mode: string | null
          payment_reference: string | null
          payment_status: string
          site_id: string | null
          total_advances: number
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          amount_paid?: number
          carried_over_due?: number
          created_at?: string
          gross_wages: number
          id?: string
          labour_id: string
          last_edited_at?: string
          last_edited_by: string
          net_payable: number
          paid_at?: string | null
          payment_mode?: string | null
          payment_reference?: string | null
          payment_status?: string
          site_id?: string | null
          total_advances?: number
          week_end_date: string
          week_start_date: string
        }
        Update: {
          amount_paid?: number
          carried_over_due?: number
          created_at?: string
          gross_wages?: number
          id?: string
          labour_id?: string
          last_edited_at?: string
          last_edited_by?: string
          net_payable?: number
          paid_at?: string | null
          payment_mode?: string | null
          payment_reference?: string | null
          payment_status?: string
          site_id?: string | null
          total_advances?: number
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "labour_settlements_labour_id_fkey"
            columns: ["labour_id"]
            isOneToOne: false
            referencedRelation: "labour"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_settlements_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_settlements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      labour_site_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          daily_rate: number
          end_date: string | null
          id: string
          labour_id: string
          notes: string | null
          site_id: string
          start_date: string
          task_category: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          daily_rate: number
          end_date?: string | null
          id?: string
          labour_id: string
          notes?: string | null
          site_id: string
          start_date: string
          task_category: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          daily_rate?: number
          end_date?: string | null
          id?: string
          labour_id?: string
          notes?: string | null
          site_id?: string
          start_date?: string
          task_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "labour_site_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_site_assignments_labour_id_fkey"
            columns: ["labour_id"]
            isOneToOne: false
            referencedRelation: "labour"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_site_assignments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      material_usage: {
        Row: {
          created_at: string
          id: string
          last_edited_at: string
          last_edited_by: string
          material_id: string
          notes: string | null
          quantity: number
          site_id: string
          state: string
          total_cost: number | null
          unit_price: number
          usage_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by: string
          material_id: string
          notes?: string | null
          quantity: number
          site_id: string
          state?: string
          total_cost?: number | null
          unit_price: number
          usage_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by?: string
          material_id?: string
          notes?: string | null
          quantity?: number
          site_id?: string
          state?: string
          total_cost?: number | null
          unit_price?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_usage_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_usage_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_usage_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          unit?: string
        }
        Relationships: []
      }
      office_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          last_edited_at: string
          last_edited_by: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          last_edited_at?: string
          last_edited_by: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          last_edited_at?: string
          last_edited_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_expenses_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_receipts: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          last_edited_at: string
          last_edited_by: string
          notes: string | null
          payment_mode: string
          site_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          last_edited_at?: string
          last_edited_by: string
          notes?: string | null
          payment_mode: string
          site_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          last_edited_at?: string
          last_edited_by?: string
          notes?: string | null
          payment_mode?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_receipts_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_receipts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          order_date: string
          site_id: string
          status: string
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          order_date?: string
          site_id: string
          status?: string
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          order_date?: string
          site_id?: string
          status?: string
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      site_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          last_edited_at: string
          last_edited_by: string
          site_id: string
          work_type: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          last_edited_at?: string
          last_edited_by: string
          site_id: string
          work_type?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          last_edited_at?: string
          last_edited_by?: string
          site_id?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_expenses_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_expenses_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_labour_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          is_active: boolean
          labour_id: string
          last_edited_at: string
          last_edited_by: string
          site_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          is_active?: boolean
          labour_id: string
          last_edited_at?: string
          last_edited_by: string
          site_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          is_active?: boolean
          labour_id?: string
          last_edited_at?: string
          last_edited_by?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_labour_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_labour_assignments_labour_id_fkey"
            columns: ["labour_id"]
            isOneToOne: false
            referencedRelation: "labour"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_labour_assignments_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_labour_assignments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_phases: {
        Row: {
          created_at: string
          id: string
          last_edited_at: string
          last_edited_by: string
          percent_complete: number
          phase: string
          site_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by: string
          percent_complete?: number
          phase: string
          site_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by?: string
          percent_complete?: number
          phase?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_phases_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_phases_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          half_day_multiplier: number
          id: string
          last_edited_at: string
          last_edited_by: string
          site_id: string
        }
        Insert: {
          half_day_multiplier?: number
          id?: string
          last_edited_at?: string
          last_edited_by: string
          site_id: string
        }
        Update: {
          half_day_multiplier?: number
          id?: string
          last_edited_at?: string
          last_edited_by?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          budget: number | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          monthly_salary: number
          profile_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          monthly_salary: number
          profile_id?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          monthly_salary?: number
          profile_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          date: string
          id: string
          last_edited_at: string | null
          last_edited_by: string | null
          staff_id: string
          status: string
        }
        Insert: {
          date: string
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          staff_id: string
          status: string
        }
        Update: {
          date?: string
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          id: string
          material_id: string
          quantity_on_hand: number
          site_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          material_id: string
          quantity_on_hand?: number
          site_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          material_id?: string
          quantity_on_hand?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string
          id: string
          last_edited_at: string
          last_edited_by: string
          material_id: string
          quantity: number
          reference_note: string | null
          site_id: string
          transaction_type: string
          transfer_site_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by: string
          material_id: string
          quantity: number
          reference_note?: string | null
          site_id: string
          transaction_type: string
          transfer_site_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by?: string
          material_id?: string
          quantity?: number
          reference_note?: string | null
          site_id?: string
          transaction_type?: string
          transfer_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_transfer_site_id_fkey"
            columns: ["transfer_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_site_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          site_id: string
          supervisor_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          site_id: string
          supervisor_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          site_id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_site_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_site_assignments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_site_assignments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_wage_permissions: {
        Row: {
          can_view_set_wages: boolean
          id: string
          last_edited_at: string
          last_edited_by: string
          site_id: string
          supervisor_id: string
        }
        Insert: {
          can_view_set_wages?: boolean
          id?: string
          last_edited_at?: string
          last_edited_by: string
          site_id: string
          supervisor_id: string
        }
        Update: {
          can_view_set_wages?: boolean
          id?: string
          last_edited_at?: string
          last_edited_by?: string
          site_id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_wage_permissions_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_wage_permissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_wage_permissions_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          id: string
          last_edited_at: string
          last_edited_by: string
          notes: string | null
          payment_date: string
          payment_mode: string
          supplier_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by: string
          notes?: string | null
          payment_date: string
          payment_mode: string
          supplier_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          id?: string
          last_edited_at?: string
          last_edited_by?: string
          notes?: string | null
          payment_date?: string
          payment_mode?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_balances"
            referencedColumns: ["supplier_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          materials_supplied: string | null
          name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          materials_supplied?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          materials_supplied?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      work_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_edited_at: string
          last_edited_by: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_edited_at?: string
          last_edited_by?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_edited_at?: string
          last_edited_by?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_categories_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      labour_attendance_secure: {
        Row: {
          date: string | null
          id: string | null
          labour_id: string | null
          last_edited_at: string | null
          last_edited_by: string | null
          overtime_hours: number | null
          rate_applied: number | null
          site_id: string | null
          status: string | null
          work_category: string | null
        }
        Insert: {
          date?: string | null
          id?: string | null
          labour_id?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          overtime_hours?: number | null
          rate_applied?: never
          site_id?: string | null
          status?: string | null
          work_category?: string | null
        }
        Update: {
          date?: string | null
          id?: string | null
          labour_id?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          overtime_hours?: number | null
          rate_applied?: never
          site_id?: string | null
          status?: string | null
          work_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labour_attendance_labour_id_fkey"
            columns: ["labour_id"]
            isOneToOne: false
            referencedRelation: "labour"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_attendance_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_balances: {
        Row: {
          balance_owed: number | null
          contact_email: string | null
          contact_phone: string | null
          is_active: boolean | null
          materials_supplied: string | null
          name: string | null
          supplier_id: string | null
          total_billed: number | null
          total_paid: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_material_usage: {
        Args: { p_usage_id: string }
        Returns: {
          created_at: string
          id: string
          last_edited_at: string
          last_edited_by: string
          material_id: string
          notes: string | null
          quantity: number
          site_id: string
          state: string
          total_cost: number | null
          unit_price: number
          usage_date: string
        }
        SetofOptions: {
          from: "*"
          to: "material_usage"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_weekly_settlement: {
        Args: {
          p_labour_id: string
          p_last_edited_by: string
          p_week_start: string
        }
        Returns: {
          amount_paid: number
          carried_over_due: number
          created_at: string
          gross_wages: number
          id: string
          labour_id: string
          last_edited_at: string
          last_edited_by: string
          net_payable: number
          paid_at: string | null
          payment_mode: string | null
          payment_reference: string | null
          payment_status: string
          site_id: string | null
          total_advances: number
          week_end_date: string
          week_start_date: string
        }
        SetofOptions: {
          from: "*"
          to: "labour_settlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_attendance_multiplier: {
        Args: {
          p_date: string
          p_labour_id: string
          p_site_id: string
          p_status: string
        }
        Returns: number
      }
      get_labour_active_site_count: {
        Args: { p_labour_id: string }
        Returns: number
      }
      get_my_role: { Args: never; Returns: string }
      get_site_pnl: {
        Args: { p_from: string; p_site_id: string; p_to: string }
        Returns: {
          labour_cost: number
          material_usage_cost: number
          net_profit: number
          site_expense_cost: number
          site_id: string
          site_name: string
          supplier_bill_cost: number
          total_cost: number
          total_income: number
        }[]
      }
      has_wage_visibility: { Args: { p_site_id: string }; Returns: boolean }
      is_supervisor_for_site: { Args: { p_site_id: string }; Returns: boolean }
      mark_settlement_paid:
        | {
            Args: {
              p_amount_paid: number
              p_marked_by: string
              p_settlement_id: string
            }
            Returns: {
              amount_paid: number
              carried_over_due: number
              created_at: string
              gross_wages: number
              id: string
              labour_id: string
              last_edited_at: string
              last_edited_by: string
              net_payable: number
              paid_at: string | null
              payment_mode: string | null
              payment_reference: string | null
              payment_status: string
              site_id: string | null
              total_advances: number
              week_end_date: string
              week_start_date: string
            }
            SetofOptions: {
              from: "*"
              to: "labour_settlements"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_amount_paid: number
              p_marked_by: string
              p_payment_mode?: string
              p_payment_reference?: string
              p_settlement_id: string
            }
            Returns: {
              amount_paid: number
              carried_over_due: number
              created_at: string
              gross_wages: number
              id: string
              labour_id: string
              last_edited_at: string
              last_edited_by: string
              net_payable: number
              paid_at: string | null
              payment_mode: string | null
              payment_reference: string | null
              payment_status: string
              site_id: string | null
              total_advances: number
              week_end_date: string
              week_start_date: string
            }
            SetofOptions: {
              from: "*"
              to: "labour_settlements"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      remove_supervisor_site: {
        Args: { p_site_id: string; p_supervisor_id: string }
        Returns: undefined
      }
      transfer_stock_between_sites: {
        Args: {
          p_edited_by?: string
          p_from_site_id: string
          p_material_id: string
          p_quantity: number
          p_reference_note?: string
          p_to_site_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

