const MAX_INPUT_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
const MAX_OUTPUT_IMAGE_SIZE_BYTES = 1_500_000
const MAX_IMAGE_DIMENSION = 1400
const INITIAL_OUTPUT_QUALITY = 0.86
const MIN_OUTPUT_QUALITY = 0.45
const QUALITY_STEP = 0.08
const SCALE_STEP = 0.82
const MIN_SCALE_FACTOR = 0.45
const BYTES_PER_BASE64_BLOCK = 4
const RASTER_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff',
])
const NON_CONVERTED_IMAGE_TYPES = new Set(['image/gif', 'image/svg+xml'])

function estimateDataUrlSizeInBytes(dataUrl) {
  const parts = String(dataUrl ?? '').split(',', 2)
  const base64Payload = parts[1] ?? ''

  if (!base64Payload) {
    return 0
  }

  const padding = base64Payload.endsWith('==') ? 2 : base64Payload.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((base64Payload.length * 3) / BYTES_PER_BASE64_BLOCK) - padding)
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Não foi possível carregar essa imagem.'))

    reader.readAsDataURL(file)
  })
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível processar a imagem selecionada.'))
    image.src = dataUrl
  })
}

function clampDimension(value) {
  return Math.max(1, Math.round(value))
}

function getResizedDimensions(width, height, maxDimension) {
  if (width <= 0 || height <= 0) {
    return {
      width: maxDimension,
      height: maxDimension,
    }
  }

  const largestSide = Math.max(width, height)
  if (largestSide <= maxDimension) {
    return {
      width,
      height,
    }
  }

  const scale = maxDimension / largestSide
  return {
    width: clampDimension(width * scale),
    height: clampDimension(height * scale),
  }
}

function renderImageAsJpegDataUrl(image, width, height, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = clampDimension(width)
  canvas.height = clampDimension(height)

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Não foi possível processar a imagem selecionada.')
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

function shouldConvertToJpeg(fileType) {
  const normalizedType = String(fileType ?? '').toLowerCase()
  return RASTER_IMAGE_TYPES.has(normalizedType)
}

function shouldKeepSourceEncoding(fileType) {
  const normalizedType = String(fileType ?? '').toLowerCase()
  return NON_CONVERTED_IMAGE_TYPES.has(normalizedType)
}

export async function buildOptimizedImageDataUrl(
  file,
  {
    maxInputBytes = MAX_INPUT_IMAGE_SIZE_BYTES,
    maxOutputBytes = MAX_OUTPUT_IMAGE_SIZE_BYTES,
    maxDimension = MAX_IMAGE_DIMENSION,
  } = {},
) {
  if (!file) {
    throw new Error('Nenhum arquivo de imagem foi selecionado.')
  }

  const fileType = String(file.type ?? '').toLowerCase()
  if (!fileType.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido.')
  }

  if (Number(file.size) > maxInputBytes) {
    throw new Error(`A imagem deve ter no máximo ${Math.floor(maxInputBytes / (1024 * 1024))}MB.`)
  }

  const sourceDataUrl = await readFileAsDataUrl(file)
  if (shouldKeepSourceEncoding(fileType) || !shouldConvertToJpeg(fileType)) {
    if (estimateDataUrlSizeInBytes(sourceDataUrl) > maxOutputBytes) {
      throw new Error('A imagem é muito grande. Tente uma imagem menor.')
    }

    return sourceDataUrl
  }

  const sourceImage = await loadImageFromDataUrl(sourceDataUrl)
  const baseDimensions = getResizedDimensions(sourceImage.width, sourceImage.height, maxDimension)
  let width = baseDimensions.width
  let height = baseDimensions.height
  let quality = INITIAL_OUTPUT_QUALITY
  let encodedDataUrl = renderImageAsJpegDataUrl(sourceImage, width, height, quality)
  let scaleFactor = 1

  while (estimateDataUrlSizeInBytes(encodedDataUrl) > maxOutputBytes && quality > MIN_OUTPUT_QUALITY) {
    quality = Math.max(MIN_OUTPUT_QUALITY, quality - QUALITY_STEP)
    encodedDataUrl = renderImageAsJpegDataUrl(sourceImage, width, height, quality)
  }

  while (estimateDataUrlSizeInBytes(encodedDataUrl) > maxOutputBytes && scaleFactor > MIN_SCALE_FACTOR) {
    scaleFactor *= SCALE_STEP
    width = clampDimension(baseDimensions.width * scaleFactor)
    height = clampDimension(baseDimensions.height * scaleFactor)
    quality = Math.min(quality, INITIAL_OUTPUT_QUALITY)
    encodedDataUrl = renderImageAsJpegDataUrl(sourceImage, width, height, quality)

    while (estimateDataUrlSizeInBytes(encodedDataUrl) > maxOutputBytes && quality > MIN_OUTPUT_QUALITY) {
      quality = Math.max(MIN_OUTPUT_QUALITY, quality - QUALITY_STEP)
      encodedDataUrl = renderImageAsJpegDataUrl(sourceImage, width, height, quality)
    }
  }

  if (estimateDataUrlSizeInBytes(encodedDataUrl) > maxOutputBytes) {
    throw new Error('Não foi possível reduzir a imagem automaticamente. Tente uma imagem menor.')
  }

  return encodedDataUrl
}
