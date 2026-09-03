/**
 * Hand-maintained Supabase schema types for Duxiter.
 * Regenerate later with:
 *   npx supabase gen types typescript --project-id <id> --schema public > src/lib/database.types.ts
 *
 * NOTE: use `type` (not `interface`) for row shapes — object type aliases are
 * assignable to `Record<string, unknown>`, which the supabase-js generics require.
 */
import type { LocalizedText } from "@/i18n/config";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TourType = "street" | "museum";
export type TourStatus = "draft" | "pending_approval" | "approved" | "rejected";
export type DifficultyLevel = "easy" | "medium" | "hard";
export type AppLanguage = "pt" | "en" | "es";
export type TravelMode = "walking" | "car";
export type PaymentMethodType = "stripe_card" | "pix";
export type PurchaseStatus = "pending" | "completed" | "refunded" | "expired";
export type PartnerStatus = "pending" | "active" | "suspended";

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type CityRow = {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText | null;
  country: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TourRow = {
  id: string;
  city_id: string | null;
  title: LocalizedText;
  description: LocalizedText | null;
  short_description: LocalizedText | null;
  type: TourType;
  cover_image_url: string | null;
  difficulty: DifficultyLevel;
  estimated_duration_minutes: number | null;
  distance_km: number | null;
  price_usd: number;
  status: TourStatus;
  rejection_reason: string | null;
  tags: string[];
  is_active: boolean;
  partner_id: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type TourStopRow = {
  id: string;
  tour_id: string;
  order_index: number;
  title: LocalizedText;
  description: LocalizedText | null;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type StopImageRow = {
  id: string;
  stop_id: string;
  image_url: string;
  order_index: number;
  caption: LocalizedText | null;
  created_at: string;
};

export type StopAudioRow = {
  id: string;
  stop_id: string;
  order_index: number;
  audio_path: string;
  duration_seconds: number | null;
  label: LocalizedText | null;
  created_at: string;
};

export type UserProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: AppLanguage;
  is_banned: boolean;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseRow = {
  id: string;
  user_id: string;
  tour_id: string;
  amount_paid_usd: number | null;
  amount_paid_brl: number | null;
  fx_rate_used: number | null;
  currency: string | null;
  payment_method: PaymentMethodType | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  discount_code_id: string | null;
  discount_amount_usd: number;
  status: PurchaseStatus;
  expires_at: string | null;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  tour_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_deleted: boolean;
  deleted_by: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type ReviewReplyRow = {
  id: string;
  review_id: string;
  author_id: string;
  author_type: string;
  reply_text: string;
  created_at: string;
};

export type AiItineraryRow = {
  id: string;
  user_id: string;
  city_id: string | null;
  city_name: string | null;
  language: AppLanguage | null;
  travel_mode: TravelMode;
  available_time_minutes: number | null;
  interests: string[] | null;
  pace: string | null;
  start_time: string | null;
  start_location: Json | null;
  destination: Json | null;
  generated_stops: Json;
  itinerary: Json | null;
  is_saved: boolean;
  created_at: string;
};

export type ItineraryAudioRow = {
  id: string;
  itinerary_id: string;
  stop_index: number;
  kind: string;
  audio_path: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  voice: string | null;
  char_count: number | null;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type ItineraryCreditRow = {
  user_id: string;
  balance: number;
  lifetime_purchased: number;
  updated_at: string;
};

export type OfflineDownloadRow = {
  id: string;
  user_id: string;
  tour_id: string;
  downloaded_at: string;
};

export type DiscountCodeRow = {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount_usd: number | null;
  applies_to_tour_id: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type AdminUserRow = {
  id: string;
  role: string;
  created_at: string;
};

export type AnalyticsEventRow = {
  id: string;
  event_type: string;
  tour_id: string | null;
  city_id: string | null;
  user_id: string | null;
  metadata: Json | null;
  created_at: string;
};

export type PartnerRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  website_url: string | null;
  status: PartnerStatus;
  commission_rate: number;
  is_platform_enabled: boolean;
  created_at: string;
};

export type PartnerEarningRow = {
  id: string;
  partner_id: string;
  purchase_id: string;
  gross_amount_usd: number | null;
  commission_rate: number | null;
  partner_amount_usd: number | null;
  period_month: string | null;
  payout_status: string;
  paid_at: string | null;
  admin_notes: string | null;
  created_at: string;
};

export type DiscountCodeUseRow = {
  id: string;
  code_id: string;
  user_id: string;
  purchase_id: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      cities: Table<CityRow>;
      tours: Table<TourRow>;
      tour_stops: Table<TourStopRow>;
      stop_images: Table<StopImageRow>;
      stop_audios: Table<StopAudioRow>;
      user_profiles: Table<UserProfileRow>;
      purchases: Table<PurchaseRow>;
      reviews: Table<ReviewRow>;
      review_replies: Table<ReviewReplyRow>;
      ai_itineraries: Table<AiItineraryRow>;
      itinerary_audios: Table<ItineraryAudioRow>;
      itinerary_credits: Table<ItineraryCreditRow>;
      offline_downloads: Table<OfflineDownloadRow>;
      discount_codes: Table<DiscountCodeRow>;
      discount_code_uses: Table<DiscountCodeUseRow>;
      admin_users: Table<AdminUserRow>;
      analytics_events: Table<AnalyticsEventRow>;
      partners: Table<PartnerRow>;
      partner_earnings: Table<PartnerEarningRow>;
    };
    Views: Record<string, never>;
    Functions: {
      increment_discount_use: {
        Args: { p_code_id: string };
        Returns: undefined;
      };
      is_admin: {
        Args: { uid?: string };
        Returns: boolean;
      };
    };
    CompositeTypes: Record<string, never>;
    Enums: {
      tour_type: TourType;
      tour_status: TourStatus;
      difficulty_level: DifficultyLevel;
      app_language: AppLanguage;
      travel_mode: TravelMode;
      payment_method_type: PaymentMethodType;
      purchase_status: PurchaseStatus;
      partner_status: PartnerStatus;
    };
  };
};
