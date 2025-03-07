import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env' });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from('worker-images')
      .upload(`${Date.now()}-${image.name}`, buffer, {
        contentType: image.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('worker-images')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Error uploading image' },
      { status: 500 }
    )
  }
} 