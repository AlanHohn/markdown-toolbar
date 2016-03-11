/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets */

define(function (require, exports, module) {
    "use strict";

    var EditorManager   = brackets.getModule("editor/EditorManager");

    var MATCH_NONBLANK = /\S/;
    var MATCH_H1 = /^(\s{0,3}|\s*\*\s*)(#\s)/;
    var MATCH_H2 = /^(\s{0,3}|\s*\*\s*)(##\s)/;
    var MATCH_H3 = /^(\s{0,3}|\s*\*\s*)(###\s)/;
    var MATCH_HD = /^(\s{0,3}|\s*\*\s*)(#+\s)/;
    var MATCH_BULLET = /^\s*\*\s/;
    var MATCH_NUMBERED = /^\s*\d\.\s/;
    var MATCH_LIST = /^\s*(\*|\d\.)\s/;

    /**
     *  Check initial conditions for any buttons. Make sure
     *  we have an editor, are in a Markdown document, and
     *  have a cursor.
     */
    function check(editor) {
        if (!editor) {
            return false;
        }

        var mode = editor._getModeFromDocument();
        if (mode !== "gfm" && mode !== "markdown") {
            return false;
        }

        var cursor = editor.getCursorPos(false, "to");
        if (!cursor.line) {
            return false;
        }

        return true;
    }

    /**
     * Perform the provided action on every non-blank
     * line in every selection (single or multiple).
     * If the action returns an object, check if it
     * indicates done, in which case return its result.
     */
    function everySelectionLine(editor, fn) {
        var i, selections = editor.getSelections();
        for (i = 0; i < selections.length; i++) {
            var j, start = selections[i].start.line;
            var end = (selections[i].end.ch === 0
                    ? selections[i].end.line : selections[i].end.line + 1);
            for (j = start; j < end; j++) {
                var line = editor.document.getLine(j);
                if (MATCH_NONBLANK.test(line)) {
                    var state = fn(j, line);
                    if (state && state.done) {
                        return state.result;
                    }
                }
            }
        }
    }

    /**
     * Returns true only if all non-blank lines in
     * the selection(s) match the regular expression,
     * or if the cursor line matches.
     */
    function allLinesOn(editor, regExp) {
        if (editor.hasSelection()) {
            var result = everySelectionLine(editor, function (lineno, line) {
                if (!regExp.test(line)) {
                    return {done: true, result: false};
                }
            });
            if (typeof result !== 'undefined') {
                return result;
            }
        } else {
            var curLine = editor.getCursorPos(false, "to").line;
            if (!regExp.test(editor.document.getLine(curLine))) {
                return false;
            }
        }
        return true;
    }

    function _turnLineOn(editor, lineno, line, replaceRE, afterRE, insert) {
        var loc, after = null;
        var replace = replaceRE.exec(line);
        if (replace) {
            after = (afterRE ? afterRE.exec(replace[0]) : null);
            var s = (after ? after[0] : "");
            loc = {line: lineno, ch: replace.index};
            var endloc = {line: lineno, ch: replace.index + replace[0].length};
            editor.document.replaceRange(s, loc, endloc, "+mdbar");
            loc.ch += s.length;
        } else {
            after = (afterRE ? afterRE.exec(line) : null);
            loc = {line: lineno, ch: (after ? after.index + after[0].length : 0)};
        }
        editor.document.replaceRange(insert, loc, null, "+mdbar");
    }

    /**
     * For all non-blank lines in the selection(s), or for the
     * cursor line, insert the provided string if it is not already
     * present (i.e. the regexp does not match). If found, the replaceRE
     * is removed. If the afterRE is found, preserve it and insert the
     * string after it.
     */
    function turnLinesOn(editor, regexp, replaceRE, afterRE, insert) {
        if (editor.hasSelection()) {
            everySelectionLine(editor, function (lineno, line) {
                if (!regexp.test(line)) {
                    _turnLineOn(editor, lineno, line, replaceRE, afterRE, insert);
                }
            });
        } else {
            var cursor = editor.getCursorPos(false, "to"),
                line = editor.document.getLine(cursor.line);
            _turnLineOn(editor, cursor.line, line, replaceRE, afterRE, insert);
        }
    }

    function _turnLineOff(editor, lineno, found, preserveRE) {
        var preserve = (preserveRE ? preserveRE.exec(found[0]) : null);
        var replace = (preserve ? preserve[0] : "");
        var loc = {line: lineno, ch: found.index};
        var endloc = {line: lineno, ch: found.index + found[0].length};
        editor.document.replaceRange(replace, loc, endloc, "+mdbar");
    }

    /**
     * For all lines in the selection(s), or for the cursor line,
     * remove the matched regular expression, preserving the
     * preserveRE if found within the matched regexp.
     */
    function turnLinesOff(editor, regexp, preserveRE) {
        if (editor.hasSelection()) {
            everySelectionLine(editor, function (lineno, line) {
                var found = regexp.exec(line);
                if (found) {
                    _turnLineOff(editor, lineno, found, preserveRE);
                }
            });
        } else {
            var cursor = editor.getCursorPos(false, "to");
            var found = regexp.exec(editor.document.getLine(cursor.line));
            if (found) {
                _turnLineOff(editor, cursor.line, found, preserveRE);
            }
        }
    }

    function handleLineButton(regexp, replace, after, insert) {
        var editor = EditorManager.getActiveEditor();
        if (!check(editor)) {
            return;
        }

        if (!allLinesOn(editor, regexp)) {
            turnLinesOn(editor, regexp, replace, after, insert);
        } else {
            turnLinesOff(editor, regexp, after);
        }
    }

    exports.h1 = function () {
        handleLineButton(MATCH_H1, MATCH_HD, MATCH_BULLET, "# ");
    };

    exports.h2 = function () {
        handleLineButton(MATCH_H2, MATCH_HD, MATCH_BULLET, "## ");
    };

    exports.h3 = function () {
        handleLineButton(MATCH_H3, MATCH_HD, MATCH_BULLET, "### ");
    };

    exports.bold = function () {

    };

    exports.bullet = function () {
        handleLineButton(MATCH_BULLET, MATCH_LIST, null, "* ");
    };

    exports.numbered = function () {
        handleLineButton(MATCH_NUMBERED, MATCH_LIST, null, "1. ");
    };
});
