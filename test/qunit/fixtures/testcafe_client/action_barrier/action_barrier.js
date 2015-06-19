var Hammerhead    = HammerheadClient.get('Hammerhead'),
    IFrameSandbox = HammerheadClient.get('DOMSandbox.IFrame'),
    $             = Hammerhead.$,
    Util          = Hammerhead.Util,
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Transport     = TestCafeClient.get('Base.Transport');

Hammerhead.init();
ActionBarrier.init();

var handler = function (e) {
    if (e.iframe.id.indexOf('test') !== -1) {
        e.iframe.contentWindow.eval.call(e.iframe.contentWindow, [
            'HammerheadClient.define(\'Settings\', function (require, exports) {',
            '    exports.JOB_OWNER_TOKEN = "ownerToken";',
            '    exports.JOB_UID = "jobUid";',
            '});',
            'var UrlUtil = HammerheadClient.get("UrlUtil");',
            'UrlUtil.OriginLocation.get = function() { return "https://example.com"; };',
            'HammerheadClient.get(\'Hammerhead\').init();'
        ].join(''));
    }
};

QUnit.testStart = function () {
    IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);
};

QUnit.testDone = function () {
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
};

$(document).ready(function () {
    Transport.possibleFailCauseFound = function () {
    };

    var $iframe = null;

    asyncTest('waitPageInitialization', function () {
        var completeReqCount = 0,
            reqCount         = 2;

        expect(1);

        for (var i = 0; i < reqCount; i++) {
            $.get('/xhr-test/500', function () {
                completeReqCount++;
            });
        }

        ActionBarrier.waitPageInitialization(function () {
            strictEqual(completeReqCount, reqCount);
            start();
        });
    });


    module('regression');

    asyncTest('barrier - creating new iframe without src (B236650)', function () {
        var windowErrorRaised = false;

        window.onerror = function () {
            windowErrorRaised = true;
        };

        var action = function (callback) {
            if ($iframe) {
                $iframe.remove();
            }

            window.setTimeout(function () {
                $iframe = $('<iframe id="test1">').attr('src', 'about:blank').appendTo('body');
            }, 0);

            callback();
        };

        var callback = function () {
            ok(windowErrorRaised);
        };

        ActionBarrier.waitActionSideEffectsCompletion(action, callback);

        window.setTimeout(function () {
            expect(1);
            start();
        }, 1000)
    });

    asyncTest('B237815 - Test runner - can\'t execute simple test', function () {
        var callbackRaised = false;

        var action = function (callback) {
            $iframe = $('<iframe id="test2">').appendTo('body');

            window.setTimeout(function () {
                $iframe.remove();
            }, 50);

            callback();
        };

        var callback = function () {
            callbackRaised = true;
        };

        ActionBarrier.waitActionSideEffectsCompletion(action, callback);

        window.setTimeout(function () {
            ok(callbackRaised);
            start();
        }, 2000);
    });
});
