/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, Mustache */

define(function (require, exports, module) {
    "use strict";

    var CommandManager     = brackets.getModule("command/CommandManager"),
        ExtensionUtils     = brackets.getModule("utils/ExtensionUtils"),
        Menus              = brackets.getModule("command/Menus"),
        ModalBar           = brackets.getModule("widgets/ModalBar").ModalBar,
        PreferencesManager = brackets.getModule("preferences/PreferencesManager");


    var Handler = require("handler"),
        Strings = require("strings"),
        _markdownBarTemplate = require("text!templates/markdown-bar.html");
    
    var prefs = PreferencesManager.getExtensionPrefs("markdownbar");

    var toolBar = null,
        cmdToolbar = null;

    function registerCallbacks(toolBar) {
        var root = toolBar.getRoot();
        root.on("click", "#markdown-heading1", function () {
            Handler.h1();
        });
        root.on("click", "#markdown-heading2", function () {
            Handler.h2();
        });
        root.on("click", "#markdown-heading3", function () {
            Handler.h3();
        });
        root.on("click", "#markdown-heading4", function () {
            Handler.h4();
        });
        root.on("click", "#markdown-heading5", function () {
            Handler.h5();
        });
        root.on("click", "#markdown-heading6", function () {
            Handler.h6();
        });
        root.on("click", "#markdown-bold", function () {
            Handler.bold();
        });
        root.on("click", "#markdown-italic", function () {
            Handler.italic();
        });
        root.on("click", "#markdown-strikethrough", function () {
            Handler.strikethrough();
        });
        root.on("click", "#markdown-code", function () {
            Handler.code();
        });
        root.on("click", "#markdown-bullet", function () {
            Handler.bullet();
        });
        root.on("click", "#markdown-numbered", function () {
            Handler.numbered();
        });
        root.on("click", "#markdown-quote", function () {
            Handler.quote();
        });
    }
    
    function toggleBar() {
        if (toolBar) {
            toolBar.close();
            toolBar = null;
            cmdToolbar.setChecked(false);
        } else {
            var templateVars = {
                Strings: Strings
            };
            toolBar = new ModalBar(Mustache.render(_markdownBarTemplate, templateVars), false);
            registerCallbacks(toolBar);
            cmdToolbar.setChecked(true);
        }
    }

    prefs.definePreference("showOnStartup", "boolean", false, {
        description: Strings.DESCRIPTION_SHOW_ON_STARTUP
    });

    var BAR_COMMAND_ID = "alanhohn.togglemarkdownbar";
    cmdToolbar = CommandManager.register(Strings.MENU_TOOLBAR, BAR_COMMAND_ID, toggleBar);

    var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
    menu.addMenuItem(BAR_COMMAND_ID, "Ctrl-Shift-T");
    
    ExtensionUtils.loadStyleSheet(module, "styles/styles.css");
    ExtensionUtils.loadStyleSheet(module, "styles/octicons.css");
    
    if (prefs.get("showOnStartup")) {
        toggleBar();
    }

});
