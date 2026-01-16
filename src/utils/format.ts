/**
 * Format file size in bytes to human-readable string with appropriate unit.
 * @param bytes - File size in bytes
 * @returns Formatted size string with 1 decimal place and unit (B, KB, MB, GB, TB)
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}