/**
 * OpikTracer - Opik LLM observability implementation
 *
 * Custom implementation using Obsidian's requestUrl() to avoid CORS issues.
 * The Opik SDK uses fetch() which is blocked by Electron's CORS policy.
 */

import { requestUrl } from 'obsidian';
import type { BaseTracer, TraceHandle, SpanHandle } from './BaseTracer';
import type { Settings } from '../types';

/**
 * Internal Opik trace object
 */
interface OpikTrace {
	id: string;
	name: string;
	input: any;
	output?: any;
	metadata?: Record<string, any>;
	start_time: string;
	end_time?: string;
	spans: OpikSpan[];
}

/**
 * Internal Opik span object
 */
interface OpikSpan {
	id: string;
	trace_id: string;
	name: string;
	type: string;
	input: any;
	output?: any;
	metadata?: Record<string, any>;
	start_time: string;
	end_time?: string;
}

/**
 * Opik tracer implementation using custom CORS-free HTTP client
 */
export class OpikTracer implements BaseTracer {
	readonly name = 'Opik';

	private settings: Settings;
	private enabled: boolean;
	private pendingTraces: OpikTrace[] = [];
	private pendingSpans: OpikSpan[] = [];

	constructor(settings: Settings) {
		this.settings = settings;
		this.enabled = settings.opikEnabled && !!settings.opikUrl;

		if (this.enabled && settings.verboseLogging) {
			console.log('✅ Opik tracer initialized (CORS-free)', {
				url: settings.opikUrl,
				project: settings.opikProjectName || 'smart-second-brain',
			});
		}
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	startTrace(name: string, input: any): TraceHandle | null {
		if (!this.isEnabled()) {
			return null;
		}

		const trace: OpikTrace = {
			id: this.generateId(),
			name,
			input,
			metadata: {
				timestamp: new Date().toISOString(),
				provider: this.settings.activeProvider,
				searchMode: this.settings.searchMode,
			},
			start_time: new Date().toISOString(),
			spans: [],
		};

		this.pendingTraces.push(trace);

		if (this.settings.verboseLogging) {
			console.log(`🔍 Opik trace started: ${name} (${trace.id})`);
		}

		// Return handle with methods
		return {
			span: (config: { name: string; type: string; input: any }): SpanHandle => {
				const span: OpikSpan = {
					id: this.generateId(),
					trace_id: trace.id,
					name: config.name,
					type: config.type,
					input: config.input,
					start_time: new Date().toISOString(),
				};

				trace.spans.push(span);
				this.pendingSpans.push(span);

				if (this.settings.verboseLogging) {
					console.log(`  📊 Opik span started: ${config.name} (${span.id})`);
				}

				return {
					update: (updateConfig: { output?: any; metadata?: Record<string, any> }) => {
						if (updateConfig.output) span.output = updateConfig.output;
						if (updateConfig.metadata) span.metadata = { ...span.metadata, ...updateConfig.metadata };
					},
					end: () => {
						span.end_time = new Date().toISOString();
						if (this.settings.verboseLogging) {
							console.log(`  ✅ Opik span ended: ${config.name}`);
						}
					},
				};
			},
			update: (config: { output?: any; metadata?: Record<string, any> }) => {
				if (config.output) trace.output = config.output;
				if (config.metadata) trace.metadata = { ...trace.metadata, ...config.metadata };
			},
			end: () => {
				trace.end_time = new Date().toISOString();
				if (this.settings.verboseLogging) {
					console.log(`✅ Opik trace ended: ${name}`);
				}
			},
		};
	}

	async flush(): Promise<void> {
		if (!this.isEnabled()) {
			return;
		}

		if (this.pendingTraces.length === 0) {
			return;
		}

		try {
			const baseUrl = this.settings.opikUrl.replace(/\/$/, ''); // Remove trailing slash
			const projectName = this.settings.opikProjectName || 'smart-second-brain';

			// Send traces using batch endpoint
			if (this.pendingTraces.length > 0) {
				await requestUrl({
					url: `${baseUrl}/v1/private/traces/batch`,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Comet-Project-Name': projectName,
						...(this.settings.opikApiKey ? { 'Authorization': `Bearer ${this.settings.opikApiKey}` } : {}),
					},
					body: JSON.stringify({
						traces: this.pendingTraces.map(t => ({
							id: t.id,
							name: t.name,
							input: t.input,
							output: t.output,
							metadata: t.metadata,
							start_time: t.start_time,
							end_time: t.end_time,
							project_name: projectName,
						}))
					}),
				});

				if (this.settings.verboseLogging) {
					console.log(`✅ Sent ${this.pendingTraces.length} traces to Opik`);
				}
			}

			// Send spans using batch endpoint
			if (this.pendingSpans.length > 0) {
				await requestUrl({
					url: `${baseUrl}/v1/private/spans/batch`,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Comet-Project-Name': projectName,
						...(this.settings.opikApiKey ? { 'Authorization': `Bearer ${this.settings.opikApiKey}` } : {}),
					},
					body: JSON.stringify({
						spans: this.pendingSpans.map(s => ({
							id: s.id,
							trace_id: s.trace_id,
							name: s.name,
							type: s.type,
							input: s.input,
							output: s.output,
							metadata: s.metadata,
							start_time: s.start_time,
							end_time: s.end_time,
							project_name: projectName,
						}))
					}),
				});

				if (this.settings.verboseLogging) {
					console.log(`✅ Sent ${this.pendingSpans.length} spans to Opik`);
				}
			}

			// Clear pending items
			this.pendingTraces = [];
			this.pendingSpans = [];

		} catch (error) {
			console.error('❌ Failed to flush Opik traces:', error);
			if (this.settings.verboseLogging) {
				console.error('Error details:', error);
			}
		}
	}

	async updateSettings(settings: Settings): Promise<void> {
		const wasEnabled = this.enabled;
		this.settings = settings;
		this.enabled = settings.opikEnabled && !!settings.opikUrl;

		if (this.enabled && !wasEnabled && settings.verboseLogging) {
			console.log('✅ Opik tracer enabled with new settings');
		} else if (!this.enabled && wasEnabled) {
			// Flush any pending traces before disabling
			this.enabled = true;     // re-enable so flush() doesn't short-circuit
			await this.flush();
			this.enabled = false;    // now actually disable
		}
	}

	/**
	 * Generate a unique ID
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}
