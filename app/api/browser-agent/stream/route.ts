import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { headers } from 'next/headers';

// This will be replaced with actual browser streaming later
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // For now, we'll stream a mock video file
    const videoPath = path.join(process.cwd(), 'public', 'mock-browser-session.mp4');
    
    // Check if the file exists
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json(
        { error: 'Mock video file not found' },
        { status: 404 }
      );
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const headersList = headers();
    const range = request.headers.get('range') || '';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'video/mp4',
      };

      return new NextResponse(file as any, {
        status: 206,
        headers: head,
      });
    } else {
      const head = {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      };

      const file = fs.createReadStream(videoPath);
      return new NextResponse(file as any, {
        headers: head,
      });
    }
  } catch (error) {
    console.error('Error streaming browser session:', error);
    return NextResponse.json(
      { error: 'Failed to stream browser session' },
      { status: 500 }
    );
  }
} 