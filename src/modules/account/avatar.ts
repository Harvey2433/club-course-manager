const ALLOWED_AVATAR_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
])

const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024
const MAX_AVATAR_DATA_URL_LENGTH = 1024 * 1024
const AVATAR_CANVAS_SIZE = 256

function validateAvatarFile(file: File) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error('头像仅支持 PNG、JPG、WEBP、GIF 格式')
  }

  if (file.size <= 0) {
    throw new Error('头像文件无效，请重新选择')
  }

  if (file.size > MAX_AVATAR_FILE_SIZE) {
    throw new Error('头像大小不能超过 2MB')
  }
}

function loadImageFromObjectUrl(objectUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('头像图片解析失败，请更换图片'))

    image.src = objectUrl
  })
}

function getCropBox(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    throw new Error('头像图片尺寸无效')
  }

  const size = Math.min(width, height)
  const sx = Math.max(0, Math.floor((width - size) / 2))
  const sy = Math.max(0, Math.floor((height - size) / 2))

  return {
    sx,
    sy,
    sw: size,
    sh: size
  }
}

export async function processAvatarFile(file: File) {
  validateAvatarFile(file)

  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('当前环境不支持头像处理')
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImageFromObjectUrl(objectUrl)
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_CANVAS_SIZE
    canvas.height = AVATAR_CANVAS_SIZE

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('当前环境不支持头像渲染')
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    const { sx, sy, sw, sh } = getCropBox(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height
    )

    context.clearRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE)
    context.drawImage(
      image,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      AVATAR_CANVAS_SIZE,
      AVATAR_CANVAS_SIZE
    )

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88)

    if (!dataUrl.startsWith('data:image/jpeg;base64,')) {
      throw new Error('头像处理失败，请重新选择图片')
    }

    if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
      throw new Error('头像处理后体积过大，请选择更小的图片')
    }

    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}