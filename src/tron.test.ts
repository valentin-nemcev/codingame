import {readState, Game} from './tron';
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

describe('Iterator', () => {
    test('Single player', () => {
        const game = new Game({grid: {width: 4, height: 4}});
        game.addPlayer({x: 0, y: 0});

        // eslint-disable-next-line @typescript-eslint/unbound-method
        game.iterator.results.onResult = (): void => {
            expect(game.toString()).toMatchSnapshot();
        };
        game.iterator.iteratePlayer(0);

        expect(game.toString()).toMatchSnapshot();
    });

    test('Two players', () => {
        const game = new Game({grid: {width: 4, height: 4}});
        game.addPlayer({x: 0, y: 0});
        game.addPlayer({x: 3, y: 3});

        // eslint-disable-next-line @typescript-eslint/unbound-method
        game.iterator.results.onResult = (score): void => {
            // console.log(game.toString());
            // console.log(score);
            expect(score).toMatchSnapshot();
            expect(game.toString()).toMatchSnapshot();
        };
        game.iterator.iteratePlayer(0);

        expect(game.toString()).toMatchSnapshot();
        expect(game.iterator.results.toString()).toMatchSnapshot();
    });

    test('Two players', () => {
        const game = new Game({grid: {width: 5, height: 5}});
        game.addPlayer({x: 0, y: 0});
        game.addPlayer({x: 4, y: 4});

        // eslint-disable-next-line @typescript-eslint/unbound-method
        game.iterator.results.onResult = (): void => {
            // console.log(score);
            console.log(game.toString());
            // expect(score).toMatchSnapshot();
            // expect(game.toString()).toMatchSnapshot();
        };
        game.iterator.iteratePlayer(0);

        expect(game.iterator.results.toString()).toMatchSnapshot();
    });
});
