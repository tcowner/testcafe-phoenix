var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI,

    CodeEditor = TestCafeClient.get('UI.RecorderWidgets.CodeEditor');

Hammerhead.init();

$(document).ready(function () {
    var $root = ShadowUI.getRoot(),
        codeEditor = null,
        settingsPanel = window.TestCafeSandbox.settingsPanel;

    settingsPanel.create();

    var $codeEditorContainer = $('<div></div>').appendTo($root);

    $('body').css('background-color', 'grey').css('height', '100%');

    var options = {
        width: 600,
        height: 300,
        text: 'text',
        allowEdit: true,
        expandDirection: 'right'
    };

    codeEditor = new CodeEditor($codeEditorContainer, options);

    codeEditor.events.on(CodeEditor.CHANGE_EVENT, function (e) {
        panelConsole.log('--change event-- ' + e.text);
    });

    codeEditor.events.on(CodeEditor.FOCUS_EVENT, function () {
        panelConsole.log('focus');
    });

    codeEditor.events.on(CodeEditor.BLUR_EVENT, function () {
        panelConsole.log('blur');
    });

    var panelConsole = settingsPanel.addLogArea();

    settingsPanel.addButton('Clear log', function () {
        panelConsole.clear();
    });
});