import type { MediaType } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface MediaData {
  mediaType: MediaType
  title: string
  creator: string
  externalUrl?: string
  coverUrl?: string
  source?: string
  sourceId?: string
  metadata?: Record<string, unknown> | null
}

/**
 * Validate media data based on media type requirements
 * @throws Error with message if validation fails
 */
export function validateMediaData(mediaType: MediaType, data: Partial<MediaData>): void {
  // Title is required for all types
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    throw new Error('Title is required')
  }

  switch (mediaType) {
    case 'BOOK':
    case 'MOVIE':
    case 'SONG':
    case 'ALBUM':
    case 'PODCAST':
    case 'LIVE':
      // These require title and creator
      if (!data.creator || typeof data.creator !== 'string' || data.creator.trim().length === 0) {
        throw new Error('Creator is required')
      }
      break

    case 'ARTICLE':
      // Articles require title, creator, and externalUrl (must be HTTPS)
      if (!data.creator || typeof data.creator !== 'string' || data.creator.trim().length === 0) {
        throw new Error('Creator is required')
      }
      if (!data.externalUrl || typeof data.externalUrl !== 'string') {
        throw new Error('External URL is required for articles')
      }
      try {
        const url = new URL(data.externalUrl)
        if (url.protocol !== 'https:') {
          throw new Error('External URL must use HTTPS')
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('HTTPS')) {
          throw error
        }
        throw new Error('External URL must be a valid URL')
      }
      break

    default:
      throw new Error(`Unknown media type: ${mediaType}`)
  }
}

/**
 * Find existing media item or create a new one
 * Handles deduplication for manual entries (case-insensitive title + creator match)
 * @param supabaseAdmin - Supabase client with service role key
 * @param mediaData - Media data to find or create
 * @returns Media item ID
 */
export async function findOrCreateMediaItem(
  supabaseAdmin: SupabaseClient,
  mediaData: MediaData
): Promise<string> {
  const { mediaType, title, creator, externalUrl, coverUrl, source, sourceId, metadata } = mediaData

  // If source and sourceId are provided (e.g., Google Books), check for existing by source
  if (source && sourceId) {
    const { data: existingBySource, error: sourceError } = await supabaseAdmin
      .from('media_items')
      .select('id')
      .eq('source', source)
      .eq('source_id', sourceId)
      .single()

    if (sourceError && sourceError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      throw sourceError
    }

    if (existingBySource) {
      return existingBySource.id
    }
  }

  // For manual entries (no source), check for deduplication by media_type + title + creator
  // Case-insensitive comparison
  if (!source || !sourceId) {
    const { data: existingManual, error: manualError } = await supabaseAdmin
      .from('media_items')
      .select('id')
      .eq('media_type', mediaType)
      .ilike('title', title.trim())
      .ilike('creator', creator?.trim() || '')
      .is('source', null)
      .is('source_id', null)
      .maybeSingle()

    if (manualError) {
      throw manualError
    }

    if (existingManual) {
      return existingManual.id
    }
  }

  // No existing item found - create new one
  const { data: newMediaItem, error: insertError } = await supabaseAdmin
    .from('media_items')
    .insert({
      media_type: mediaType,
      title: title.trim(),
      creator: creator?.trim() || null,
      external_url: externalUrl || null,
      cover_url: coverUrl || null,
      source: source || null,
      source_id: sourceId || null,
      metadata: metadata ?? null,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Error creating media item:', insertError)
    throw insertError
  }

  return newMediaItem.id
}
