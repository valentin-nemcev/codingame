declare const readline: () => string;
import os from 'os';

import {dirToWord} from './dir';
import {pos} from './pos';
import Game from './game';
import {readState} from './input';

const timeBudget = 90;

function go(
    game: Game,
    readline: () => string,
    writeline: (s: string) => void,
): void {
    console.error(os.cpus().length);
    console.error(process.version);
    console.error(process.execArgv);
    for (let turn = 0; ; turn++) {
        const input = readState(readline);
        if (input == null) break;

        game.iterator.startTurn({timeBudget});
        game.stepFromInput(input);

        const dir = game.iterator.findBestDir();

        writeline(dir != null ? dirToWord(dir) : 'AAAAA!');
    }
}

const log = console.error.bind(console);
export {readState, Game, go, pos};
if (require.main === module) {
    go(new Game({log}), readline, console.log.bind(console));
}
