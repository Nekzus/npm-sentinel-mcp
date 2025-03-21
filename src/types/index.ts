export interface Card {
	value: string;
	suit: string;
}

export interface ServerResponse<T> {
	content: Array<{
		type: string;
		text: string;
		data?: T;
	}>;
}

export type Suit = '♠️ Spades' | '♥️ Hearts' | '♦️ Diamonds' | '♣️ Clubs';
export type Value = 'Ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
