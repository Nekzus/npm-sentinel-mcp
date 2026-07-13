import { beforeEach, describe, expect, test, vi } from 'vitest';

// Realizar el mock de node-fetch antes de importar index.ts
vi.mock('node-fetch', () => {
	return {
		default: vi.fn(),
	};
});

describe('fetchWithRetry', () => {
	let fetchMock: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.useRealTimers();
		const { default: fetch } = await import('node-fetch');
		fetchMock = fetch;
	});

	test('should successfully make a request on first try', async () => {
		const { fetchWithRetry } = await import('../../index');

		fetchMock.mockImplementation(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ success: true }),
				headers: new Map(),
			}),
		);

		const response = await fetchWithRetry('https://example.com/api', {}, { skipThrottle: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const data = await response.json();
		expect(data.success).toBe(true);
	});

	test('should retry on 429 status code', async () => {
		vi.useFakeTimers();
		const { fetchWithRetry } = await import('../../index');

		// 1st attempt: 429, 2nd attempt: 200
		fetchMock
			.mockImplementationOnce(() =>
				Promise.resolve({
					status: 429,
					headers: new Map(),
				}),
			)
			.mockImplementationOnce(() =>
				Promise.resolve({
					status: 200,
					json: () => Promise.resolve({ success: true }),
					headers: new Map(),
				}),
			);

		const fetchPromise = fetchWithRetry('https://example.com/api', {}, { maxRetries: 1, skipThrottle: true });
		
		// Avanzar timers para que el reintento ocurra al instante
		await vi.runAllTimersAsync();
		
		const response = await fetchPromise;
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(response.status).toBe(200);
	});

	test('should retry on 500 status code', async () => {
		vi.useFakeTimers();
		const { fetchWithRetry } = await import('../../index');

		fetchMock
			.mockImplementationOnce(() =>
				Promise.resolve({
					status: 500,
					headers: new Map(),
				}),
			)
			.mockImplementationOnce(() =>
				Promise.resolve({
					status: 200,
					json: () => Promise.resolve({ success: true }),
					headers: new Map(),
				}),
			);

		const fetchPromise = fetchWithRetry('https://example.com/api', {}, { maxRetries: 1, skipThrottle: true });
		await vi.runAllTimersAsync();
		const response = await fetchPromise;
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(response.status).toBe(200);
	});

	test('should not retry on 404 status code', async () => {
		const { fetchWithRetry } = await import('../../index');

		fetchMock.mockImplementation(() =>
			Promise.resolve({
				status: 404,
				headers: new Map(),
			}),
		);

		const response = await fetchWithRetry('https://example.com/api', {}, { maxRetries: 3, skipThrottle: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(404);
	});

	test('should retry on network error/rejection', async () => {
		vi.useFakeTimers();
		const { fetchWithRetry } = await import('../../index');

		fetchMock
			.mockImplementationOnce(() => Promise.reject(new Error('Network Error')))
			.mockImplementationOnce(() =>
				Promise.resolve({
					status: 200,
					json: () => Promise.resolve({ success: true }),
					headers: new Map(),
				}),
			);

		const fetchPromise = fetchWithRetry('https://example.com/api', {}, { maxRetries: 1, skipThrottle: true });
		await vi.runAllTimersAsync();
		const response = await fetchPromise;
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(response.status).toBe(200);
	});
});
