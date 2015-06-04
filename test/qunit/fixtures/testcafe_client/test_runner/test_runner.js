var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Transport = TestCafeClient.get('Base.Transport'),
    TestRunnerBase = TestCafeClient.get('TestRunner.TestRunnerBase'),
    TestRunner = TestCafeClient.get('TestRunner.TestRunner'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    SharedConst = TestCafeClient.get('Shared.Const'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    ModalBackground = TestCafeClient.get('UI.ModalBackground'),
    ServiceCommands = TestCafeClient.get('Shared.ServiceCommands'),
    Settings = HammerheadClient.get('Settings');

Hammerhead.init();

Transport.batchUpdate = function (callback) {
    callback();
};
Transport.startInactivityMonitor = function () {
};
Transport.stopInactivityMonitor = function () {
};
ModalBackground.hide = function () {
};
ActionBarrier.waitPageInitialization = function (callback) {
    callback();
};
$.fn.load = function (callback) {
    callback();
};

QUnit.testStart = function () {
};

module('Regression');
asyncTest('T204773 - TestCafe - The assertion in last step with inIFrame wrapper works incorrect in IE browser', function () {
    Settings.SERVICE_MSG_URL = '/xhr-test/500';

    var savedAsyncServiceMsg = Transport.asyncServiceMsg,
        assertionFailedMessageTime = null;

    Transport.asyncServiceMsg = function (msg, callback) {
        if (msg.cmd === ServiceCommands.ASSERTION_FAILED)
            assertionFailedMessageTime = Date.now();

        if (msg.cmd === ServiceCommands.TEST_COMPLETE)
            ok(Date.now() - assertionFailedMessageTime >= 500);

        savedAsyncServiceMsg.apply(Transport, arguments);
    };

    Transport.switchToWorkerIdle = function () {
    };

    var testRunner = new TestRunner();

    testRunner._onAssertionFailed({err: 'err'});

    testRunner._onTestComplete({callback: function () {
        start();
    }});


});

test('Test iterator should not call Transport.fail twice (without screenshots)', function () {
    var savedTakeScreenshotOnFails = Settings.TAKE_SCREENSHOT_ON_FAILS,
        savedTransportFail = Transport.fail;

    var transportFailCount = 0;

    Transport.fail = function () {
        transportFailCount++;
    };
    Settings.TAKE_SCREENSHOT_ON_FAILS = false;

    var testRunner = new TestRunner();
    testRunner._onError();
    testRunner._onError();

    equal(transportFailCount, 1);

    Settings.TAKE_SCREENSHOT_ON_FAILS = savedTakeScreenshotOnFails;
    Transport.fail = savedTransportFail;
});

test('Test iterator should not call Transport.fail twice (with screenshots)', function () {
    var savedTakeScreenshotOnFails = Settings.TAKE_SCREENSHOT_ON_FAILS,
        savedTransportFail = Transport.fail;

    var transportFailCount = 0;

    Transport.fail = function () {
        transportFailCount++;
    };
    Settings.TAKE_SCREENSHOT_ON_FAILS = true;

    var testRunner = new TestRunner();
    testRunner._onError();
    testRunner._onError();

    equal(transportFailCount, 1);

    Settings.TAKE_SCREENSHOT_ON_FAILS = savedTakeScreenshotOnFails;
    Transport.fail = savedTransportFail;
});