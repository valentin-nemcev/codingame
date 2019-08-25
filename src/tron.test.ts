import {Game, go} from './tron';
import sampleInput from './sample_input';

describe('Input', () => {
    it('works', () => {
        const game = new Game();
        const readline = (): string => sampleInput.shift() || '';
        go(game, readline, () => {}, () => {});
        expect(game.grid.dump()).toMatchSnapshot();
    });
});

describe('Iterate', () => {
    test('forEachPossibleTurn', () => {
        const game = new Game();
        game.stepPlayer(0, {x: 1, y: 10});
        game.stepPlayer(1, {x: 12, y: 17});
        game.stepPlayer(2, {x: 3, y: 5});
        game.stepPlayer(0, {x: 2, y: 10});
        game.stepPlayer(1, {x: 12, y: 18});
        const before = game.grid.dump();
        game.iterator.forEachPossibleTurn(() =>
            expect(game.grid.dump()).toMatchSnapshot(),
        );
        const after = game.grid.dump();
        expect(after).toEqual(before);
    });

    test('iterate lost', () => {
        const game = new Game();
        game.stepPlayer(0, {x: 1, y: 1});
        game.stepPlayer(1, {x: 0, y: 0});
        game.stepPlayer(0, {x: 2, y: 1});
        game.stepPlayer(1, {x: 1, y: 0});
        game.stepPlayer(0, {x: 2, y: 0});
        // game.stepPlayer(2, {x: 3, y: 5});
        console.log(game.iterator.findBestDir());
        console.log(game.grid.dump());
    });

    test('iterate 1', () => {
        const game = new Game();
        game.stepPlayer(0, {x: 0, y: 0});
        game.stepPlayer(1, {x: 12, y: 17});
        // game.stepPlayer(2, {x: 3, y: 5});
        console.log(game.iterator.findBestDir());
    });

    test('iterate 2', () => {
        const game = new Game();
        game.stepPlayer(0, {x: 0, y: 0});
        game.stepPlayer(1, {x: 12, y: 17});
        game.stepPlayer(0, {x: 1, y: 0});
        // game.stepPlayer(2, {x: 3, y: 5});
        console.log(game.iterator.findBestDir());
    });
});
