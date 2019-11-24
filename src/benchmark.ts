import {Game, pos} from './tron';

const log = console.error.bind(console);
const game = new Game({log});

game.iterator.startTurn({timeBudget: 10_000});

const posList = [pos(15, 10), pos(0, 0)];
game.stepFromInput({
    myIdx: 0,
    startPosList: posList,
    posList: posList,
});

console.log(game.iterator.findBestDir());
