declare const readline: () => string

function last<T>(a: T[]): T | undefined {
    return a[a.length - 1]
}

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

function readState(): {me: Pos; others: Pos[]} {
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

type CellState = null | 'me' | 'other';

class State {
    me: Pos[] = [];
    others: Pos[][] = [];
    grid: CellState[][] = [];

    constructor() {
        for(let x = 0; x < fieldWidth; x++) {
            this.grid[x] = [];
            for(let y = 0; y < fieldHeight; y++)
                this.grid[x][y] = null;
        }
    }

    append({me, others}: {me: Pos; others: Pos[]}): void {
        this.me.push(me);
        others.forEach((pos, i) => {
            if (!this.others[i]) this.others[i] = []
            this.others[i].push(pos);
        })
        this.grid[me.x][me.y] = 'me';
        others.forEach(pos => this.grid[pos.x][pos.y] = 'other');
    }

    isPosEmpty({x, y}: Pos): boolean {
        return 0 <= x && x < fieldWidth && 0 <= y && y < fieldHeight
            && !this.grid[x][y];
    }
}

const state = new State();

type Dir = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
const shift: {[dir in Dir]: (p: Pos) => Pos} = {
    'LEFT': ({x, y}) => ({x: x - 1, y}),
    'RIGHT': ({x, y}) => ({x: x + 1, y}),
    'UP': ({x, y}) => ({x, y: y - 1}),
    'DOWN': ({x, y}) => ({x, y: y + 1}),
}

const dirs: Dir[] = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
shuffle(dirs);

type Way = {start: Pos; dist: number};

function trace(prevPos: Pos, dir: Dir): {dist: number; lastPos: Pos} {
    let dist;
    let pos;
    for (dist = 0; dist < 100; dist++) {
        pos = shift[dir](prevPos);
        if (!state.isPosEmpty(pos)) break;
        prevPos = pos;
    }
    return {dist, lastPos: prevPos};
}

function bestDir(pos: Pos, iterationsLeft = 5): {dir: Dir; dist: number} {
    let outputDir = dirs[0];
    let maxDist = 0;
    if (!iterationsLeft) return {dir: outputDir, dist: 0}
    dirs.forEach(dir => {
        const {dist: firstDist, lastPos} = trace(pos, dir)
        const restDist = firstDist > 0 ? bestDir(lastPos, iterationsLeft-1).dist : 0;
        const dist = firstDist + restDist;
        if (dist > maxDist) {
            maxDist = dist;
            outputDir = dir;
        }
    })
    return {dir: outputDir, dist: maxDist};
}

for (;;) {
    state.append(readState());
    const currentPos = last(state.me) as Pos;

    const {dir} = bestDir(currentPos);

    console.error(dirs.map(dir => [dir, trace(currentPos, dir)]));

    // console.error(state.dump());
    console.log(dir)
}
