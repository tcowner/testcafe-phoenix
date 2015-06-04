var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI;

Hammerhead.init();

var ToolbarWidget = TestCafeClient.get('UI.RecorderWidgets.Toolbar'),
    Tooltip = TestCafeClient.get('UI.RecorderWidgets.Tooltip');

$(document).ready(function () {
    var settingsPanel = window.TestCafeSandbox.settingsPanel;

    settingsPanel.create();

    function getStepsInfo() {
        var actions = ['click', 'rclick', 'dblclick', 'drag', 'hover', 'press', 'select', 'type', 'wait', 'click'],
            stepsInfo = [];

        actions = actions.concat(actions);

        for (var i = 0; i < actions.length; i++) {
            stepsInfo.push(window.TestCafeSandbox.getDefaultStepInfo(actions[i], $('body')));
        }

        stepsInfo[stepsInfo.length - 1].nativeDialogHandlers = {
            alert: {},
            prompt:{
                retValue: '123'
            },
            confirm:{
                retValue: false
            },
            beforeUnload:{}
        };

        return stepsInfo;
    }

    settingsPanel.addButton('Create', function () {
        ToolbarWidget.init(ShadowUI.getRoot(), {
            stepsInfo: getStepsInfo(),
            hasChanges: function () {
                return false
            },
            toolbarPosition: {
                left: 650,
                top: 20
            },
            hideButtonsBar: false,
            shortcuts: {},
            showSteps: true,
            enableStepListInteractive: true
        });
    });
});