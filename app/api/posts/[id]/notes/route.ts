import { requireUserId } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { NoteWithAuthor, NotesResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MAX_NOTE_LENGTH = 60

function normalizeNoteText(text: string): string {
  return text.trim()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const postId = params.id
    if (!postId) {
      return NextResponse.json(
        { error: 'Post id is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const { data: rawNotes, error: notesError } = await supabaseAdmin
      .from('post_notes')
      .select(`
        id,
        post_id,
        user_id,
        text,
        created_at,
        user:users!post_notes_user_id_fkey (
          id,
          username,
          avatar_color,
          created_at
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (notesError) {
      console.error('Error fetching notes:', notesError)
      return NextResponse.json(
        { error: 'Failed to load notes' },
        { status: 500 }
      )
    }

    const notes = (rawNotes ?? []).map((note) => ({
      id: note.id,
      post_id: note.post_id,
      user_id: note.user_id,
      text: note.text,
      created_at: note.created_at,
      user: Array.isArray(note.user) ? note.user[0] : note.user,
    })) as NoteWithAuthor[]

    const hasNoted = notes.some((note) => note.user_id === userId)

    const response: NotesResponse = {
      items: notes,
      hasNoted,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/posts/[id]/notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const postId = params.id
    if (!postId) {
      return NextResponse.json(
        { error: 'Post id is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const rawText = typeof body?.text === 'string' ? body.text : ''
    const text = normalizeNoteText(rawText)

    if (text.length < 1 || text.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        { error: 'Note must be between 1 and 60 characters' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createAdminClient()

    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.user_id === userId) {
      return NextResponse.json(
        { error: 'Cannot note your own post' },
        { status: 403 }
      )
    }

    const { data: existingNote } = await supabaseAdmin
      .from('post_notes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingNote) {
      return NextResponse.json(
        { error: 'Already noted' },
        { status: 409 }
      )
    }

    const { data: insertedNote, error: insertError } = await supabaseAdmin
      .from('post_notes')
      .insert({
        post_id: postId,
        user_id: userId,
        text,
      })
      .select(`
        id,
        post_id,
        user_id,
        text,
        created_at,
        user:users!post_notes_user_id_fkey (
          id,
          username,
          avatar_color,
          created_at
        )
      `)
      .single()

    if (insertError || !insertedNote) {
      if ((insertError as { code?: string } | null)?.code === '23505') {
        return NextResponse.json(
          { error: 'Already noted' },
          { status: 409 }
        )
      }
      console.error('Error creating note:', insertError)
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      )
    }

    const note: NoteWithAuthor = {
      id: insertedNote.id,
      post_id: insertedNote.post_id,
      user_id: insertedNote.user_id,
      text: insertedNote.text,
      created_at: insertedNote.created_at,
      user: Array.isArray(insertedNote.user)
        ? insertedNote.user[0]
        : insertedNote.user,
    }

    const { error: pingError } = await supabaseAdmin.from('pings').insert({
      recipient_user_id: post.user_id,
      actor_user_id: userId,
      post_id: postId,
      type: 'note',
    })

    if (pingError) {
      console.error('Error creating ping:', pingError)
    }

    return NextResponse.json(
      { note },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/posts/[id]/notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
