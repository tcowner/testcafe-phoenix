var Hammerhead      = HammerheadClient.get('Hammerhead'),
    IFrameSandbox   = HammerheadClient.get('DOMSandbox.IFrame'),
    $               = Hammerhead.$,
    Transport       = TestCafeClient.get('Base.Transport'),
    TestRunnerBase  = TestCafeClient.get('TestRunner.TestRunnerBase'),
    TestRunner      = TestCafeClient.get('TestRunner.TestRunner'),
    ActionsAPI      = TestCafeClient.get('TestRunner.API.Actions'),
    SharedErrors    = TestCafeClient.get('Shared.Errors'),
    SharedConst     = TestCafeClient.get('Shared.Const'),
    ActionBarrier   = TestCafeClient.get('ActionBarrier'),
    ModalBackground = TestCafeClient.get('UI.ModalBackground');

Hammerhead.init();

Transport.batchUpdate                = function (callback) {
    callback();
};
Transport.startInactivityMonitor     = function () {
};
Transport.stopInactivityMonitor      = function () {
};
ModalBackground.hide                 = function () {
};
ActionBarrier.waitPageInitialization = function (callback) {
    callback();
};
$.fn.load                            = function (callback) {
    callback();
};

var lastError = null;

TestRunnerBase.prototype._onError = function (err) {
    lastError = err;
};

TestRunner.prototype._onError = function (err) {
    lastError = err;
};

IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, function (e) {
    e.iframe.contentWindow.eval.call(e.iframe.contentWindow, [
        'HammerheadClient.define(\'Settings\', function (require, exports) {',
        '    exports.JOB_OWNER_TOKEN = "ownerToken";',
        '    exports.JOB_UID = "jobUid";',
        '});',
        'var UrlUtil = HammerheadClient.get("UrlUtil");',
        'UrlUtil.OriginLocation.get = function() { return "https://example.com"; };',
        'HammerheadClient.get(\'Hammerhead\').init();'
    ].join(''));
});

IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);

QUnit.testStart = function () {
    lastError = null;
};

asyncTest('init API', function () {
    var testRunner  = new TestRunnerBase(),
        testStarted = false;

    ok(testRunner.act);
    ok(testRunner.act._start);
    ok(testRunner.act._onJSError);
    ok(testRunner.ok);
    ok(testRunner.notOk);
    ok(testRunner.eq);
    ok(testRunner.notEq);
    ok(testRunner.handleAlert);
    ok(testRunner.handleConfirm);
    ok(testRunner.handlePrompt);
    ok(testRunner.handleBeforeUnload);

    testRunner.act._start([], [], 0);

    testRunner.on(testRunner.TEST_STARTED_EVENT, function () {
        testStarted = true;
        ok(!testRunner.act._start);
        ok(!testRunner.act._onJSError);
    });

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        ok(testStarted);
        start();
    });
});

asyncTest('Inactivity monitor', function () {
    var storedStartInactivityMonitor = Transport.startInactivityMonitor;
    Transport.startInactivityMonitor = function (callback) {
        window.setTimeout(callback, 0);
    };

    var testRunner = new TestRunner();

    window.setTimeout(function () {
        ok(lastError);
        equal(lastError.code, SharedErrors.TEST_INACTIVITY);

        Transport.startInactivityMonitor = storedStartInactivityMonitor;
        start();
    }, 100);
});

asyncTest('Uncaught error in test script', function () {
    var errorText = 'Test error',
        stepNames = ['1.Step name'],
        testSteps = [function () {
            throw errorText;
        }];

    var testRunner = new TestRunnerBase();

    testRunner.on(testRunner.TEST_STARTED_EVENT, function () {
        window.setTimeout(function () {
            ok(lastError);
            ok(lastError.code === SharedErrors.UNCAUGHT_JS_ERROR_IN_TEST_CODE_STEP);
            equal(lastError.scriptErr, errorText);

            start();
        }, 0);
    });

    testRunner.act._start(stepNames, testSteps, 0);
});

module('inIFrame arguments');
function wrapIFrameArgument (arg) {
    return function () {
        return arg;
    };
}

test('DOM element', function () {
    var arg                 = null,
        testRunner          = new TestRunnerBase();

    testRunner._initApi();
    testRunner._runInIFrame = function (iFrame) {
        arg = iFrame;
    };

    var iFrame = $('#iFrame')[0];
    testRunner.inIFrame(wrapIFrameArgument(iFrame), 0)();

    equal(arg, iFrame);
});

test('jQuery object', function () {
    var arg                 = null,
        testRunner          = new TestRunnerBase();

    testRunner._initApi();
    testRunner._runInIFrame = function (iFrame) {
        arg = iFrame;
    };

    var $iFrame = $('#iFrame');
    testRunner.inIFrame(wrapIFrameArgument($iFrame), 0)();

    equal(arg, $iFrame[0]);
});

test('string selector', function () {
    var arg                 = null,
        testRunner          = new TestRunnerBase();

    testRunner._initApi();
    testRunner._runInIFrame = function (iFrame) {
        arg = iFrame;
    };

    var $iFrame = $('#iFrame');
    testRunner.inIFrame(wrapIFrameArgument('#iFrame'), 0)();

    equal(arg, $iFrame[0]);
});

test('function', function () {
    var arg                 = null,
        testRunner          = new TestRunnerBase();

    testRunner._initApi();
    testRunner._runInIFrame = function (iFrame) {
        arg = iFrame;
    };

    var iFrameGetter = function () {
        return $('#iFrame')[0];
    };

    testRunner.inIFrame(wrapIFrameArgument(iFrameGetter), 0)();

    equal(arg, iFrameGetter());
});

test('empty argument error', function () {
    var testRunner = new TestRunnerBase();

    testRunner._initApi();
    testRunner.inIFrame(wrapIFrameArgument(null), 0)();

    equal(lastError.code, SharedErrors.API_EMPTY_IFRAME_ARGUMENT);
    lastError      = null;

    testRunner.inIFrame(wrapIFrameArgument('#notExistingIFrame'), 0)();
    equal(lastError.code, SharedErrors.API_EMPTY_IFRAME_ARGUMENT);
});

test('not iFrame error', function () {
    var testRunner = new TestRunnerBase(),
        $div       = $('<div></div>').appendTo('body');

    testRunner._initApi();
    testRunner.inIFrame(wrapIFrameArgument($div), 0)();

    equal(lastError.code, SharedErrors.API_IFRAME_ARGUMENT_IS_NOT_IFRAME);
    $div.remove();
});

test('multiple argument error', function () {
    var testRunner = new TestRunnerBase(),
        $iFrame    = $('<iframe></iframe>').appendTo('body');

    testRunner._initApi();
    testRunner.inIFrame(wrapIFrameArgument('iframe'), 0)();

    equal(lastError.code, SharedErrors.API_MULTIPLE_IFRAME_ARGUMENT);
    $iFrame.remove();
});

test('incorrect argument error', function () {
    var testRunner = new TestRunnerBase();

    testRunner._initApi();

    testRunner.inIFrame(wrapIFrameArgument(['#iframe']), 0)();
    equal(lastError.code, SharedErrors.API_INCORRECT_IFRAME_ARGUMENT);
    lastError      = null;

    testRunner.inIFrame(wrapIFrameArgument({ iFrame: $('#iframe') }), 0)();
    equal(lastError.code, SharedErrors.API_INCORRECT_IFRAME_ARGUMENT);
    lastError      = null;
});