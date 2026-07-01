type PixelTextAlign = 'left' | 'center' | 'right'
type PixelTextBaseline = 'top' | 'middle' | 'bottom'

export interface PixelTextOptions {
  color: string
  scale?: number
  align?: PixelTextAlign
  baseline?: PixelTextBaseline
  letterSpacing?: number
  shadowColor?: string | null
  shadowOffset?: number
  maxWidth?: number
}

const FALLBACK = [
  '11110',
  '00001',
  '00110',
  '00100',
  '00000',
  '00100',
  '00000',
]

const GLYPHS: Record<string, string[]> = {
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
  '!': ['1', '1', '1', '1', '0', '1', '0'],
  '"': ['101', '101', '000', '000', '000', '000', '000'],
  '#': ['01010', '11111', '01010', '01010', '11111', '01010', '00000'],
  '$': ['01110', '10100', '10100', '01110', '00101', '00101', '11110'],
  '%': ['11001', '11010', '00100', '01000', '10110', '00110', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  "'": ['1', '1', '0', '0', '0', '0', '0'],
  '(': ['01', '10', '10', '10', '10', '10', '01'],
  ')': ['10', '01', '01', '01', '01', '01', '10'],
  '*': ['00100', '10101', '01110', '11111', '01110', '10101', '00100'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  ',': ['00', '00', '00', '00', '00', '10', '10'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['0', '0', '0', '0', '0', '1', '0'],
  '/': ['00001', '00010', '00100', '01000', '10000', '00000', '00000'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['010', '110', '010', '010', '010', '010', '111'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ':': ['0', '1', '0', '0', '0', '1', '0'],
  ';': ['0', '1', '0', '0', '0', '1', '1'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '=': ['00000', '11111', '00000', '11111', '00000', '00000', '00000'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '[': ['11', '10', '10', '10', '10', '10', '11'],
  '\\': ['10000', '01000', '00100', '00010', '00001', '00000', '00000'],
  ']': ['11', '01', '01', '01', '01', '01', '11'],
  '^': ['00100', '01010', '10001', '00000', '00000', '00000', '00000'],
  '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
}

export function measurePixelText(text: string, scale = 1, letterSpacing = 1) {
  const normalized = normalizeText(text)
  if (normalized.length <= 0) {
    return 0
  }

  let width = 0
  for (const char of normalized) {
    width += glyphFor(char)[0]?.length ?? 5
    width += letterSpacing
  }
  return Math.max(0, width - letterSpacing) * scale
}

export function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: PixelTextOptions) {
  const scale = Math.max(1, Math.floor(options.scale ?? 1))
  const letterSpacing = Math.max(0, Math.floor(options.letterSpacing ?? 1))
  const value = fitText(normalizeText(text), options.maxWidth, scale, letterSpacing)
  const width = measurePixelText(value, scale, letterSpacing)
  const height = 7 * scale
  let left = Math.round(x)
  let top = Math.round(y)

  if (options.align === 'center') {
    left -= Math.round(width / 2)
  } else if (options.align === 'right') {
    left -= width
  }

  if (options.baseline === 'middle') {
    top -= Math.round(height / 2)
  } else if (options.baseline === 'bottom') {
    top -= height
  }

  const shadow = options.shadowColor ?? '#050505'
  if (shadow) {
    drawRawText(ctx, value, left + Math.max(1, options.shadowOffset ?? scale), top + Math.max(1, options.shadowOffset ?? scale), scale, letterSpacing, shadow)
  }
  drawRawText(ctx, value, left, top, scale, letterSpacing, options.color)
}

function drawRawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  letterSpacing: number,
  color: string,
) {
  ctx.fillStyle = color
  let cursor = x
  for (const char of text) {
    const glyph = glyphFor(char)
    for (let row = 0; row < glyph.length; row += 1) {
      const line = glyph[row] ?? ''
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] === '1') {
          ctx.fillRect(cursor + col * scale, y + row * scale, scale, scale)
        }
      }
    }
    cursor += ((glyph[0]?.length ?? 5) + letterSpacing) * scale
  }
}

function fitText(text: string, maxWidth: number | undefined, scale: number, letterSpacing: number) {
  if (!maxWidth || measurePixelText(text, scale, letterSpacing) <= maxWidth) {
    return text
  }

  let next = text
  while (next.length > 1 && measurePixelText(`${next}...`, scale, letterSpacing) > maxWidth) {
    next = next.slice(0, -1)
  }
  return `${next.trimEnd()}...`
}

function normalizeText(text: string) {
  return String(text).toUpperCase()
}

function glyphFor(char: string) {
  return GLYPHS[char] ?? FALLBACK
}
