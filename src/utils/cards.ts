import { Card, Suit, Value } from '../types/index.js';

export const SUITS: Suit[] = ['♠️ Spades', '♥️ Hearts', '♦️ Diamonds', '♣️ Clubs'];
export const VALUES: Value[] = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function getRandomCard(): Card {
    const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const randomValue = VALUES[Math.floor(Math.random() * VALUES.length)];

    return {
        suit: randomSuit,
        value: randomValue
    };
} 