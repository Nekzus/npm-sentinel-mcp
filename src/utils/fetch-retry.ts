import fetch from 'node-fetch';

const HTTP_MAX_RETRIES = 3;
const HTTP_INITIAL_BACKOFF_MS = 1000;
const HTTP_MAX_CONCURRENT_REQUESTS = 5;
const HTTP_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_HEADERS = {
	Accept: 'application/json',
	'User-Agent': 'NPM-Sentinel-MCP/1.x',
};

let activeRequests = 0;
const requestQueue: (() => void)[] = [];

function acquireSlot(): Promise<void> {
	if (activeRequests < HTTP_MAX_CONCURRENT_REQUESTS) {
		activeRequests++;
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		requestQueue.push(() => {
			activeRequests++;
			resolve();
		});
	});
}

function releaseSlot(): void {
	activeRequests--;
	const next = requestQueue.shift();
	if (next) next();
}

export async function fetchWithRetry(
	url: string,
	options: any = {},
	config: { maxRetries?: number; skipThrottle?: boolean; timeoutMs?: number } = {},
): Promise<any> {
	const maxRetries = config.maxRetries ?? HTTP_MAX_RETRIES;
	const timeoutMs = config.timeoutMs ?? HTTP_REQUEST_TIMEOUT_MS;
	const mergedHeaders = { ...DEFAULT_HEADERS, ...(options.headers || {}) };
	const mergedOptions = { ...options, headers: mergedHeaders };

	if (!config.skipThrottle) {
		await acquireSlot();
	}

	try {
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
			const signal = options.signal
				? AbortSignal.any([options.signal, controller.signal])
				: controller.signal;

			try {
				const response = await fetch(url, { ...mergedOptions, signal });

				if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
					if (attempt < maxRetries) {
						const retryAfter = response.headers.get('retry-after');
						const waitMs = retryAfter
							? parseInt(retryAfter, 10) * 1000
							: HTTP_INITIAL_BACKOFF_MS * 2 ** attempt;
						await new Promise((resolve) => setTimeout(resolve, waitMs));
						continue;
					}
				}
				return response;
			} catch (err) {
				if (options.signal?.aborted) {
					throw err;
				}
				if (attempt < maxRetries) {
					const waitMs = HTTP_INITIAL_BACKOFF_MS * 2 ** attempt;
					await new Promise((resolve) => setTimeout(resolve, waitMs));
					continue;
				}
				throw err;
			} finally {
				clearTimeout(timeoutId);
			}
		}
		throw new Error('Max retries reached');
	} finally {
		if (!config.skipThrottle) {
			releaseSlot();
		}
	}
}
