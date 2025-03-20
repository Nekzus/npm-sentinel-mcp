interface DateTimeOptions {
    timeZone?: string;
    locale?: string;
}

interface DateTimeResult {
    date: string;
    time: string;
    timeZone: string;
}

export function getCurrentDateTime(options: DateTimeOptions = {}): DateTimeResult {
    const {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale = 'en-US'
    } = options;

    const now = new Date();

    const dateFormatter = new Intl.DateTimeFormat(locale, {
        timeZone,
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const timeFormatter = new Intl.DateTimeFormat(locale, {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    return {
        date: dateFormatter.format(now),
        time: timeFormatter.format(now),
        timeZone
    };
} 