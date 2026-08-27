export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export class TextSplitter {
  /**
   * Splits arbitrary web page text using a sliding window chunking algorithm.
   * Default: 500 characters with 50 character overlap.
   */
  public static splitText(text: string, options: ChunkOptions = {}): string[] {
    const chunkSize = options.chunkSize || 500;
    const chunkOverlap = options.chunkOverlap || 50;

    const sanitized = text.replace(/\s+/g, ' ').trim();
    if (!sanitized) return [];

    if (sanitized.length <= chunkSize) {
      return [sanitized];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < sanitized.length) {
      let end = start + chunkSize;

      if (end < sanitized.length) {
        // Try to break at word boundary
        const lastSpace = sanitized.lastIndexOf(' ', end);
        if (lastSpace > start + chunkSize / 2) {
          end = lastSpace;
        }
      } else {
        end = sanitized.length;
      }

      const chunk = sanitized.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      if (end >= sanitized.length) break;
      start = Math.max(start + 1, end - chunkOverlap);
    }

    return chunks;
  }
}
