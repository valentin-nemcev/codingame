import {Game} from './tron';

const log = console.error.bind(console);
const game = new Game(log);

game.iterator.startTurn({iterationBudget: 100_000});

game.stepFromInput({
    myIdx: 0,
    startPosList: [{x: 29, y: 9}, {x: 10, y: 1}],
    posList: [{x: 29, y: 9}, {x: 10, y: 1}],
});

console.log(game.toString());
// game.stepFromInput({
//     myIdx: 2,
//     startPosList: [{x: 29, y: 9}, {x: 10, y: 1}, {x: 16, y: 12}],
//     posList: [{x: 29, y: 8}, {x: 11, y: 1}, {x: 16, y: 12}],
// });

game.iterator.findBestDir();
// console.log(game.iterator.results.scores);
console.table(game.iterator.getActualBudgetAllocationTable());
