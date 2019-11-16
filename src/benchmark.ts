import {Game} from './tron';

const log = console.error.bind(console);
const game = new Game({log});

game.iterator.startTurn({timeBudget: 10_000});

const pos = [{x: 15, y: 10}, {x: 0, y: 0}];
game.stepFromInput({
    myIdx: 0,
    startPosList: pos,
    posList: pos,
});

console.log(game.toString());

game.iterator.findBestDir();
console.log(game.iterator.results.toString());
