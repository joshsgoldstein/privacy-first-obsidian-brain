/**
 * NoOpTracer - Tracer that does nothing
 *
 * Used when tracing is disabled or no tracer is selected.
 * All methods are no-ops to avoid null checks throughout the codebase.
 */

import type { BaseTracer, TraceHandle, SpanHandle } from './BaseTracer';
import type { Settings } from '../types';

/**
 * No-op span handle
 */
class NoOpSpanHandle implements SpanHandle {
	update(): void {
		// No-op
	}

	end(): void {
		// No-op
	}
}

/**
 * No-op trace handle
 */
class NoOpTraceHandle implements TraceHandle {
	private noOpSpan = new NoOpSpanHandle();

	span(): SpanHandle {
		return this.noOpSpan;
	}

	update(): void {
		// No-op
	}

	end(): void {
		// No-op
	}
}

/**
 * Tracer that does nothing (null object pattern)
 */
export class NoOpTracer implements BaseTracer {
	readonly name = 'None';
	private noOpTrace = new NoOpTraceHandle();

	isEnabled(): boolean {
		return false;
	}

	startTrace(): TraceHandle | null {
		return this.noOpTrace;
	}

	async flush(): Promise<void> {
		// No-op
	}

	updateSettings(_settings: Settings): void {
		// No-op
	}
}
