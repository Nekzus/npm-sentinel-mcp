export interface ServerResponse<T> {
	content: Array<{
		type: string;
		text: string;
		data?: T;
	}>;
}

export interface Card {
	suit: string;
	value: string;
}

export interface DateTimeResponse {
	date: string;
	time: string;
	timezone: string;
}

export type Suit = '♠️ Spades' | '♥️ Hearts' | '♦️ Diamonds' | '♣️ Clubs';
export type Value = 'Ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
