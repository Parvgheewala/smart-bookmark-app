import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    // Skip verification for localhost/internal URLs
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('192.168.')) {
      return NextResponse.json({ reachable: true, message: 'Local URL - skipped verification' })
    }

    // Verify URL with HEAD request (faster than GET)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BookmarkBot/1.0)',
      },
    })

    clearTimeout(timeoutId)

    // Consider 2xx and 3xx as reachable
    const reachable = response.status >= 200 && response.status < 400

    return NextResponse.json({
      reachable,
      status: response.status,
      message: reachable ? 'URL is reachable' : `Server returned ${response.status}`,
    })
  } catch (error: any) {
    // Handle different error types
    if (error.name === 'AbortError') {
      return NextResponse.json({ reachable: false, message: 'Timeout - URL took too long to respond' })
    }

    // CORS, DNS, network errors - treat as "unknown" not "invalid"
    return NextResponse.json({
      reachable: false,
      message: 'Could not verify URL (CORS, DNS, or network error)',
      warning: 'URL may be valid but unreachable from server',
    })
  }
}
