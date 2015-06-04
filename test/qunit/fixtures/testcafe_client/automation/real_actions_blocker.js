var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    SharedConst = TestCafeClient.get('Shared.Const'),
    NativeMethods = Hammerhead.NativeMethods,

    Automation = TestCafeClient.get('Automation'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    ClickPlaybackAutomation = TestCafeClient.get('Automation.Click.Playback'),
    HoverPlaybackAutomation = TestCafeClient.get('Automation.Hover.Playback'),
    CursorWidget = TestCafeClient.get('UI.Cursor');

Hammerhead.init();
ActionBarrier.init();
Automation.init();
CursorWidget.init();

$(document).ready(function () {
    var TEST_ELEMENT_CLASS = 'TestCafe-testElement';

    var createDiv = function (x, y, doc) {
        var div = doc.createElement('div');

        div.style.position = 'absolute';
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        div.style.border = '1px solid black';
        div.style.width = '50px';
        div.style.height = '50px';

        div.className = TEST_ELEMENT_CLASS;

        doc.body.appendChild(div);

        return div;
    };

    QUnit.testDone = function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
    };

    asyncTest('prevent real mouse event', function () {
        var div1 = createDiv(0, 0, document),
            div2 = createDiv(250, 250, document),

            documentClickCount = 0;

        NativeMethods.addEventListener.call(document, 'click', function () {
            documentClickCount++;
        }, true);

        async.series({
            moveToFirstElement: function (callback) {
                HoverPlaybackAutomation.run(div1, {}, callback);
            },

            clickSecondElementAndSimulateRealEvent: function (callback) {
                ClickPlaybackAutomation.run(div2, {}, callback);

                window.setTimeout(function () {
                    var click = NativeMethods.click.call(div1);
                }, 50);
            },

            checkRealEventBlocking: function () {
                equal(documentClickCount, 1);
                start();
            }
        });
    });
});
