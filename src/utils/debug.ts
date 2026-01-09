/**
 * Debug utilities for inspecting the vector store
 */

import { Notice } from 'obsidian';
import type { VectorStore } from '../core/VectorStore';

/**
 * Get vector store statistics
 */
export async function getVectorStoreStats(vectorStore: VectorStore): Promise<{
	totalDocuments: number;
	storageSize: string;
	lastUpdated: string;
}> {
	// This would need to be implemented in VectorStore class
	// For now, return placeholder
	return {
		totalDocuments: 0,
		storageSize: 'Unknown',
		lastUpdated: 'Unknown',
	};
}

/**
 * Export vector store metadata to readable format
 */
export async function exportVectorStoreInfo(
	vectorStore: VectorStore,
	outputPath: string
): Promise<string> {
	// TODO: Implement export functionality
	return 'Not yet implemented';
}

/**
 * Show vector store info in a notice
 */
export function showVectorStoreInfo(stats: { totalDocuments: number; storageSize: string }): void {
	new Notice(`Vector Store:\n${stats.totalDocuments} documents\n${stats.storageSize}`, 5000);
}
