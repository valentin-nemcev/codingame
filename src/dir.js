"use strict";
var _a, _b, _c, _d;
exports.__esModule = true;
var pos_1 = require("./pos");
exports.DIRS = [0 /* LEFT */, 1 /* RIGHT */, 2 /* UP */, 3 /* DOWN */];
exports.deriveDir = function (prev, next) {
    var xDiff = next.x - prev.x;
    var yDiff = next.y - prev.y;
    if (xDiff === -1 && yDiff === 0)
        return 0 /* LEFT */;
    if (xDiff === 1 && yDiff === 0)
        return 1 /* RIGHT */;
    if (xDiff === 0 && yDiff === -1)
        return 2 /* UP */;
    if (xDiff === 0 && yDiff === 1)
        return 3 /* DOWN */;
    throw new Error("No single step from " + pos_1.posToString(prev) + " to " + pos_1.posToString(next));
};
var OPPOSITES = (_a = {},
    _a[0 /* LEFT */] = 1 /* RIGHT */,
    _a[1 /* RIGHT */] = 0 /* LEFT */,
    _a[2 /* UP */] = 3 /* DOWN */,
    _a[3 /* DOWN */] = 2 /* UP */,
    _a);
exports.oppositeDir = function (dir) { return OPPOSITES[dir]; };
var SIDES = (_b = {},
    _b[0 /* LEFT */] = [2 /* UP */, 3 /* DOWN */],
    _b[1 /* RIGHT */] = [2 /* UP */, 3 /* DOWN */],
    _b[2 /* UP */] = [0 /* LEFT */, 1 /* RIGHT */],
    _b[3 /* DOWN */] = [0 /* LEFT */, 1 /* RIGHT */],
    _b);
exports.dirSides = function (dir) { return SIDES[dir]; };
var DIR_CHARS = (_c = {},
    _c[0 /* LEFT */] = '<',
    _c[1 /* RIGHT */] = '>',
    _c[2 /* UP */] = '↑',
    _c[3 /* DOWN */] = '↓',
    _c);
exports.dirToString = function (dir) { return DIR_CHARS[dir]; };
var DIR_WORDS = (_d = {},
    _d[0 /* LEFT */] = 'LEFT',
    _d[1 /* RIGHT */] = 'RIGHT',
    _d[2 /* UP */] = 'UP',
    _d[3 /* DOWN */] = 'DOWN',
    _d);
exports.dirToWord = function (dir) { return DIR_WORDS[dir]; };
