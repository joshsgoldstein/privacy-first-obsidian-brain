/**
 * Tracer Factory
 *
 * Creates the appropriate tracer implementation based on settings.
 * Follows the same pattern as the providers/ directory.
 */

import type { BaseTracer } from './BaseTracer';
import { OpikTracer } from './OpikTracer';
import { NoOpTracer } from './NoOpTracer';
import type { Settings } from '../types';

/**
 * Create a tracer based on settings
 * Returns NoOpTracer if tracing is disabled
 */
export function createTracer(settings: Settings): BaseTracer {
	// Check if Opik is enabled
	if (settings.opikEnabled && settings.opikUrl) {
		return new OpikTracer(settings);
	}

	// Add more tracers here in the future:
	// if (settings.langfuseEnabled && settings.langfuseUrl) {
	//     return new LangfuseTracer(settings);
	// }

	// Default: no-op tracer (tracing disabled)
	return new NoOpTracer();
}

// Export types for external use
export type { BaseTracer, TraceHandle, SpanHandle } from './BaseTracer';
