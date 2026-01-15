export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      auth_failures: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          email: string | null
          failure_type: string
          first_attempt_at: string
          id: string
          ip_address: string
          last_attempt_at: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          email?: string | null
          failure_type: string
          first_attempt_at?: string
          id?: string
          ip_address: string
          last_attempt_at?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          email?: string | null
          failure_type?: string
          first_attempt_at?: string
          id?: string
          ip_address?: string
          last_attempt_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          business_use_percent: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          description: string
          gig_id: string | null
          id: string
          irs_schedule_c_line: string | null
          meals_percent_allowed: number | null
          notes: string | null
          receipt_url: string | null
          recurring_expense_id: string | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          business_use_percent?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date: string
          description: string
          gig_id?: string | null
          id?: string
          irs_schedule_c_line?: string | null
          meals_percent_allowed?: number | null
          notes?: string | null
          receipt_url?: string | null
          recurring_expense_id?: string | null
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          business_use_percent?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string
          gig_id?: string | null
          id?: string
          irs_schedule_c_line?: string | null
          meals_percent_allowed?: number | null
          notes?: string | null
          receipt_url?: string | null
          recurring_expense_id?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          date: string
          fees: number
          gross_amount: number
          id: string
          invoice_link: string | null
          location: string | null
          net_amount: number
          notes: string | null
          other_income: number | null
          paid: boolean | null
          payer_id: string
          payment_method: string | null
          per_diem: number | null
          state: string | null
          state_code: string | null
          taxes_withheld: boolean | null
          tips: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          date: string
          fees?: number
          gross_amount?: number
          id?: string
          invoice_link?: string | null
          location?: string | null
          net_amount?: number
          notes?: string | null
          other_income?: number | null
          paid?: boolean | null
          payer_id: string
          payment_method?: string | null
          per_diem?: number | null
          state?: string | null
          state_code?: string | null
          taxes_withheld?: boolean | null
          tips?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          date?: string
          fees?: number
          gross_amount?: number
          id?: string
          invoice_link?: string | null
          location?: string | null
          net_amount?: number
          notes?: string | null
          other_income?: number | null
          paid?: boolean | null
          payer_id?: string
          payment_method?: string | null
          per_diem?: number | null
          state?: string | null
          state_code?: string | null
          taxes_withheld?: boolean | null
          tips?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gigs_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          rate: number
          sort_order: number
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          rate: number
          sort_order?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          rate?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          accepted_payment_methods: Json | null
          address: string | null
          business_name: string
          color_scheme: string
          created_at: string
          default_currency: string
          default_payment_terms: string | null
          default_tax_rate: number | null
          email: string
          font_style: string
          id: string
          invoice_prefix: string
          layout_style: string
          logo_url: string | null
          next_invoice_number: number
          phone: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          accepted_payment_methods?: Json | null
          address?: string | null
          business_name: string
          color_scheme?: string
          created_at?: string
          default_currency?: string
          default_payment_terms?: string | null
          default_tax_rate?: number | null
          email: string
          font_style?: string
          id?: string
          invoice_prefix?: string
          layout_style?: string
          logo_url?: string | null
          next_invoice_number?: number
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          accepted_payment_methods?: Json | null
          address?: string | null
          business_name?: string
          color_scheme?: string
          created_at?: string
          default_currency?: string
          default_payment_terms?: string | null
          default_tax_rate?: number | null
          email?: string
          font_style?: string
          id?: string
          invoice_prefix?: string
          layout_style?: string
          logo_url?: string | null
          next_invoice_number?: number
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          accepted_payment_methods: Json | null
          client_address: string | null
          client_company: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          created_at: string
          currency: string
          discount_amount: number | null
          due_date: string
          gig_id: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          payment_terms: string | null
          private_notes: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          accepted_payment_methods?: Json | null
          client_address?: string | null
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          currency?: string
          discount_amount?: number | null
          due_date: string
          gig_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          private_notes?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          accepted_payment_methods?: Json | null
          client_address?: string | null
          client_company?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          currency?: string
          discount_amount?: number | null
          due_date?: string
          gig_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          payment_terms?: string | null
          private_notes?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mileage: {
        Row: {
          created_at: string
          date: string
          end_location: string
          gig_id: string | null
          id: string
          miles: number
          notes: string | null
          purpose: string
          start_location: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_location: string
          gig_id?: string | null
          id?: string
          miles: number
          notes?: string | null
          purpose: string
          start_location: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_location?: string
          gig_id?: string | null
          id?: string
          miles?: number
          notes?: string | null
          purpose?: string
          start_location?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      payers: {
        Row: {
          contact_email: string | null
          created_at: string
          expect_1099: boolean | null
          id: string
          name: string
          notes: string | null
          payer_type: Database["public"]["Enums"]["payer_type"]
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          expect_1099?: boolean | null
          id?: string
          name: string
          notes?: string | null
          payer_type: Database["public"]["Enums"]["payer_type"]
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          expect_1099?: boolean | null
          id?: string
          name?: string
          notes?: string | null
          payer_type?: Database["public"]["Enums"]["payer_type"]
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_structure: string
          created_at: string | null
          email: string | null
          filing_status: string | null
          full_name: string | null
          home_address: string | null
          home_address_full: string | null
          home_address_lat: number | null
          home_address_lng: number | null
          home_address_place_id: string | null
          id: string
          onboarding_complete: boolean | null
          plan: Database["public"]["Enums"]["user_plan"] | null
          state_code: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_structure?: string
          created_at?: string | null
          email?: string | null
          filing_status?: string | null
          full_name?: string | null
          home_address?: string | null
          home_address_full?: string | null
          home_address_lat?: number | null
          home_address_lng?: number | null
          home_address_place_id?: string | null
          id: string
          onboarding_complete?: boolean | null
          plan?: Database["public"]["Enums"]["user_plan"] | null
          state_code?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_structure?: string
          created_at?: string | null
          email?: string | null
          filing_status?: string | null
          full_name?: string | null
          home_address?: string | null
          home_address_full?: string | null
          home_address_lat?: number | null
          home_address_lng?: number | null
          home_address_place_id?: string | null
          id?: string
          onboarding_complete?: boolean | null
          plan?: Database["public"]["Enums"]["user_plan"] | null
          state_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_active: boolean | null
          month_of_year: number | null
          name: string
          next_due_date: string | null
          notes: string | null
          updated_at: string | null
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          id?: string
          is_active?: boolean | null
          month_of_year?: number | null
          name: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          month_of_year?: number | null
          name?: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          vendor?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      state_tax_rates: {
        Row: {
          brackets: Json | null
          created_at: string | null
          effective_year: number
          flat_rate: number | null
          id: string
          notes: string | null
          state_code: string
          type: string
          updated_at: string | null
        }
        Insert: {
          brackets?: Json | null
          created_at?: string | null
          effective_year: number
          flat_rate?: number | null
          id?: string
          notes?: string | null
          state_code: string
          type: string
          updated_at?: string | null
        }
        Update: {
          brackets?: Json | null
          created_at?: string | null
          effective_year?: number
          flat_rate?: number | null
          id?: string
          notes?: string | null
          state_code?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subcontractors: {
        Row: {
          id: string
          user_id: string
          name: string
          role: string | null
          email: string | null
          phone: string | null
          address: string | null
          tax_id_type: string | null
          tax_id_last4: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          role?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          tax_id_type?: string | null
          tax_id_last4?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          role?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          tax_id_type?: string | null
          tax_id_last4?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_subcontractor_payments: {
        Row: {
          id: string
          user_id: string
          gig_id: string
          subcontractor_id: string
          amount: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gig_id: string
          subcontractor_id: string
          amount: number
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gig_id?: string
          subcontractor_id?: string
          amount?: number
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_subcontractor_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_subcontractor_payments_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_subcontractor_payments_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_name: string | null
          device_token_hash: string
          expires_at: string
          id: string
          ip_hash: string | null
          last_used_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          device_token_hash: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          last_used_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          device_token_hash?: string
          expires_at?: string
          id?: string
          ip_hash?: string | null
          last_used_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_step: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tax_profile: {
        Row: {
          county: string | null
          created_at: string | null
          deduction_method: string
          filing_status: string
          itemized_amount: number | null
          nyc_resident: boolean | null
          se_income: boolean
          state: string
          tax_year: number
          updated_at: string | null
          user_id: string
          yonkers_resident: boolean | null
        }
        Insert: {
          county?: string | null
          created_at?: string | null
          deduction_method?: string
          filing_status: string
          itemized_amount?: number | null
          nyc_resident?: boolean | null
          se_income?: boolean
          state: string
          tax_year?: number
          updated_at?: string | null
          user_id: string
          yonkers_resident?: boolean | null
        }
        Update: {
          county?: string | null
          created_at?: string | null
          deduction_method?: string
          filing_status?: string
          itemized_amount?: number | null
          nyc_resident?: boolean | null
          se_income?: boolean
          state?: string
          tax_year?: number
          updated_at?: string | null
          user_id?: string
          yonkers_resident?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      v_expenses_export: {
        Row: {
          amount: number | null
          category: Database["public"]["Enums"]["expense_category"] | null
          date: string | null
          description: string | null
          notes: string | null
          receipt_url: string | null
          recurring_expense_id: string | null
          user_id: string | null
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          category?: Database["public"]["Enums"]["expense_category"] | null
          date?: string | null
          description?: string | null
          notes?: string | null
          receipt_url?: string | null
          recurring_expense_id?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          category?: Database["public"]["Enums"]["expense_category"] | null
          date?: string | null
          description?: string | null
          notes?: string | null
          receipt_url?: string | null
          recurring_expense_id?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gigs_export: {
        Row: {
          city_state: string | null
          date: string | null
          fees: number | null
          gross_amount: number | null
          net_amount: number | null
          notes: string | null
          other_income: number | null
          payer: string | null
          per_diem: number | null
          tips: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_map_us_states: {
        Row: {
          gigs_count: number | null
          last_gig_date: string | null
          state_code: string | null
          top_payers: string[] | null
          total_income: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_map_world: {
        Row: {
          country_code: string | null
          gigs_count: number | null
          last_gig_date: string | null
          top_payers: string[] | null
          total_income: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_mileage_export: {
        Row: {
          date: string | null
          deduction_amount: number | null
          destination: string | null
          miles: number | null
          notes: string | null
          origin: string | null
          purpose: string | null
          user_id: string | null
        }
        Insert: {
          date?: string | null
          deduction_amount?: never
          destination?: string | null
          miles?: number | null
          notes?: string | null
          origin?: string | null
          purpose?: string | null
          user_id?: string | null
        }
        Update: {
          date?: string | null
          deduction_amount?: never
          destination?: string | null
          miles?: number | null
          notes?: string | null
          origin?: string | null
          purpose?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_payers_export: {
        Row: {
          contact_email: string | null
          expect_1099: boolean | null
          name: string | null
          notes: string | null
          type: Database["public"]["Enums"]["payer_type"] | null
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          expect_1099?: boolean | null
          name?: string | null
          notes?: string | null
          type?: Database["public"]["Enums"]["payer_type"] | null
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          expect_1099?: boolean | null
          name?: string | null
          notes?: string | null
          type?: Database["public"]["Enums"]["payer_type"] | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_next_due_date: {
        Args: {
          p_day_of_month: number
          p_day_of_week: number
          p_frequency: string
          p_from_date?: string
          p_month_of_year: number
        }
        Returns: string
      }
      calculate_schedule_c_summary: {
        Args: {
          p_end_date: string
          p_include_fees?: boolean
          p_include_tips?: boolean
          p_start_date: string
          p_user_id: string
        }
        Returns: {
          amount: number
          line_name: string
        }[]
      }
      cleanup_expired_trusted_devices: { Args: never; Returns: undefined }
      cleanup_old_auth_failures: { Args: never; Returns: undefined }
      clear_auth_failures: {
        Args: { p_email: string; p_ip_address: string }
        Returns: undefined
      }
      get_subscription_tier: {
        Args: { check_user_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
      get_tax_year_range: {
        Args: { p_year: number }
        Returns: {
          end_date: string
          start_date: string
        }[]
      }
      has_active_subscription: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      is_auth_blocked: {
        Args: { p_email: string; p_ip_address: string }
        Returns: boolean
      }
      mark_overdue_invoices: { Args: never; Returns: undefined }
      record_auth_failure: {
        Args: { p_email: string; p_failure_type: string; p_ip_address: string }
        Returns: number
      }
      update_state_flat_rate: {
        Args: {
          p_notes?: string
          p_rate: number
          p_state_code: string
          p_year: number
        }
        Returns: undefined
      }
    }
    Enums: {
      expense_category:
        | "Meals & Entertainment"
        | "Travel"
        | "Lodging"
        | "Equipment/Gear"
        | "Supplies"
        | "Software/Subscriptions"
        | "Marketing/Promotion"
        | "Professional Fees"
        | "Education/Training"
        | "Rent/Studio"
        | "Other"
      payer_type:
        | "Venue"
        | "Client"
        | "Platform"
        | "Other"
        | "Individual"
        | "Corporation"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "trialing"
        | "incomplete"
      subscription_tier: "free" | "monthly" | "yearly"
      user_plan: "free" | "pro_monthly" | "pro_yearly"
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
  public: {
    Enums: {
      expense_category: [
        "Meals & Entertainment",
        "Travel",
        "Lodging",
        "Equipment/Gear",
        "Supplies",
        "Software/Subscriptions",
        "Marketing/Promotion",
        "Professional Fees",
        "Education/Training",
        "Rent/Studio",
        "Other",
      ],
      payer_type: [
        "Venue",
        "Client",
        "Platform",
        "Other",
        "Individual",
        "Corporation",
      ],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "trialing",
        "incomplete",
      ],
      subscription_tier: ["free", "monthly", "yearly"],
      user_plan: ["free", "pro_monthly", "pro_yearly"],
    },
  },
} as const
