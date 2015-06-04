var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI,

    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    ChoosePropertyDialog = TestCafeClient.get('UI.RecorderWidgets.ChoosePropertyDialog');

Hammerhead.init();

$(document).ready(function () {
    var $root = ShadowUI.getRoot(),
        $recorder = $('<div></div>').appendTo($root);

    ShadowUI.addClass($recorder, 'recorder');

    new ChoosePropertyDialog(JavascriptExecutor.parseSelectorSync('$("#img")'));
});