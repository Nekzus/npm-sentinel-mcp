interface DateTimeResult {
	date: string;
	time: string;
	timezone: string;
}

export function getCurrentDateTime(timeZone?: string, locale?: string): DateTimeResult {
	try {
		const now = new Date();
		const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const options: Intl.DateTimeFormatOptions = {
			timeZone: timeZone || defaultTimeZone,
			dateStyle: 'full',
			timeStyle: 'medium',
		};

		const formatter = new Intl.DateTimeFormat(locale || 'en-US', options);
		const [datePart, timePart] = formatter.format(now).split(' at ');

		return {
			date: datePart,
			time: timePart,
			timezone: timeZone || defaultTimeZone,
		};
	} catch (error) {
		console.error('[DateTime] Error formatting date and time:', error);
		const now = new Date();
		const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		return {
			date: now.toLocaleDateString(),
			time: now.toLocaleTimeString(),
			timezone: defaultTimeZone,
		};
	}
}
