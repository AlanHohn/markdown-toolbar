/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, Mustache */

define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        Menus          = brackets.getModule("command/Menus"),
        Strings        = require("strings"),
        ModalBar       = brackets.getModule("widgets/ModalBar").ModalBar;

    var _markdownBarTemplate = require("text!templates/markdown-bar.html");
    
    var toolBar = null;
    var cmdToolbar = null;
    
    function toggleBar() {
        if (toolBar) {
            toolBar.close();
            toolBar = null;
            cmdToolbar.setChecked(false);
        } else {
            var templateVars = {};
            templateVars.Strings = Strings;
            toolBar = new ModalBar(Mustache.render(_markdownBarTemplate, templateVars), false);
            cmdToolbar.setChecked(true);
        }
    }

    var BAR_COMMAND_ID = "alanhohn.togglemarkdownbar";
    cmdToolbar = CommandManager.register("Markdown Toolbar", BAR_COMMAND_ID, toggleBar);

    var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
    menu.addMenuItem(BAR_COMMAND_ID, "Ctrl-Shift-T");
    
    ExtensionUtils.loadStyleSheet(module, "styles/styles.css");
    
});