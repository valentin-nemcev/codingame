import {readState, Game, Results} from './tron';
import sampleInput from './sample_input';
import sampleInput2 from './sample_input2';

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

    test('All alive, zero depth', () => {
        const results = new Results();
        [
            {dir: LEFT, depth: 87, isDead: [false, false]},
            {dir: LEFT, depth: 206, isDead: [false, false]},
            {dir: LEFT, depth: 87, isDead: [false, false]},
            {dir: LEFT, depth: 192, isDead: [false, false]},
            {dir: LEFT, depth: 37, isDead: [false, false]},
            {dir: RIGHT, depth: 0, isDead: [false, false]},
            {dir: RIGHT, depth: 0, isDead: [false, false]},
            {dir: RIGHT, depth: 0, isDead: [false, false]},
            {dir: UP, depth: 207, isDead: [false, false]},
            {dir: UP, depth: 111, isDead: [false, false]},
            {dir: UP, depth: 207, isDead: [false, false]},
            {dir: UP, depth: 111, isDead: [false, false]},
            {dir: UP, depth: 180, isDead: [false, false]},
            {dir: UP, depth: 86, isDead: [false, false]},
            {dir: UP, depth: 82, isDead: [false, false]},
            {dir: DOWN, depth: 77, isDead: [false, false]},
            {dir: DOWN, depth: 226, isDead: [false, false]},
            {dir: DOWN, depth: 208, isDead: [false, false]},
        ].forEach(result => results.add(result));
        expect(results.scores).toMatchSnapshot();
    });
});

describe('Flood fill', () => {
    test('Sample input', () => {
        const game = new Game();
        feedInput(game, sampleInput2);
        expect(game.grid.floodfill(game.players)).toMatchSnapshot();
        expect(game.toString()).toMatchSnapshot();
    });

    test('Sample input 2', () => {
        const game = new Game();
        feedInput(game, sampleInput2.concat(['2 0', '8 12 0 13', '7 8 20 4']));
        expect(game.grid.floodfill(game.players)).toMatchSnapshot();
        expect(game.toString()).toMatchSnapshot();
    });

    test('Sample input 3', () => {
        const game = new Game();
        feedInput(
            game,
            sampleInput2.concat([
                '2 0',
                '8 12 0 13',
                '7 8 20 4',
                '2 0',
                '8 12 0 12',
                '7 8 21 4',
            ]),
        );
        expect(game.grid.floodfill(game.players)).toMatchSnapshot();
        expect(game.toString()).toMatchSnapshot();
    });

    test('Consecutive', () => {
        const game1 = new Game();
        const game2 = new Game();
        feedInput(game1, sampleInput2);
        feedInput(game2, sampleInput2);
        feedInput(game1, ['2 0', '8 12 0 13', '7 8 20 4']);
        feedInput(game2, ['2 0', '8 12 0 13', '7 8 20 4']);
        game1.grid.floodfill(game1.players);

        feedInput(game1, ['2 0', '8 12 0 12', '7 8 21 4']);
        feedInput(game2, ['2 0', '8 12 0 12', '7 8 21 4']);
        expect(game1.grid.floodfill(game1.players)).toEqual(
            game2.grid.floodfill(game2.players),
        );
        expect(game1.grid.toString()).toEqual(game2.grid.toString());
    });
});
