import {Dir, DIRS, dirSides, dirToString} from './dir';
import Game from './game';

class Result {
    dirs: Dir[][];
    scores: number[];
    depth: number;
    timeout: boolean;
    constructor(scores: number[], depth: number, timeout: boolean) {
        this.scores = scores;
        this.dirs = scores.map(() => []);
        this.depth = depth;
        this.timeout = timeout;
    }

    setDir(dir: Dir, playerIdx: number): void {
        this.dirs[playerIdx].push(dir);
    }

    getDir(): Dir | null {
        return this.dirs[0][this.dirs[0].length - 1];
    }

    isBetterThan(that: Result | null, playerIdx: number): boolean {
        if (that == null) return true;
        if (playerIdx === 0) return this.scores[0] > that.scores[0];
        else if (this.scores[0] < that.scores[0]) return true;
        else if (this.scores[0] === that.scores[0]) {
            return this.scores[playerIdx] > that.scores[playerIdx];
        } else return false;
    }

    toString(): string {
        return (
            this.scores.map(s => s.toFixed(6)).join(' ') +
            ' ' +
            (this.depth ? String(this.depth) : '').padStart(3) +
            (this.timeout ? '+' : ' ') +
            ' ' +
            this.dirs
                .map(dirs =>
                    dirs
                        .slice()
                        .reverse()
                        .map(d => dirToString(d))
                        .join(''),
                )
                .filter(Boolean)
                .join(' ')
        );
    }
}

const log = console.error.bind(console);
const logNoop = (): void => {};
export type Log = typeof log;

export class Iterator {
    private log: Log;
    constructor(readonly game: Game, log: Log = logNoop) {
        this.log = log;
        this.startTurn();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onResult = (result: Result, playerIdx: number): void => {};

    private timeBudget = Number.MAX_SAFE_INTEGER;
    private startTs = 0n;

    public turns = -1;
    public resultCount = 0;
    public depth = 0;
    public maxDepth = 0;
    public iteration = 0;

    startTurn({timeBudget = Number.MAX_SAFE_INTEGER} = {}): void {
        this.timeBudget = timeBudget;
        this.startTs = process.hrtime.bigint();
        this.resultCount = 0;
        this.depth = 0;
        this.maxDepth = 0;
        this.iteration = 0;
        this.turns++;
    }

    getTimeSpent(): number {
        return Number(process.hrtime.bigint() - this.startTs) / 1_000_000;
    }

    printTurnStats(): void {
        const ms = this.getTimeSpent();
        this.log(
            'Turn %d: %s ms, %d i/ms, %d depth, %d results, %d iterations',
            this.turns,
            ms.toFixed(0),
            Math.round(this.iteration / ms),
            this.maxDepth,
            this.resultCount,
            this.iteration,
        );
        const {rss, heapTotal, heapUsed} = process.memoryUsage();
        const toMb = (b: number): number => b / (1024 * 1024);
        this.log(
            'Memory: rss %s mb, heap %s/%s mb',
            toMb(rss).toFixed(1),
            toMb(heapUsed).toFixed(1),
            toMb(heapTotal).toFixed(1),
        );
    }

    iterate(playerIdx: number, timeBudgetNs: bigint): Result {
        if (this.depth >= 4 || timeBudgetNs <= 0n) {
            const result = this.getResult(true);
            this.onResult(result, playerIdx);
            return result;
        }
        const players = this.game.players;
        const playerCount = this.game.players.length;
        if (playerIdx >= playerCount) {
            playerIdx = 0;
        }

        while (players[playerIdx].isDead) {
            playerIdx = (playerIdx + 1) % playerCount;
        }
        const player = players[playerIdx];

        this.iteration++;

        let availableDirs: Dir[];
        if (player.dir == null) {
            availableDirs = DIRS.filter(dir =>
                this.game.checkStep(playerIdx, dir),
            );
        } else {
            availableDirs = [];
            if (this.game.checkStep(playerIdx, player.dir)) {
                availableDirs.push(player.dir);
            }

            const sides = dirSides(player.dir);
            for (let i = 0; i < sides.length; i++) {
                if (this.game.checkStep(playerIdx, sides[i])) {
                    availableDirs.push(sides[i]);
                }
            }
        }

        if (availableDirs.length === 0) {
            this.game.markPlayerDead(playerIdx);
            const alive = playerCount - this.game.deadCount;
            let result: Result;
            if (playerIdx === 0 || (playerCount > 1 && alive === 1)) {
                result = this.getResult();
                this.game.unmarkPlayerDead(playerIdx);
                this.onResult(result, playerIdx);
            } else {
                this.depth++;
                result = this.iterate(playerIdx + 1, timeBudgetNs);
                this.depth--;
                this.game.unmarkPlayerDead(playerIdx);
            }
            return result;
        } else {
            let bestResult: Result | null = null;
            for (let i = 0; i < availableDirs.length; i++) {
                let startNs = 0n;
                startNs = process.hrtime.bigint();

                const dir = availableDirs[i];
                const f = availableDirs.length - i;

                this.game.safeStepPlayerDir(playerIdx, dir);

                this.depth++;
                const nextPlayerIdx =
                    this.depth != 2 ? playerIdx + 0 : playerIdx + 1;
                const result = this.iterate(
                    nextPlayerIdx,
                    timeBudgetNs / BigInt(f),
                );
                this.depth--;

                result.setDir(dir, playerIdx);
                if (result.isBetterThan(bestResult, playerIdx)) {
                    bestResult = result;
                }

                this.game.stepBack(playerIdx);

                if (this.depth === 0) this.log(result.toString());

                timeBudgetNs -= process.hrtime.bigint() - startNs;
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return bestResult!;
        }
    }
    getScores(initial = false): number[] {
        const scores = this.game.grid.floodfill(this.game.players, initial);
        let total = 0;
        for (let i = 0; i < scores.length; i++) total += scores[i];
        for (let i = 0; i < scores.length; i++) scores[i] /= total;
        return scores;
    }

    getResult(timeout = false): Result {
        if (this.maxDepth < this.depth) this.maxDepth = this.depth;
        this.resultCount++;

        const result = new Result(this.getScores(), this.depth, timeout);
        return result;
    }

    findBestDir(): Dir | null {
        this.log(
            new Result(this.getScores(true), this.depth, false).toString(),
        );
        const result = this.iterate(
            0,
            BigInt(this.timeBudget) * 1_000_000n -
                (process.hrtime.bigint() - this.startTs),
        );

        this.printTurnStats();
        return result.getDir();
    }
}
