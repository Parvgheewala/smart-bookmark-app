import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 })
    }

    // Fetch the page with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BookmarkBot/1.0)',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch: ${response.status}` 
      }, { status: 400 })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract Open Graph data
    const previewData = {
      title: 
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        '',
      description:
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '',
      image:
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        '',
      favicon:
        $('link[rel="icon"]').attr('href') ||
        $('link[rel="shortcut icon"]').attr('href') ||
        $('link[rel="apple-touch-icon"]').attr('href') ||
        '',
    }

    // Resolve relative URLs
    const urlObj = new URL(url)
    if (previewData.image && !previewData.image.startsWith('http')) {
      previewData.image = new URL(previewData.image, urlObj.origin).href
    }
    if (previewData.favicon && !previewData.favicon.startsWith('http')) {
      previewData.favicon = new URL(previewData.favicon, urlObj.origin).href
    }

    // Fallback: Use screenshot API if no image found
    if (!previewData.image) {
      previewData.image = `https://api.screenshotmachine.com/?key=YOUR_API_KEY&url=${encodeURIComponent(url)}&dimension=1024x768`
      // Or use a free alternative like:
      // previewData.image = `https://api.apiflash.com/v1/urltoimage?access_key=YOUR_KEY&url=${encodeURIComponent(url)}`
    }

    return NextResponse.json(previewData)
  } catch (error: any) {
    console.error('Preview fetch error:', error)
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ 
        error: 'Timeout - page took too long to load' 
      }, { status: 408 })
    }

    return NextResponse.json({ 
      error: 'Failed to fetch preview data' 
    }, { status: 500 })
  }
}
