/**
 * Document chunking utilities
 * Splits large documents into smaller chunks for embedding
 */

export interface ChunkOptions {
	maxChunkSize?: number; // Max characters per chunk
	overlap?: number; // Characters to overlap between chunks
	separator?: string; // Primary separator (default: \n\n)
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
	maxChunkSize: 1000, // ~250 tokens for most models
	overlap: 200, // 20% overlap
	separator: '\n\n', // Split on paragraphs
};

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
	const { maxChunkSize, overlap, separator } = { ...DEFAULT_OPTIONS, ...options };

	// If text is shorter than max, return as-is
	if (text.length <= maxChunkSize) {
		return [text];
	}

	const chunks: string[] = [];

	// Try splitting by separator first (paragraphs)
	const sections = text.split(separator);
	let currentChunk = '';

	for (const section of sections) {
		// If a single section is too large, split it further
		if (section.length > maxChunkSize) {
			// Save current chunk if not empty
			if (currentChunk.trim()) {
				chunks.push(currentChunk.trim());
				currentChunk = '';
			}

			// Split large section by sentences
			const sentences = section.split(/[.!?]+\s/);
			for (const sentence of sentences) {
				if (currentChunk.length + sentence.length > maxChunkSize) {
					if (currentChunk.trim()) {
						chunks.push(currentChunk.trim());
					}
					currentChunk = sentence;
				} else {
					currentChunk += (currentChunk ? '. ' : '') + sentence;
				}
			}
		} else {
			// Try adding section to current chunk
			if (currentChunk.length + section.length + separator.length > maxChunkSize) {
				// Current chunk is full, save it
				if (currentChunk.trim()) {
					chunks.push(currentChunk.trim());
				}
				currentChunk = section;
			} else {
				// Add to current chunk
				currentChunk += (currentChunk ? separator : '') + section;
			}
		}
	}

	// Add final chunk
	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	// Add overlap between chunks
	if (overlap > 0 && chunks.length > 1) {
		const overlappedChunks: string[] = [];
		for (let i = 0; i < chunks.length; i++) {
			let chunk = chunks[i];

			// Add end of previous chunk to start of current
			if (i > 0) {
				const prevChunk = chunks[i - 1];
				if (prevChunk) {
					const overlapText = prevChunk.slice(-overlap);
					chunk = overlapText + ' ' + chunk;
				}
			}

			if (chunk) {
				overlappedChunks.push(chunk);
			}
		}
		return overlappedChunks;
	}

	return chunks;
}

/**
 * Chunk a document and return chunks with metadata
 */
export interface DocumentChunk {
	content: string;
	chunkIndex: number;
	totalChunks: number;
	originalPath: string;
}

export function chunkDocument(
	content: string,
	path: string,
	options: ChunkOptions = {}
): DocumentChunk[] {
	const chunks = chunkText(content, options);
	const totalChunks = chunks.length;

	return chunks.map((chunk, index) => ({
		content: chunk,
		chunkIndex: index,
		totalChunks,
		originalPath: path,
	}));
}
