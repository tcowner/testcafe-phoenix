var SharedErrors = TestCafeClient.get('Shared.Errors'),
    ServiceCommands = TestCafeClient.get('Shared.ServiceCommands'),
    Automation = TestCafeClient.get('Automation'),
    Util = HammerheadClient.get('Util');

//NOTE: this page is only a container for tests. Tests are run in the iframe. So, all the TestCafe/Hammerhead logic
// executes in the iframe only.
$(document).ready(function () {
    var IFRAME_SRC = '/data/native_dialogs/recorder.html',
        BROWSER_DIALOG_INDEXES = {
            alert: 0,
            confirm: 1,
            prompt: 2,
            beforeUnload: 3
        };

    var eventParsedCallback = null,
        recorder = null,

        $iframe = null,
        iframeWindow = null,
        iframeDocument = null,
        link = null,
        savedStepsInfo = null;

    QUnit.testStart = function () {
        stop();
        savedStepsInfo = null;

        function onIframeLoad() {
            $iframe.unbind('load', onIframeLoad);

            iframeWindow = $iframe[0].contentWindow;
            iframeDocument = iframeWindow.document;

            link = iframeDocument.getElementById('link');

            eventParsedCallback = iframeWindow.eventParsedCallback;

            recorder = iframeWindow.recorder;

            iframeWindow.Transport.queuedAsyncServiceMsg = function (msg, callback) {
                if (msg.cmd === ServiceCommands.STEPS_INFO_SET)
                    savedStepsInfo = msg.stepsInfo;

                if (callback)
                    callback();
            };

            start();
        }

        $iframe = $('<iframe></iframe>').attr('src', IFRAME_SRC).bind('load', onIframeLoad).appendTo('body');
    };

    QUnit.testDone = function () {
        $iframe.remove();
    };

    var emitClickAction = function () {
        var actionDescriptor = $.extend(true, {}, Automation.defaultMouseActionDescriptor, {
            type: 'click',
            element: link,
            selector: '#submitInput',

            serviceInfo: {
                selectors: [
                    {id: 'id', selector: '#submitInput'}
                ]
            }
        });

        eventParsedCallback(actionDescriptor);
    };

//NOTE: TESTS DON'T PASS IN SAFARI - because we can not use required defineProperty in iframe in Safari
    module('disable dialogs mode');

    asyncTest('without before unload dialog', function () {
        emitClickAction();
        link.click();

        window.setTimeout(function () {
            equal(savedStepsInfo.length, 1);
            ok(!savedStepsInfo[0].nativeDialogHandlers);

            start();
        }, 1000);
    });
    asyncTest('process before unload dialog', function () {
        iframeWindow.addEventListener('beforeunload', function (e) {
            e.returnValue = 'text';
        });

        emitClickAction();
        link.click();

        window.setTimeout(function () {
            equal(savedStepsInfo.length, 1);
            ok(savedStepsInfo[0].nativeDialogHandlers[BROWSER_DIALOG_INDEXES['beforeUnload']][0].dialog);

            start();
        }, 1000);
    });

    module('regression');

    asyncTest('B253820 - The handleBeforeUnload() directive is not written to the test on the samples.msdn.microsoft.com', function () {
        iframeWindow.setBeforeUnloadProperty(function () {
            return 'text';
        });

        emitClickAction();
        link.click();

        window.setTimeout(function () {
            equal(savedStepsInfo.length, 1);
            ok(savedStepsInfo[0].nativeDialogHandlers[BROWSER_DIALOG_INDEXES['beforeUnload']][0].dialog);

            start();
        }, 1000);
    });

    if (!Util.isIE) {
        asyncTest('T172218 - TestCafe raises the "Unexpected system alert dialog" error under certain circumstances - dialogs are not expected', function () {
            iframeWindow.addEventListener('unload', function () {
                iframeWindow.alert('test');
                iframeWindow.confirm('test');
                iframeWindow.prompt('test');
            });

            emitClickAction();
            link.click();

            window.setTimeout(function () {
                equal(savedStepsInfo.length, 1);
                ok(!savedStepsInfo[0].nativeDialogHandlers);

                start();
            }, 1000);
        });
    }
});
