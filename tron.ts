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


function trace(prevPos: Pos, dir: Dir): [number, Pos] {
    let r;
    let pos;
    for (r = 0; r < 100; r++) {
        pos = shift[dir](prevPos);
        if (!state.isPosEmpty(pos)) break;
        prevPos = pos;
    }
    return [r, prevPos];
}

function bestDir(pos: Pos): [Dir, number] {
    let maxRunway = 0;
    let outputDir = dirs[0];
    dirs.forEach(dir => {
        const [r] = trace(pos, dir)
        if (r > maxRunway) {
            maxRunway = r;
            outputDir = dir;
        }
    })
    return [outputDir, maxRunway];
}

for (;;) {
    state.append(readState());
    const currentPos = last(state.me) as Pos;

    const [outputDir] = bestDir(currentPos);

    console.error(dirs.map(dir => [dir, trace(currentPos, dir)]));

    // console.error(state.dump());
    console.log(outputDir)
}
