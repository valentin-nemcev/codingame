const {Console} = require('console');
declare const readline: () => string

// function last<T>(a: T[]): T | undefined {
//     return a[a.length - 1]
// }

function shuffle<T extends Array<unknown>>(a: T): T {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function readInts(): number[] {
    return readline().split(' ').map(s => parseInt(s, 10));
}



type Dir = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
const dirs: Dir[] = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
const shift: {[dir in Dir]: (p: Pos) => Pos} = {
    'LEFT': ({x, y}) => ({x: x - 1, y}),
    'RIGHT': ({x, y}) => ({x: x + 1, y}),
    'UP': ({x, y}) => ({x, y: y - 1}),
    'DOWN': ({x, y}) => ({x, y: y + 1}),
}

const opposite: {[dir in Dir]: Dir} = {
    'LEFT': 'RIGHT',
    'RIGHT': 'LEFT',
    'UP': 'DOWN',
    'DOWN': 'UP',
}


type Way = {start: Pos; dist: number};
type Poss = {me: Pos; others: Pos[]}
function readState(): Poss {
    const [playerCount, myIndex] = readInts();
    const positions = []
    for (let i = 0; i < playerCount; i++) {
        const [,,x,y] = readInts()
        positions.push({x,y});
    }

    const me = positions.splice(myIndex, 1)[0]
    return {me, others: positions}
}

const fieldWidth = 30;
const fieldHeight = 20;

interface Pos {
    x: number;
    y: number;
}

type CellState = '' | 'me' | 'other';
const stateChar: {[state in CellState]: string} = {
    '': ' ',
    'me': '0',
    'other': 'x',
}

class State {
    me: Pos[] = [];
    others: Pos[][] = [];

    private grid: CellState[] = [];

    constructor() {
        this.grid.length = fieldWidth * fieldHeight
        this.grid.fill('')
    }

    private getCell({x, y}: Pos): CellState {
        return this.grid[y * fieldWidth + x];
    }

    private setCell({x, y}: Pos, s: CellState): void {
        this.grid[y * fieldWidth + x] = s;
    }

    dump(): string {
        let result = '';
        for(let y = 0; y < fieldHeight; y++) {
            let line = ''
            for(let x = 0; x < fieldWidth; x++)
                line += stateChar[this.getCell({x, y})];
            result += line + "\n";
        }
        return result;
    }

    append({me, others}: {me: Pos; others: Pos[]}): void {
        this.me.push(me);
        others.forEach((pos, i) => {
            if (!this.others[i]) this.others[i] = []
            this.others[i].push(pos);
        })
        this.setCell(me, 'me');
        others.forEach(pos => this.setCell(pos, 'other'));
    }

    isPosEmpty({x, y}: Pos): boolean {
        return 0 <= x && x < fieldWidth && 0 <= y && y < fieldHeight
            && !this.getCell({x, y})
    }


    trace(prevPos: Pos, dir: Dir): {dist: number; lastPos: Pos} {
        let dist;
        let pos;
        for (dist = 0; dist < 100; dist++) {
            pos = shift[dir](prevPos);
            if (!this.isPosEmpty(pos)) break;
            prevPos = pos;
            this.setCell(pos, 'me');
        }
        return {dist, lastPos: prevPos};
    }

    untrace(pos: Pos, dir: Dir, maxDist: number): void {
        let dist;
        for (dist = 0; dist < maxDist; dist++) {
            this.setCell(pos, '');
            pos = shift[dir](pos);
        }
    }
}

function bestDir(state: State, pos: Pos, iterationsLeft = 5): {dir: Dir; dist: number} {
    let outputDir = dirs[0];
    let maxDist = 0;
    if (!iterationsLeft) return {dir: outputDir, dist: 0}
    dirs.forEach(dir => {
        const {dist: firstDist, lastPos} = state.trace(pos, dir)
        const restDist = firstDist > 0 
            ? bestDir(state, lastPos, iterationsLeft-1).dist : 0;
        state.untrace(lastPos, opposite[dir], firstDist)
        const dist = firstDist + restDist;
        if (dist > maxDist) {
            maxDist = dist;
            outputDir = dir;
        }
    })
    return {dir: outputDir, dist: maxDist};
}

const log = console.error
{
    const state = new State();

    shuffle(dirs);

    for (let turn = 0;;turn++) {
        const startHr = process.hrtime();

        const endHr = process.hrtime(startHr)

        console.time('Turn ' + turn);
        const poss = readState();
        state.append(poss);
        const {me: myPos} = poss

        // log(myPos, otherPos);

        const {dir} = bestDir(state, myPos);

        log(state.dump())
        console.log(dir)
        log('Turn %d: %dms', turn, endHr[1] / 1000)
    }
}
