var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI;

Hammerhead.init();


var Automation = TestCafeClient.get('Automation'),
    AddActionDialog = TestCafeClient.get('UI.RecorderWidgets.AddActionDialog');

$(document).ready(function () {
    var $root = ShadowUI.getRoot(),
        $recorder = $('<div></div>').appendTo($root),
        $dialogContainer = null,

        settingsPanel = window.TestCafeSandbox.settingsPanel,
        dialog = null,
        crossDomainIFrame = $('#crossDomain')[0];

    crossDomainIFrame.src = 'http://localhost:1336/simple_page.html';

    ShadowUI.addClass($recorder, 'recorder');

    settingsPanel.create();

    var createActionBlock = settingsPanel.addCreateActionBlock();

    settingsPanel.addButton('Create dialog', function () {
        if (dialog)
            dialog._close();

        if ($dialogContainer)
            $dialogContainer.remove();

        $dialogContainer = $('<div></div>').appendTo($recorder);

        dialog = new AddActionDialog($dialogContainer, 1, createActionBlock.getStepInfo());

        dialog.on(AddActionDialog.ADD_ACTION_BUTTON_CLICK_EVENT, function (e) {
            panelConsole.log('Add action button click event');
        });

        dialog.on(AddActionDialog.CANCEL_BUTTON_CLICK_EVENT, function () {
            panelConsole.log('Cancel button clicked');
        });
    });

    settingsPanel.addButton('Remove dialog', function () {
        dialog._close();

        if ($dialogContainer)
            $dialogContainer.remove();
    });


    var panelConsole = settingsPanel.addLogArea();

    settingsPanel.addButton('Clear log', function () {
        panelConsole.clear();
    });
});