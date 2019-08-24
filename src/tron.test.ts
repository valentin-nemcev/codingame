import {Grid, go} from './tron';
import sampleInput from './sample_input';

describe('Input', () => {
    it('works', () => {
        const grid = new Grid();
        const readline = (): string => sampleInput.shift() || '';
        go(grid, readline, () => {}, () => {});
        expect(grid.dump()).toMatchSnapshot();
    });
});

describe('Iterate', () => {
    test('forEachPossibleTurn', () => {
        const grid = new Grid();
        grid.stepPlayer(0, {x: 1, y: 10});
        grid.stepPlayer(1, {x: 12, y: 17});
        grid.stepPlayer(2, {x: 3, y: 5});
        grid.stepPlayer(0, {x: 2, y: 10});
        grid.stepPlayer(1, {x: 12, y: 18});
        const before = grid.dump();
        grid.forEachPossibleTurn(() => expect(grid.dump()).toMatchSnapshot());
        const after = grid.dump();
        expect(after).toEqual(before);
    });

    test('iterate', () => {
        const grid = new Grid();
        grid.stepPlayer(0, {x: 1, y: 10});
        grid.stepPlayer(1, {x: 12, y: 17});
        grid.stepPlayer(2, {x: 3, y: 5});
        grid.iterate();
    });
});
