/**
 * 工具栏相关常量和配置
 */

/** 标题选项 */
export const headingOptions = [
  { value: 0, icon: 'T',  label: '正文' },
  { value: 1, icon: 'H1', label: '标题一' },
  { value: 2, icon: 'H2', label: '标题二' },
  { value: 3, icon: 'H3', label: '标题三' },
  { value: 4, icon: 'H4', label: '标题四' },
  { value: 5, icon: 'H5', label: '标题五' },
] as const

/** 可选字号列表 */
export const fontSizes = ['12px', '13px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'] as const

/** 文字颜色预设 */
export const textColorPresets = [
  { label: '默认', value: null },
  { label: '灰色', value: '#6b7280' },
  { label: '棕色', value: '#92400e' },
  { label: '橙色', value: '#ea580c' },
  { label: '黄色', value: '#ca8a04' },
  { label: '绿色', value: '#16a34a' },
  { label: '蓝色', value: '#2563eb' },
  { label: '紫色', value: '#9333ea' },
  { label: '粉色', value: '#db2777' },
  { label: '红色', value: '#dc2626' },
] as const

/** 背景颜色预设 */
export const bgColorPresets = [
  { label: '无', value: null },
  { label: '灰色', value: '#f3f4f6' },
  { label: '棕色', value: '#fef3c7' },
  { label: '橙色', value: '#ffedd5' },
  { label: '黄色', value: '#fef9c3' },
  { label: '绿色', value: '#dcfce7' },
  { label: '蓝色', value: '#dbeafe' },
  { label: '紫色', value: '#f3e8ff' },
  { label: '粉色', value: '#fce7f3' },
  { label: '红色', value: '#fee2e2' },
] as const

/** 对齐选项 */
export const alignOptions = [
  { value: 'left',   label: '左对齐' },
  { value: 'center', label: '居中对齐' },
  { value: 'right',  label: '右对齐' },
] as const
