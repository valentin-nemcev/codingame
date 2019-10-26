import {readState, Game, Results} from './tron';
import sampleInput from './sample_input';

function feedInput(game: Game, input: string[]): void {
    let line = 0;
    const readline = (): string => input[line++] || '';
    while (line < input.length) {
        const input = readState(readline);
        if (!input) break;
        game.stepFromInput(input);
    }
}

describe('Game', () => {
    test('Sample input', () => {
        const game = new Game();
        feedInput(game, sampleInput);
        expect(game.toString()).toMatchSnapshot();
    });

    test('Start position when my index is 0', () => {
        const game = new Game();
        game.stepFromInput({
            myIdx: 0,
            startPosList: [{x: 29, y: 9}, {x: 10, y: 1}],
            posList: [{x: 29, y: 9}, {x: 10, y: 1}],
        });
        expect(game.toString()).toMatchSnapshot();
    });

    test('Start position when my index is 1', () => {
        const game = new Game();
        game.stepFromInput({
            myIdx: 1,
            startPosList: [{x: 29, y: 9}, {x: 10, y: 1}],
            posList: [{x: 29, y: 8}, {x: 10, y: 1}],
        });
        expect(game.toString()).toMatchSnapshot();
    });

    test('Start position when my index is 2', () => {
        const game = new Game();
        game.stepFromInput({
            myIdx: 2,
            startPosList: [{x: 29, y: 9}, {x: 10, y: 1}, {x: 16, y: 12}],
            posList: [{x: 29, y: 8}, {x: 11, y: 1}, {x: 16, y: 12}],
        });
        expect(game.toString()).toMatchSnapshot();
    });
});

const LEFT = 'LEFT' as const;
const RIGHT = 'RIGHT' as const;
const UP = 'UP' as const;
const DOWN = 'DOWN' as const;

describe('Score outcomes', () => {
    test('2 players', () => {
        const results = new Results();
        [
            {dir: LEFT, depth: 87, isDead: [true, false]},
            {dir: LEFT, depth: 206, isDead: [false, true]},
            {dir: LEFT, depth: 87, isDead: [true, false]},
            {dir: LEFT, depth: 192, isDead: [false, true]},
            {dir: LEFT, depth: 37, isDead: [false, true]},
            {dir: RIGHT, depth: 113, isDead: [false, true]},
            {dir: RIGHT, depth: 113, isDead: [false, true]},
            {dir: RIGHT, depth: 46, isDead: [true, false]},
            {dir: UP, depth: 207, isDead: [false, true]},
            {dir: UP, depth: 111, isDead: [false, true]},
            {dir: UP, depth: 207, isDead: [false, true]},
            {dir: UP, depth: 111, isDead: [false, true]},
            {dir: UP, depth: 180, isDead: [false, true]},
            {dir: UP, depth: 86, isDead: [false, true]},
            {dir: UP, depth: 82, isDead: [false, true]},
            {dir: DOWN, depth: 77, isDead: [false, true]},
            {dir: DOWN, depth: 226, isDead: [true, false]},
            {dir: DOWN, depth: 208, isDead: [true, false]},
        ].forEach(result => results.add(result));
        expect(results.scores).toMatchSnapshot();
    });

    test('Some dirs', () => {
        const results = new Results();
        [
            {dir: UP, depth: 10, isDead: [true, false]},
            {dir: DOWN, depth: 54, isDead: [false, true]},
        ].forEach(result => results.add(result));
        expect(results.scores).toMatchSnapshot();
    });
});
