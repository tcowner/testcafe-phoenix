var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI;

Hammerhead.init();

var PlaybackResult = TestCafeClient.get('UI.RecorderWidgets.PlaybackResult');

$(document).ready(function () {
    var settingsPanel = window.TestCafeSandbox.settingsPanel;

    settingsPanel.create();

    var total = settingsPanel.addInput('Total:', 10, true),
        failed = settingsPanel.addInput('Failed:', 1, true),
        failedStepNum = settingsPanel.addInput('Failed step num', '', true);

    settingsPanel.addButton('Create', function () {
        if (!failedStepNum.getValue())
            PlaybackResult.show(PlaybackResult.STATES.FINISHED, { total: total.getValue(), failed: failed.getValue()});
        else
            PlaybackResult.show(PlaybackResult.STATES.FAILED, { total: total.getValue(), failed: failed.getValue(), failedStepNum: failedStepNum.getValue(), error: 'some error'});
    });
});