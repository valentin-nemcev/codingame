import {Game, scoreResults, go} from './tron';
import sampleInput from './sample_input';

describe('Input', () => {
    it('works', () => {
        const game = new Game();
        const readline = (): string => sampleInput.shift() || '';
        go(game, readline, () => {}, () => {});
        console.log(game.grid.dump());
        expect(game.grid.dump()).toMatchSnapshot();
    });
});

describe('Score outcomes', () => {
    test('2 players', () => {
        expect(
            scoreResults(
                [
                    {dir: 'LEFT', depth: 87, isDead: [true, false]},
                    {dir: 'LEFT', depth: 206, isDead: [false, true]},
                    {dir: 'LEFT', depth: 87, isDead: [true, false]},
                    {dir: 'LEFT', depth: 192, isDead: [false, true]},
                    {dir: 'LEFT', depth: 37, isDead: [false, true]},
                    {dir: 'RIGHT', depth: 113, isDead: [false, true]},
                    {dir: 'RIGHT', depth: 113, isDead: [false, true]},
                    {dir: 'RIGHT', depth: 46, isDead: [true, false]},
                    {dir: 'UP', depth: 207, isDead: [false, true]},
                    {dir: 'UP', depth: 111, isDead: [false, true]},
                    {dir: 'UP', depth: 207, isDead: [false, true]},
                    {dir: 'UP', depth: 111, isDead: [false, true]},
                    {dir: 'UP', depth: 180, isDead: [false, true]},
                    {dir: 'UP', depth: 86, isDead: [false, true]},
                    {dir: 'UP', depth: 82, isDead: [false, true]},
                    {dir: 'DOWN', depth: 77, isDead: [false, true]},
                    {dir: 'DOWN', depth: 226, isDead: [true, false]},
                    {dir: 'DOWN', depth: 208, isDead: [true, false]},
                ],
                2,
            ),
        ).toMatchSnapshot();
        expect(
            scoreResults(
                [
                    {dir: 'UP', depth: 10, isDead: [true, false]},
                    {dir: 'DOWN', depth: 54, isDead: [false, true]},
                ],
                2,
            ),
        ).toMatchSnapshot();
    });
});

describe('Iterate', () => {
    test.skip('forEachPossibleTurn', () => {
        const game = new Game();
        game.addPlayer({x: 1, y: 10});
        game.addPlayer({x: 12, y: 17});
        game.addPlayer({x: 3, y: 5});
        game.stepPlayer(0, {x: 2, y: 10});
        game.stepPlayer(1, {x: 12, y: 18});
        const before = game.grid.dump();
        // game.iterator.forEachPossibleTurn(() =>
        //     expect(game.grid.dump()).toMatchSnapshot(),
        // );
        const after = game.grid.dump();
        expect(after).toEqual(before);
    });

    test('iterate lost', () => {
        const game = new Game();
        game.addPlayer({x: 1, y: 1});
        game.addPlayer({x: 0, y: 0});
        game.stepPlayer(0, {x: 2, y: 1});
        game.stepPlayer(1, {x: 1, y: 0});
        game.stepPlayer(0, {x: 2, y: 0});
        console.log(game.iterator.findBestDir());
    });

    test('iterate 1', () => {
        const game = new Game();
        game.addPlayer({x: 0, y: 0});
        game.addPlayer({x: 12, y: 17});
        game.addPlayer({x: 3, y: 5});
        console.log(game.iterator.findBestDir());
    });

    test('iterate 2', () => {
        const game = new Game();
        game.addPlayer({x: 0, y: 0});
        game.addPlayer({x: 12, y: 17});
        game.stepPlayer(0, {x: 1, y: 0});
        // game.stepPlayer(2, {x: 3, y: 5});
        console.log(game.iterator.findBestDir());
    });
});
