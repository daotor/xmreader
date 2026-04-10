import type { ImageUploadHandler } from '../types/editor'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * 验证图片文件
 */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return '请选择图片文件'
  }
  if (file.size > MAX_FILE_SIZE) {
    return `图片大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`
  }
  return null
}

/**
 * 将 File 转为 base64 Data URL（本地开发用）
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 默认图片上传处理器（本地 base64，开发用）
 * 正式环境替换为 MinIO 上传
 */
export const defaultImageUploadHandler: ImageUploadHandler = async ({ file }) => {
  const error = validateImageFile(file)
  if (error) throw new Error(error)
  return fileToDataUrl(file)
}

/**
 * 创建 MinIO 图片上传处理器
 */
export function createMinioUploadHandler(endpoint: string): ImageUploadHandler {
  return async ({ file, onProgress }) => {
    const error = validateImageFile(file)
    if (error) throw new Error(error)

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`上传失败: ${response.statusText}`)
    }

    const data = await response.json()
    return data.url
  }
}
