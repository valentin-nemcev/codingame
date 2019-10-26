import {readState, Game, scoreResults, go} from './tron';
import sampleInput from './sample_input';

describe.skip('Input', () => {
    it('works', () => {
        const game = new Game();
        const readline = (): string => sampleInput.shift() || '';
        go(game, readline, () => {});
        console.log(game.toString());
        expect(game.toString()).toMatchSnapshot();
    });
});

describe('Game', () => {
    test('Read input', () => {
        let line = 0;
        const readline = (): string => sampleInput[line++] || '';
        const game = new Game();
        while (line < sampleInput.length) {
            const input = readState(readline);
            if (!input) break;
            game.stepFromInput(input);
        }
        console.log(game.toString());
        expect(game.toString()).toMatchSnapshot();
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
