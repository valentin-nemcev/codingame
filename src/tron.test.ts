import {pos, readState, Game} from './tron';
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
            startPosList: [pos(29, 9), pos(10, 1)],
            posList: [pos(29, 9), pos(10, 1)],
        });
        expect(game.toString()).toMatchSnapshot();
    });

    test('Start position when my index is 1', () => {
        const game = new Game();
        game.stepFromInput({
            myIdx: 1,
            startPosList: [pos(29, 9), pos(10, 1)],
            posList: [pos(29, 8), pos(10, 1)],
        });
        expect(game.toString()).toMatchSnapshot();
    });

    test('Start position when my index is 2', () => {
        const game = new Game();
        game.stepFromInput({
            myIdx: 2,
            startPosList: [pos(29, 9), pos(10, 1), pos(16, 12)],
            posList: [pos(29, 8), pos(11, 1), pos(16, 12)],
        });
        expect(game.toString()).toMatchSnapshot();
    });

    test('Dead player', () => {
        const game = new Game();
        game.stepFromInput({
            myIdx: 2,
            startPosList: [pos(29, 9), pos(10, 1), pos(16, 12)],
            posList: [pos(29, 8), pos(-1, -1), pos(16, 12)],
        });
        expect(game.toString()).toMatchSnapshot();
        expect(game.players).toMatchSnapshot();
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

function sideBySide(...inputs: string[]): string {
    const inputLines = inputs.map(i => i.split('\n'));
    const inputWidths = inputLines.map(ll =>
        Math.max(0, ...ll.map(l => l.length)),
    );
    const outputLines: string[] = [];
    const length = Math.max(...inputLines.map(l => l.length));
    for (let i = 0; i < length; i++) {
        outputLines.push(
            inputLines
                .map((ll, j) => (ll[i] || '').padEnd(inputWidths[j]))
                .join('  '),
        );
    }

    return outputLines.join('\n');
}

function collectResults(game: Game): string {
    const results: [string, string, string][] = [];
    // eslint-disable-next-line @typescript-eslint/unbound-method
    game.iterator.results.onResult = (score, playerIdx): void => {
        const i = results.length;
        if (playerIdx >= 0) game.unmarkPlayerDead(playerIdx);
        results.push([game.toString(), score.toFixed(4), '#' + i]);
        if (playerIdx >= 0) game.markPlayerDead(playerIdx);
    };
    game.iterator.findBestDir();
    return results
        .sort(([a], [b]) => a.localeCompare(b))
        .map(ss => sideBySide(...ss))
        .join('\n\n');
}

describe('Iterator', () => {
    test('Single player', () => {
        const game = new Game({grid: {width: 4, height: 4}});
        game.addPlayer(pos(0, 0));

        expect(collectResults(game)).toMatchSnapshot();

        expect(game.toString()).toMatchSnapshot();
    });

    test('Two players', () => {
        const game = new Game({grid: {width: 4, height: 4}});
        game.addPlayer(pos(0, 0));
        game.addPlayer(pos(3, 3));

        expect(collectResults(game)).toMatchSnapshot();

        expect(game.toString()).toMatchSnapshot();
        expect(game.iterator.results.toString()).toMatchSnapshot();
    });

    test('Three players', () => {
        const game = new Game({grid: {width: 4, height: 4}});
        game.addPlayer(pos(0, 0));
        game.addPlayer(pos(0, 3));
        game.addPlayer(pos(3, 3));

        expect(collectResults(game)).toMatchSnapshot();

        expect(game.toString()).toMatchSnapshot();
        expect(game.iterator.results.toString()).toMatchSnapshot();
    });

    test('Two players, larger grid', () => {
        const game = new Game({grid: {width: 15, height: 10}});
        game.addPlayer(pos(7, 5));
        game.addPlayer(pos(0, 0));
        game.stepPlayer(1, pos(1, 0));

        game.iterator.startTurn({timeBudget: 150});

        // eslint-disable-next-line @typescript-eslint/unbound-method
        game.iterator.results.onResult = (score): void => {
            // console.log(score);
            if (isNaN(score)) {
                game.players.forEach(p => (p.isDead = false));
                console.log(game.toString());
            }
            // expect(score).toMatchSnapshot();
            // expect(game.toString()).toMatchSnapshot();
        };
        game.iterator.findBestDir();
        const approxScores = Object.entries(game.iterator.results.scores).map(
            ([dir, {sum, count}]) =>
                dir + ': ' + Math.round((sum / count) * 10),
        );
        console.log(approxScores);
        expect(approxScores).toMatchSnapshot();
    });
});
