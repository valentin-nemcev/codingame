"use strict";
exports.__esModule = true;
var posCache = Array(1 << 12)
    .fill(null)
    .map(function (_, i) {
    var x = (i >> 6) - 15;
    var y = (i % (1 << 6)) - 15;
    return { x: x, y: y };
});
exports.pos = function (x, y) {
    return posCache[((x + 15) << 6) + (y + 15)];
};
function isPosUnset(_a) {
    var x = _a.x, y = _a.y;
    return x == -1 && y == -1;
}
exports.isPosUnset = isPosUnset;
function posToString(_a) {
    var x = _a.x, y = _a.y;
    return x + ", " + y;
}
exports.posToString = posToString;
