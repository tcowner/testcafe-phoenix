var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI,

    ElementMarker = TestCafeClient.get('UI.RecorderWidgets.ElementsMarker');

Hammerhead.init();

$(document).ready(function () {
    var crossDomainIFrame = $('#crossDomain')[0];

    crossDomainIFrame.src = 'http://localhost:1336/simple_page.html';
    crossDomainIFrame.style.position = 'absolute';

    var settingsPanel = window.TestCafeSandbox.settingsPanel;

    settingsPanel.create();

    settingsPanel.addButton('Mark iframe', function () {
        ElementMarker.mark(settingsPanel.getPanelElement(), $('#crossDomain'));
    });

    settingsPanel.addButton('Mark first element in iframe', function () {
        ElementMarker.markInContext(settingsPanel.getPanelElement(), '$("#testDiv")', crossDomainIFrame.contentWindow);
    });

    settingsPanel.addButton('Mark second element in iframe', function () {
        ElementMarker.markInContext(settingsPanel.getPanelElement(), '$("#secondTestDiv")', crossDomainIFrame.contentWindow);
    });

    settingsPanel.addButton('Clear marker', function () {
        ElementMarker.clear();
    });

    settingsPanel.addButton('Move iFrame', function () {
        crossDomainIFrame.style.top = (parseInt(crossDomainIFrame.style.top) || 0) + 100 + 'px';
    });
});