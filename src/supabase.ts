import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined
export const isBackendReady = Boolean(url && anon)
export const supabase = isBackendReady ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null

export type PetListing = {
  id: string; owner_id: string; name: string; species: string; animal_category?: string; scientific_name?: string | null; legal_origin_notes?: string; review_status?: 'approved' | 'pending' | 'rejected'
  size: 'Pequeno' | 'Médio' | 'Grande'; age_label: string; city: string
  district: string; neighborhood?: string; photo_urls?: string[]; color: string; breed: string; approximate_lat: number | null; approximate_lng: number | null; description: string; personality: string[]
  image_url: string | null; status: 'available' | 'reserved' | 'adopted'
  created_at: string
}
