/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets */

define(function (require, exports, module) {
    "use strict";

    var EditorManager   = brackets.getModule("editor/EditorManager");

    /**
     * Regular expressions do most of the heavy lifting, here
     * and everywhere.
     *
     * Note that the heading items allow for the possibility
     * that the heading is preceded by a bullet. This seems
     * odd but it also works, at least in Markdown Preview,
     * and it is a plausible edge case.
     *
     * Numbering in front of a heading just displays a bullet,
     * so it didn't seem worth preserving.
     *
     * Also note that there is a limit on white space before
     * a heading, as four lines equals raw monospace text.
     * But there isn't a similar limitation on bullets, because
     * it would interfere with bullets at level 3+.
     */
    var MATCH_NONBLANK = /\S/;
    var MATCH_H1 = /^(\s{0,3}|\s*\*\s*)(#\s)/;
    var MATCH_H2 = /^(\s{0,3}|\s*\*\s*)(##\s)/;
    var MATCH_H3 = /^(\s{0,3}|\s*\*\s*)(###\s)/;
    var MATCH_H4 = /^(\s{0,3}|\s*\*\s*)(####\s)/;
    var MATCH_H5 = /^(\s{0,3}|\s*\*\s*)(#####\s)/;
    var MATCH_H6 = /^(\s{0,3}|\s*\*\s*)(######\s)/;
    var MATCH_HD = /^(\s{0,3}|\s*\*\s*)(#+\s)/;
    var MATCH_BULLET = /^\s*\*\s/;
    var MATCH_NUMBERED = /^\s*\d\.\s/;
    var MATCH_QUOTE = /^\s*>\s/;
    var MATCH_LIST = /^\s*(\*|>|\d\.)\s/;

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
     *
     * Note that in CodeMirror a selection that includes
     * the final newline is indicated by the selection
     * ending at column 0 of the following line, so we
     * have to handle that case.
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
     * Perform the provided action on every selection
     * (single or multiple). If the action returns an
     * object, check if it indicates done, in which case
     * return its result.
     */
    function everySelection(editor, fn) {
        var i, selections = editor.getSelections();
        for (i = 0; i < selections.length; i++) {
            var state = fn(selections[i]);
            if (state && state.done) {
                return state.result;
            }
        }
    }

    /**
     * Returns true only if all non-blank lines in
     * the selection(s) match the regular expression,
     * or, if no selection, if the cursor line matches.
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
     * cursor line if no selection, insert the provided string if it is
     * not already present (i.e. the regexp does not match). If found,
     * the replaceRE is removed. If the afterRE is found, preserve it and
     * insert the string after it.
     *
     * The replaceRE lets us switch between different kinds of headings
     * or lists by just clicking the desired one rather than having to
     * turn the old one off first. So it's super important even though
     * it makes for a bit of a mess.
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

    /**
     * Determines if the specified range is "on" (i.e. that
     * it is immediately preceeded by and immediately followed
     * by the contents of "match").
     */
    function isOn(editor, match, start, end) {
        var matchLength = match.length;
        var startMatch = '';
        if (start.ch >= matchLength) {
            var preStart = {line: start.line,
                         ch: start.ch - matchLength};
            startMatch = editor.document.getRange(preStart, start);
        }
        var postEnd = {line: end.line, ch: end.ch + matchLength};
        var endMatch = editor.document.getRange(end, postEnd);
        return (startMatch === match && endMatch === match);
    }

    /**
     * Determines if all selections are on (see isOn above).
     * If no selection, uses the current cursor position.
     */
    function allSelectionsOn(editor, match) {
        if (editor.hasSelection()) {
            var result = everySelection(editor, function (selection) {
                if (!isOn(editor, match, selection.start, selection.end)) {
                    return {done: true, result: false};
                }
            });
            if (typeof result !== 'undefined') {
                return result;
            }
        } else {
            var cursor = editor.getCursorPos(false, "to");
            return isOn(editor, match, cursor, cursor);
        }
        return true;
    }

    /**
     * Generic function to handle line-based tasks (headings and
     * lists). For simple cases, this is a toggle. However, if
     * multiple lines are selected, and the toggle is on for only
     * some lines, it is turned on for all lines where it is off.
     *
     * This seems like the most intuitive behavior as it allows
     * things like selecting across a bunch of lines, some already
     * bulleted, and making them all bulleted. Even in that case,
     * one extra click will then remove all the bullets.
     */
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

    // Define the exports; these are the functions that get wired
    // into toolbar buttons when the toolbar is created.

    exports.h1 = function () {
        handleLineButton(MATCH_H1, MATCH_HD, MATCH_BULLET, "# ");
    };

    exports.h2 = function () {
        handleLineButton(MATCH_H2, MATCH_HD, MATCH_BULLET, "## ");
    };

    exports.h3 = function () {
        handleLineButton(MATCH_H3, MATCH_HD, MATCH_BULLET, "### ");
    };

    exports.h4 = function () {
        handleLineButton(MATCH_H4, MATCH_HD, MATCH_BULLET, "#### ");
    };

    exports.h5 = function () {
        handleLineButton(MATCH_H5, MATCH_HD, MATCH_BULLET, "##### ");
    };

    exports.h6 = function () {
        handleLineButton(MATCH_H6, MATCH_HD, MATCH_BULLET, "###### ");
    };

    exports.bold = function () {
        var editor = EditorManager.getActiveEditor();
        if (!check(editor)) {
            return;
        }
        if (!allSelectionsOn(editor, "**")) {
            var cursor = editor.getCursorPos(false, "to");
            editor.document.replaceRange("****", cursor, null, "+mdbar");
            editor.setCursorPos({line: cursor.line, ch: cursor.ch + 2});
        }
    };

    exports.bullet = function () {
        handleLineButton(MATCH_BULLET, MATCH_LIST, null, "* ");
    };

    exports.numbered = function () {
        handleLineButton(MATCH_NUMBERED, MATCH_LIST, null, "1. ");
    };

    exports.quote = function () {
        handleLineButton(MATCH_QUOTE, MATCH_LIST, null, "> ");
    };
});
