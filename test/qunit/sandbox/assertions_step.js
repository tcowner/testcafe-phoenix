var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI;

Hammerhead.init();


var Automation = TestCafeClient.get('Automation'),
    AssertionsStep = TestCafeClient.get('UI.RecorderWidgets.AssertionsStep');

$(document).ready(function () {
    var step = null;

    var $root = ShadowUI.getRoot(),
        $recorder = $('<div></div>').appendTo($root),
        $stepContainer = null;

    ShadowUI.addClass($recorder, 'recorder');

    var settingsPanel = window.TestCafeSandbox.settingsPanel;

    settingsPanel.create();

    var createAssertionsStepBlock = settingsPanel.addCreateAssertionsStepBlock();

    settingsPanel.addButton('Create step', function () {
        if ($stepContainer)
            $stepContainer.remove();

        $stepContainer = $('<div></div>').css({
            width: 650,
            height: 420,
            position: 'absolute',
            top: 200,
            left: 100,
            backgroundColor: 'grey'
        }).appendTo($recorder);

        step = new AssertionsStep($stepContainer, 1, createAssertionsStepBlock.getStepInfo(), {enableAssertionsValidation: true});

        step.on(AssertionsStep.STEP_NAME_CHANGED_EVENT, function (e) {
            panelConsole.log('change name event: ' + e.name);
        });

        step.on(AssertionsStep.STEP_INFO_CHANGED_EVENT, function (e) {
            panelConsole.log('change info event');
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