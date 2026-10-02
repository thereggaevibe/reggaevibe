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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ad_impressions: {
        Row: {
          ad_order_id: string
          created_at: string
          id: number
          page_target: string
          placement_id: string | null
          position_key: string
        }
        Insert: {
          ad_order_id: string
          created_at?: string
          id?: number
          page_target: string
          placement_id?: string | null
          position_key: string
        }
        Update: {
          ad_order_id?: string
          created_at?: string
          id?: number
          page_target?: string
          placement_id?: string | null
          position_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_order_id_fkey"
            columns: ["ad_order_id"]
            isOneToOne: false
            referencedRelation: "ad_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "rv_ad_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_orders: {
        Row: {
          access_token: string
          amount_cents: number
          buyer_email: string | null
          buyer_user_id: string | null
          campaign_notes: string | null
          created_at: string
          environment: string
          id: string
          impressions: number
          placement: string
          provider_order_id: string | null
          status: string
          units: number
        }
        Insert: {
          access_token?: string
          amount_cents?: number
          buyer_email?: string | null
          buyer_user_id?: string | null
          campaign_notes?: string | null
          created_at?: string
          environment?: string
          id?: string
          impressions?: number
          placement?: string
          provider_order_id?: string | null
          status?: string
          units?: number
        }
        Update: {
          access_token?: string
          amount_cents?: number
          buyer_email?: string | null
          buyer_user_id?: string | null
          campaign_notes?: string | null
          created_at?: string
          environment?: string
          id?: string
          impressions?: number
          placement?: string
          provider_order_id?: string | null
          status?: string
          units?: number
        }
        Relationships: []
      }
      article_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          show_in_menu: boolean
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          show_in_menu?: boolean
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          show_in_menu?: boolean
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      article_category_links: {
        Row: {
          article_id: string
          category_id: string
        }
        Insert: {
          article_id: string
          category_id: string
        }
        Update: {
          article_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_category_links_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_headline: boolean
          keywords: string[]
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_headline?: boolean
          keywords?: string[]
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_headline?: boolean
          keywords?: string[]
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      artist_stores: {
        Row: {
          avatar_url: string | null
          bio: string | null
          commission_pct: number
          created_at: string
          id: string
          name: string
          payout_email: string | null
          slug: string
          status: Database["public"]["Enums"]["store_status"]
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          name: string
          payout_email?: string | null
          slug: string
          status?: Database["public"]["Enums"]["store_status"]
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          commission_pct?: number
          created_at?: string
          id?: string
          name?: string
          payout_email?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["store_status"]
          user_id?: string
        }
        Relationships: []
      }
      chart_history: {
        Row: {
          chart_key: string
          chart_position: number
          created_at: string
          id: string
          track_id: string
          votes: number
          week_start: string
        }
        Insert: {
          chart_key: string
          chart_position: number
          created_at?: string
          id?: string
          track_id: string
          votes?: number
          week_start: string
        }
        Update: {
          chart_key?: string
          chart_position?: number
          created_at?: string
          id?: string
          track_id?: string
          votes?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_history_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "track_vote_stats"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "chart_history_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      djs: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          role: string
          socials: Json
          sort_order: number
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          role?: string
          socials?: Json
          sort_order?: number
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          role?: string
          socials?: Json
          sort_order?: number
        }
        Relationships: []
      }
      event_flyers: {
        Row: {
          area: Database["public"]["Enums"]["flyer_area"]
          created_at: string
          created_by: string | null
          event_date: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          is_approved: boolean
          storage_path: string
          title: string | null
        }
        Insert: {
          area: Database["public"]["Enums"]["flyer_area"]
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_approved?: boolean
          storage_path: string
          title?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["flyer_area"]
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_approved?: boolean
          storage_path?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_flyers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string | null
          country: string | null
          county: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          guest: string | null
          id: string
          image_url: string | null
          is_approved: boolean
          is_recurring: boolean
          recurrence_frequency: string | null
          recurrence_interval: number
          recurrence_until: string | null
          starts_at: string
          state: string | null
          submitted_by: string | null
          title: string
          venue: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          guest?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_recurring?: boolean
          recurrence_frequency?: string | null
          recurrence_interval?: number
          recurrence_until?: string | null
          starts_at: string
          state?: string | null
          submitted_by?: string | null
          title: string
          venue?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          county?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          guest?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_recurring?: boolean
          recurrence_frequency?: string | null
          recurrence_interval?: number
          recurrence_until?: string | null
          starts_at?: string
          state?: string | null
          submitted_by?: string | null
          title?: string
          venue?: string | null
        }
        Relationships: []
      }
      genre_map: {
        Row: {
          category: Database["public"]["Enums"]["track_category"]
          id: string
          tag: string
        }
        Insert: {
          category: Database["public"]["Enums"]["track_category"]
          id?: string
          tag: string
        }
        Update: {
          category?: Database["public"]["Enums"]["track_category"]
          id?: string
          tag?: string
        }
        Relationships: []
      }
      listener_pings: {
        Row: {
          created_at: string
          id: number
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: number
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      music_orders: {
        Row: {
          buyer_email: string | null
          buyer_user_id: string | null
          commission_cents: number
          created_at: string
          environment: string
          gross_cents: number
          id: string
          net_cents: number
          provider_order_id: string | null
          release_id: string | null
          status: string
          store_id: string | null
          title_snapshot: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_user_id?: string | null
          commission_cents: number
          created_at?: string
          environment?: string
          gross_cents: number
          id?: string
          net_cents: number
          provider_order_id?: string | null
          release_id?: string | null
          status?: string
          store_id?: string | null
          title_snapshot: string
        }
        Update: {
          buyer_email?: string | null
          buyer_user_id?: string | null
          commission_cents?: number
          created_at?: string
          environment?: string
          gross_cents?: number
          id?: string
          net_cents?: number
          provider_order_id?: string | null
          release_id?: string | null
          status?: string
          store_id?: string | null
          title_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_orders_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "artist_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          created_at: string
          environment: string
          id: string
          plan_key: string
          provider_plan_id: string | null
          provider_product_id: string | null
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          plan_key: string
          provider_plan_id?: string | null
          provider_product_id?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          plan_key?: string
          provider_plan_id?: string | null
          provider_product_id?: string | null
        }
        Relationships: []
      }
      plays: {
        Row: {
          id: number
          played_at: string
          track_id: string
        }
        Insert: {
          id?: number
          played_at?: string
          track_id: string
        }
        Update: {
          id?: number
          played_at?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plays_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "track_vote_stats"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "plays_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      releases: {
        Row: {
          artist_name: string
          audio_path: string | null
          cover_path: string | null
          created_at: string
          description: string | null
          genre: Database["public"]["Enums"]["music_genre"]
          id: string
          preview_path: string | null
          price_cents: number
          release_type: Database["public"]["Enums"]["release_type"]
          release_year: number | null
          status: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          artist_name: string
          audio_path?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          genre?: Database["public"]["Enums"]["music_genre"]
          id?: string
          preview_path?: string | null
          price_cents?: number
          release_type?: Database["public"]["Enums"]["release_type"]
          release_year?: number | null
          status?: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          artist_name?: string
          audio_path?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          genre?: Database["public"]["Enums"]["music_genre"]
          id?: string
          preview_path?: string | null
          price_cents?: number
          release_type?: Database["public"]["Enums"]["release_type"]
          release_year?: number | null
          status?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "artist_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      rv_ad_placements: {
        Row: {
          ad_order_id: string | null
          ad_type: string
          content_payload: string | null
          created_at: string
          id: string
          is_active: boolean
          page_target: string
          position_key: string
          rotation_weight: number
          slot_name: string
          target_url: string | null
          updated_at: string
        }
        Insert: {
          ad_order_id?: string | null
          ad_type?: string
          content_payload?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          page_target: string
          position_key: string
          rotation_weight?: number
          slot_name: string
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          ad_order_id?: string | null
          ad_type?: string
          content_payload?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          page_target?: string
          position_key?: string
          rotation_weight?: number
          slot_name?: string
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rv_ad_placements_ad_order_id_fkey"
            columns: ["ad_order_id"]
            isOneToOne: false
            referencedRelation: "ad_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          created_at: string
          id: string
          imported: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          imported?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_orders: {
        Row: {
          buyer_email: string | null
          buyer_user_id: string | null
          created_at: string
          currency: string
          environment: string
          id: string
          items: Json
          printful_order_id: number | null
          provider_order_id: string
          shipping: Json
          shipping_cents: number
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_user_id?: string | null
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          items: Json
          printful_order_id?: number | null
          provider_order_id: string
          shipping: Json
          shipping_cents?: number
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_user_id?: string | null
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          items?: Json
          printful_order_id?: number | null
          provider_order_id?: string
          shipping?: Json
          shipping_cents?: number
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_product_categories: {
        Row: {
          category_id: string
          created_at: string
          printful_product_id: number
        }
        Insert: {
          category_id: string
          created_at?: string
          printful_product_id: number
        }
        Update: {
          category_id?: string
          created_at?: string
          printful_product_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shoutouts: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_email: string | null
          sender_name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_email?: string | null
          sender_name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_email?: string | null
          sender_name?: string
          status?: string
        }
        Relationships: []
      }
      shows: {
        Row: {
          created_at: string
          day_of_week: number
          description: string | null
          dj_id: string | null
          end_time: string
          id: string
          image_url: string | null
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number
          description?: string | null
          dj_id?: string | null
          end_time: string
          id?: string
          image_url?: string | null
          start_time: string
          title: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          description?: string | null
          dj_id?: string | null
          end_time?: string
          id?: string
          image_url?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shows_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "djs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          provider_customer_id: string
          provider_subscription_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          provider_customer_id: string
          provider_subscription_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          provider_customer_id?: string
          provider_subscription_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      track_vote_daily: {
        Row: {
          track_id: string
          vote_day: string
          votes: number
        }
        Insert: {
          track_id: string
          vote_day: string
          votes?: number
        }
        Update: {
          track_id?: string
          vote_day?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "track_vote_daily_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "track_vote_stats"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "track_vote_daily_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          artist: string
          artwork_url: string | null
          category: Database["public"]["Enums"]["track_category"]
          category_locked: boolean
          created_at: string
          excluded: boolean
          id: string
          last_played_at: string | null
          norm_key: string
          play_count: number
          raw_tags: string | null
          release_year: number | null
          title: string
        }
        Insert: {
          artist?: string
          artwork_url?: string | null
          category?: Database["public"]["Enums"]["track_category"]
          category_locked?: boolean
          created_at?: string
          excluded?: boolean
          id?: string
          last_played_at?: string | null
          norm_key: string
          play_count?: number
          raw_tags?: string | null
          release_year?: number | null
          title: string
        }
        Update: {
          artist?: string
          artwork_url?: string | null
          category?: Database["public"]["Enums"]["track_category"]
          category_locked?: boolean
          created_at?: string
          excluded?: boolean
          id?: string
          last_played_at?: string | null
          norm_key?: string
          play_count?: number
          raw_tags?: string | null
          release_year?: number | null
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          playlist_id: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          playlist_id: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          playlist_id?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      video_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          track_id: string
          user_id: string
          vote_day: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          track_id: string
          user_id: string
          vote_day?: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          track_id?: string
          user_id?: string
          vote_day?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "track_vote_stats"
            referencedColumns: ["track_id"]
          },
          {
            foreignKeyName: "votes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      track_vote_stats: {
        Row: {
          artist: string | null
          artwork_url: string | null
          category: Database["public"]["Enums"]["track_category"] | null
          excluded: boolean | null
          last_played_at: string | null
          play_count: number | null
          release_year: number | null
          title: string | null
          track_id: string | null
          votes_all_time: number | null
          votes_month: number | null
          votes_week: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      active_plan: {
        Args: { _environment?: string; _user_id: string }
        Returns: string
      }
      ad_campaign_by_token: {
        Args: { _token: string }
        Returns: {
          access_token: string
          amount_cents: number
          campaign_notes: string
          created_at: string
          delivered: number
          order_id: string
          pages: Json
          placement: string
          purchased: number
        }[]
      }
      has_active_subscription: {
        Args: { _environment?: string; _user_id: string }
        Returns: boolean
      }
      listener_stats: {
        Args: { _from: string; _to: string }
        Returns: {
          day: string
          listeners: number
          pings: number
          signed_in: number
        }[]
      }
      log_ad_impression: { Args: { _placement_id: string }; Returns: undefined }
      monthly_track_stats: {
        Args: never
        Returns: {
          month: string
          plays: number
          unique_tracks: number
          votes: number
        }[]
      }
      my_ad_campaigns: {
        Args: never
        Returns: {
          access_token: string
          amount_cents: number
          campaign_notes: string
          created_at: string
          delivered: number
          order_id: string
          pages: Json
          placement: string
          purchased: number
        }[]
      }
      top5_at5_chart: {
        Args: { _current_year_only?: boolean }
        Returns: {
          artist: string
          artwork_url: string
          category: Database["public"]["Enums"]["track_category"]
          chart_position: number
          last_week: number
          title: string
          track_id: string
          votes_week: number
          weeks_at_one: number
          weeks_on_chart: number
        }[]
      }
      track_report: {
        Args: { _from: string; _to: string }
        Returns: {
          artist: string
          category: Database["public"]["Enums"]["track_category"]
          first_play: string
          last_play: string
          plays: number
          title: string
          track_id: string
          votes: number
        }[]
      }
      video_rating_summary: {
        Args: { _video_ids: string[] }
        Returns: {
          average: number
          video_id: string
          votes: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "dj" | "user"
      flyer_area: "tristate" | "dmv" | "new_york" | "florida" | "jamaica"
      music_genre: "reggae" | "dancehall" | "soca" | "afrobeats"
      release_type: "single" | "ep" | "album"
      store_status: "pending" | "approved" | "rejected"
      track_category: "reggae" | "dancehall" | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "dj", "user"],
      flyer_area: ["tristate", "dmv", "new_york", "florida", "jamaica"],
      music_genre: ["reggae", "dancehall", "soca", "afrobeats"],
      release_type: ["single", "ep", "album"],
      store_status: ["pending", "approved", "rejected"],
      track_category: ["reggae", "dancehall", "other"],
    },
  },
} as const
