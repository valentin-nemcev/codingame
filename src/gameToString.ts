import {Dir, oppositeDir, dirToWord} from './dir';
import Game, {Cell, CellIdx} from './game';

const TRAIL_CHARS: {[key: string]: string} = {
    UNKNOWN: '? ',

    EMPTY: '  ',

    FILL: '⋅ ◆ ⋅ ◇ ⋅ ○ ',
    // FILL: '▤ ▥ ▧ ▨ ▩ ▦ ',

    STARTEND: '0 1 2 ',

    LEFTEND: '◄━◄═◄─',
    RIGHTEND: '► ',
    UPEND: '▲ ',
    DOWNEND: '▼ ',

    STARTLEFT: '0 1 2 ',
    STARTRIGHT: '0━1═2─',
    STARTUP: '0 1 2 ',
    STARTDOWN: '0 1 2 ',

    LEFTLEFT: '━━══──',
    RIGHTRIGHT: '━━══──',

    LEFTUP: '┗━╚═└─',
    DOWNRIGHT: '┗━╚═└─',

    LEFTDOWN: '┏━╔═┌─',
    UPRIGHT: '┏━╔═┌─',

    RIGHTUP: '┛ ╝ ┘ ',
    DOWNLEFT: '┛ ╝ ┘ ',

    RIGHTDOWN: '┓ ╗ ┐ ',
    UPLEFT: '┓ ╗ ┐ ',

    UPUP: '┃ ║ │ ',
    DOWNDOWN: '┃ ║ │ ',
};

export default function gameToString(game: Game): string {
    const canvas = game.grid.grid.map((cell: Cell) => {
        if (
            cell.distanceTo == -1 ||
            cell.floodfillCounter !== game.grid.floodfillCounter
        ) {
            return TRAIL_CHARS.EMPTY;
        }
        const i = cell.distanceTo * 4 + Number(cell.isBorder) * 2;
        return TRAIL_CHARS.FILL.slice(i, i + 2);
    });
    const draw = (cellIdx: CellIdx, c: string): void => {
        canvas[cellIdx] = c;
    };
    const getTrail = (
        playerIdx: number,
        tailDir: Dir | null,
        headDir: Dir | null,
    ): string => {
        const trail =
            (tailDir != null ? dirToWord(tailDir) : 'START') +
            (headDir != null ? dirToWord(headDir) : 'END');
        const chars = TRAIL_CHARS[trail] || TRAIL_CHARS.UNKNOWN;
        let i = playerIdx * 2;
        i = i >= chars.length ? 0 : i;
        return chars.slice(i, i + 2);
    };
    game.players.forEach((player, i) => {
        if (player.isDead) return;
        let headCellIdx: CellIdx | null = null;
        let headDir: Dir | null = null;
        let tailCellIdx = player.cellIdx;
        let tailDir = game.grid.cellAt(tailCellIdx).dir;
        for (;;) {
            if (headDir != null && headCellIdx != null) {
                tailCellIdx = game.grid.safeShiftCellIdx(
                    oppositeDir(headDir),
                    headCellIdx,
                );
                tailDir = game.grid.cellAt(tailCellIdx).dir;
            }
            draw(tailCellIdx, getTrail(i, tailDir, headDir));
            if (tailDir == null) break;
            headCellIdx = tailCellIdx;
            headDir = tailDir;
        }
    });
    const grid =
        canvas.reduce(
            (s, c, i) =>
                s +
                (i % game.grid.width === 0 ? '  ' : '') +
                ((i + 1) % game.grid.width === 0 ? c.slice(0, -1) + '\n' : c),
            '┌╴\n',
        ) +
        '  '.repeat(game.grid.width) +
        ' ╶┘\n';
    return grid + game.getNonEmptyCount() + '/' + game.grid.size;
}
