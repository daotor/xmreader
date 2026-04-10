import { ref } from 'vue'
import type { Editor } from '@tiptap/core'
import type { ImageUploadHandler } from '../types/editor'
import { defaultImageUploadHandler, validateImageFile } from '../utils/image-upload'

/**
 * 图片上传 composable
 * 支持文件选择、拖拽、粘贴三种方式
 */
export function useImageUpload(
	editor: () => Editor | undefined,
	uploadHandler?: ImageUploadHandler,
) {
	const isUploading = ref(false)
	const uploadProgress = ref(0)
	const handler = uploadHandler || defaultImageUploadHandler

	async function uploadAndInsert(file: File) {
		const ed = editor()
		if (!ed) return

		const error = validateImageFile(file)
		if (error) {
			console.warn('[ImageUpload]', error)
			return
		}

		isUploading.value = true
		uploadProgress.value = 0

		try {
			const url = await handler({
				file,
				onProgress: (p) => { uploadProgress.value = p },
			})

			ed.chain().focus().setImage({ src: url, alt: file.name }).run()
		} catch (err) {
			console.error('[ImageUpload] 上传失败:', err)
		} finally {
			isUploading.value = false
			uploadProgress.value = 0
		}
	}

	/** 通过文件选择器上传 */
	function openFilePicker() {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.onchange = () => {
			const file = input.files?.[0]
			if (file) uploadAndInsert(file)
		}
		input.click()
	}

	/** 处理拖拽 */
	function handleDrop(event: DragEvent) {
		const files = event.dataTransfer?.files
		if (!files) return

		for (let i = 0; i < files.length; i++) {
			const file = files[i]
			if (file.type.startsWith('image/')) {
				event.preventDefault()
				uploadAndInsert(file)
				return
			}
		}
	}

	/** 处理粘贴 */
	function handlePaste(event: ClipboardEvent) {
		const items = event.clipboardData?.items
		if (!items) return

		for (let i = 0; i < items.length; i++) {
			const item = items[i]
			if (item.type.startsWith('image/')) {
				event.preventDefault()
				const file = item.getAsFile()
				if (file) uploadAndInsert(file)
				return
			}
		}
	}

	return {
		isUploading,
		uploadProgress,
		openFilePicker,
		handleDrop,
		handlePaste,
		uploadAndInsert,
	}
}
