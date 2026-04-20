/**
 * BaseTracer - Abstract interface for LLM observability platforms
 *
 * Defines the contract that all tracer implementations must follow.
 * This allows swapping between different observability platforms (Opik, Langfuse, etc.)
 * without changing RAGEngine code.
 */

import type { Settings } from '../types';

/**
 * Trace handle returned to callers
 */
export interface TraceHandle {
	/**
	 * Create a nested span within this trace
	 */
	span(config: { name: string; type: string; input: any }): SpanHandle;

	/**
	 * Update trace output and metadata
	 */
	update(config: { output?: any; metadata?: Record<string, any> }): void;

	/**
	 * Mark trace as complete
	 */
	end(): void;
}

/**
 * Span handle returned to callers
 */
export interface SpanHandle {
	/**
	 * Update span output and metadata
	 */
	update(config: { output?: any; metadata?: Record<string, any> }): void;

	/**
	 * Mark span as complete
	 */
	end(): void;
}

/**
 * Base interface that all tracer implementations must follow
 */
export interface BaseTracer {
	/**
	 * Tracer name (e.g., "Opik", "Langfuse")
	 */
	readonly name: string;

	/**
	 * Check if tracing is currently enabled
	 */
	isEnabled(): boolean;

	/**
	 * Start a new trace
	 * Returns null if tracing is disabled
	 */
	startTrace(name: string, input: any): TraceHandle | null;

	/**
	 * Flush all pending traces/spans to the server
	 */
	flush(): Promise<void>;

	/**
	 * Update tracer settings (called when user changes settings)
	 */
	updateSettings(settings: Settings): void | Promise<void>;
}
