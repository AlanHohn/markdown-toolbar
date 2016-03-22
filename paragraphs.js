/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets */

define(function (require, exports, module) {
    "use strict";

    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");

    var prefs = PreferencesManager.getExtensionPrefs("markdownbar");

    var BLANK_LINE = /^\s*$/;
    var NEW_PARA = /^\s*$|\*\s|\d\.\s|>\s/;
    var LAST_WHITESPACE = /\s\S*$/;

    function _makeLineParagraph(editor, lineNum) {
        var thisLine = editor.document.getLine(lineNum);
        if (!BLANK_LINE.test(thisLine)) {
            var nextLine = editor.document.getLine(lineNum + 1);
            if (!NEW_PARA.test(nextLine)) {
                var loc = {line: lineNum + 1, ch: 0};
                editor.document.replaceRange('\n', loc, loc, "+mdpara");
            }
        }
    }
    
    function _findParagraphStart(editor, fromLine) {
        var curLine = fromLine;
        while (curLine > 0) {
            if (BLANK_LINE.test(editor.document.getLine(curLine))) {
                return curLine + 1;
            }
            curLine--;
        }
        return 0;
    }

    function _reflowParagraph(editor, startLine, maxLength) {
        var curLine = startLine;
        var line = editor.document.getLine(curLine);
        var input = line;
        var output = "";
        while (line && !NEW_PARA.test(line)) {
            while (input.length > maxLength) {
                var search = input.substring(0, maxLength - 1);
                var result = LAST_WHITESPACE.exec(search);
                if (result) {
                    output += input.substring(0, result.index) + "\n";
                    input = input.substring(result.index + 1);
                } else {
                    // Line with no whitespace, bail
                    break;
                }
            }
            curLine++;
            line = editor.document.getLine(curLine);
            if (line && !NEW_PARA.test(line)) {
                input = input.trim() + " " + line.trim();
            }
        }
        output += input + "\n";
        if (startLine !== curLine) {
            var start = {line: startLine, ch: 0};
            var end = {line: curLine, ch: 0};
            editor.document.replaceRange(output, start, end, "+mdflow");
        }
    }

    function _reflowSelections(editor, maxLength) {
        var selections = editor.getSelections();
        var i, j, firstLine = Number.MAX_VALUE;
        for (i = selections.length - 1; i >= 0; i--) {
            var startLine = selections[i].start.line;
            var endLine = selections[i].end.line;
            if (selections[i].end.ch === 0) {
                endLine--;
            }
            for (j = endLine; j >= startLine; j--) {
                if (j < firstLine) {
                    var paraStart = _findParagraphStart(editor, j);
                    firstLine = paraStart;
                    _reflowParagraph(editor, paraStart, maxLength);
                }
            }
        }
    }

    exports.paragraph = function (editor) {
        if (editor.hasSelection()) {
            var selections = editor.getSelections();
            var i, j;
            for (i = selections.length - 1; i >= 0; i--) {
                var startLine = selections[i].start.line;
                var endLine = selections[i].end.line;
                if (selections[i].end.ch === 0) {
                    endLine--;
                }
                for (j = endLine; j >= startLine; j--) {
                    _makeLineParagraph(editor, j);
                }
            }
        } else {
            var cursor = editor.getCursorPos(false, "to");
            _makeLineParagraph(editor, cursor.line);
        }
    };
    
    exports.reflow = function (editor) {
        var maxLength = prefs.get("maxLength");
        if (editor.hasSelection()) {
            _reflowSelections(editor, maxLength);
        } else {
            var cursor = editor.getCursorPos(false, "to");
            var startLine = _findParagraphStart(editor, cursor.line);
            _reflowParagraph(editor, startLine, maxLength);
        }
    };

});
