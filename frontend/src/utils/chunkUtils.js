/**
 * Splits an array of files into chunks respecting:
 * 1. Max files per request (default 5)
 * 2. Max bytes per request (default 20MB)
 *
 * @param {Array<{ size?: number, name?: string }>} files
 * @param {number} [maxFilesPerChunk=5]
 * @param {number} [maxBytesPerChunk=20971520]
 * @returns {Array<Array<any>>}
 */
export function createFileChunks(files, maxFilesPerChunk = 5, maxBytesPerChunk = 20 * 1024 * 1024) {
  if (!Array.isArray(files) || files.length === 0) return [];

  const chunks = [];
  let currentChunk = [];
  let currentBytes = 0;

  for (const file of files) {
    const fileSize = file?.size || 0;
    if (
      currentChunk.length >= maxFilesPerChunk ||
      (currentBytes + fileSize > maxBytesPerChunk && currentChunk.length > 0)
    ) {
      chunks.push(currentChunk);
      currentChunk = [file];
      currentBytes = fileSize;
    } else {
      currentChunk.push(file);
      currentBytes += fileSize;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export default { createFileChunks };
