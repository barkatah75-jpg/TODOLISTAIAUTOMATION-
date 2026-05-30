import { createWorker, Worker } from 'tesseract.js'

let tesseractWorker: Worker | null = null

async function getTesseractWorker(language: string = 'eng'): Promise<Worker> {
  if (!tesseractWorker) {
    tesseractWorker = await createWorker(language, 1, {
      logger: (m) => process.env.NODE_ENV === 'development' && console.log('[Tesseract]', m.status),
    })
  }
  return tesseractWorker
}

export interface OCRResult {
  text: string
  confidence: number
  words: Array<{ text: string; confidence: number }>
  detectedTasks: string[]
  provider: 'tesseract' | 'google_vision'
}

/**
 * Extract text from image using Tesseract.js (free, local)
 * Falls back to Google Vision API for better accuracy when API key is available
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  language: string = 'eng',
  useGoogleVision: boolean = false
): Promise<OCRResult> {
  // Use Google Vision if API key available and requested
  if (useGoogleVision && process.env.GOOGLE_VISION_API_KEY) {
    return extractWithGoogleVision(imageBuffer)
  }

  return extractWithTesseract(imageBuffer, language)
}

async function extractWithTesseract(imageBuffer: Buffer, language: string): Promise<OCRResult> {
  // Support English + Hindi (hin)
  const lang = language === 'hi' ? 'hin' : language === 'hi+en' ? 'hin+eng' : 'eng'

  const worker = await getTesseractWorker(lang)
  const base64 = imageBuffer.toString('base64')
  const dataUrl = `data:image/png;base64,${base64}`

  const { data } = await worker.recognize(dataUrl)

  const detectedTasks = extractTasksFromText(data.text)

  return {
    text: data.text.trim(),
    confidence: data.confidence,
    words: data.words.map(w => ({ text: w.text, confidence: w.confidence })),
    detectedTasks,
    provider: 'tesseract',
  }
}

async function extractWithGoogleVision(imageBuffer: Buffer): Promise<OCRResult> {
  const base64 = imageBuffer.toString('base64')

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 1 },
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
          ],
        }],
      }),
    }
  )

  if (!response.ok) throw new Error('Google Vision API request failed')

  const data = await response.json()
  const annotation = data.responses?.[0]?.fullTextAnnotation
  const text = annotation?.text || data.responses?.[0]?.textAnnotations?.[0]?.description || ''

  const words = data.responses?.[0]?.textAnnotations?.slice(1).map((a: { description: string; score?: number }) => ({
    text: a.description,
    confidence: (a.score || 0.9) * 100,
  })) || []

  return {
    text: text.trim(),
    confidence: 95, // Google Vision is typically very accurate
    words,
    detectedTasks: extractTasksFromText(text),
    provider: 'google_vision',
  }
}

/**
 * Intelligently extract actionable tasks from OCR'd text
 * Detects homework assignments, to-do items, numbered lists, etc.
 */
function extractTasksFromText(text: string): string[] {
  if (!text.trim()) return []

  const tasks: string[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3)

  for (const line of lines) {
    // Skip very short or very long lines
    if (line.length < 5 || line.length > 200) continue

    // Detect numbered items: "1. Do math", "1) Study"
    if (/^[\d]+[.)]\s+.+/.test(line)) {
      const task = line.replace(/^[\d]+[.)]\s+/, '').trim()
      if (task.length > 3) tasks.push(task)
      continue
    }

    // Detect bullet points: "• Do homework", "- Clean room", "* Exercise"
    if (/^[•\-*✓□☐▪▫]\s+.+/.test(line)) {
      const task = line.replace(/^[•\-*✓□☐▪▫]\s+/, '').trim()
      if (task.length > 3) tasks.push(task)
      continue
    }

    // Detect imperative sentences (likely tasks): "Complete chapter 5", "Read pages"
    const imperativePatterns = [
      /^(complete|finish|do|read|write|practice|study|learn|solve|draw|make|create|clean|organize|memorize)/i,
      /^(Complete|Finish|Do|Read|Write|Practice|Study|Learn|Solve|Draw|Make|Create|Clean|Organize|Memorize)/,
      // Hindi patterns
      /^(करो|पढ़ो|लिखो|सीखो|हल करो|बनाओ)/,
    ]

    if (imperativePatterns.some(p => p.test(line))) {
      tasks.push(line)
    }
  }

  // Deduplicate and limit
  return [...new Set(tasks)].slice(0, 10)
}

export async function cleanupTesseractWorker() {
  if (tesseractWorker) {
    await tesseractWorker.terminate()
    tesseractWorker = null
  }
}
