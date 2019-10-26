import {readState, Game, scoreResults, go} from './tron';

const game = new Game();

game.iterator.startTurn();

game.stepFromInput({
    myIdx: 2,
    startPosList: [{x: 29, y: 9}, {x: 10, y: 1}],
    posList: [{x: 29, y: 8}, {x: 11, y: 1}],
});
// game.stepFromInput({
//     myIdx: 2,
//     startPosList: [{x: 29, y: 9}, {x: 10, y: 1}, {x: 16, y: 12}],
//     posList: [{x: 29, y: 8}, {x: 11, y: 1}, {x: 16, y: 12}],
// });

game.iterator.findBestDir();
