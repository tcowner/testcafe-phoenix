var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI;

Hammerhead.init();


var Automation = TestCafeClient.get('Automation'),
    Step = TestCafeClient.get('UI.RecorderWidgets.ActionStep'),
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor');

$(document).ready(function () {
    JavascriptExecutor.init();

    var step = null;

    var $root = ShadowUI.getRoot(),
        $recorder = $('<div></div>').appendTo($root),
        $stepContainer = null,
        crossDomainIFrame = $('#crossDomain')[0];

    crossDomainIFrame.src = 'http://localhost:1336/simple_page.html';

    ShadowUI.addClass($recorder, 'recorder');

    var settingsPanel = window.TestCafeSandbox.settingsPanel;

    settingsPanel.create();

    var createActionBlock = settingsPanel.addCreateActionBlock();

    settingsPanel.addButton('Create step', function () {
        if ($stepContainer)
            $stepContainer.remove();

        $stepContainer = $('<div></div>').css({
            width: 800,
            height: 420,
            position: 'absolute',
            top: 200,
            left: 100,
            backgroundColor: 'grey'
        }).appendTo($recorder);

        step = new Step($stepContainer, 1, createActionBlock.getStepInfo(), false);

        step.on(Step.STEP_NAME_CHANGED_EVENT, function (e) {
            panelConsole.log('change name event: ' + e.name);
        });

        step.on(Step.STEP_INFO_CHANGED_EVENT, function (e) {
            panelConsole.log('change info event');
        });

        step.on(Step.SELECTOR_CHANGED_EVENT, function (e) {
            panelConsole.log('selector changed event');
            panelConsole.log('elements count: ' + (e.parsedSelector.length));
        });

        step.on(Step.SELECTOR_EDITOR_FOCUSED_EVENT, function (e) {
            panelConsole.log('selector editor focus event');
        });

        step.on(Step.SELECTOR_EDITOR_BLURED_EVENT, function (e) {
            panelConsole.log('selector editor blur event');
        });
    });

    settingsPanel.addButton('Remove step', function () {
        if ($stepContainer)
            $stepContainer.remove();
    });

    var panelConsole = settingsPanel.addLogArea();

    settingsPanel.addButton('Clear log', function () {
        panelConsole.clear();
    });
});