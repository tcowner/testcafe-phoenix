var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Transport = TestCafeClient.get('Base.Transport'),
    TestRunner = TestCafeClient.get('TestRunner.TestRunner'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Settings = TestCafeClient.get('Settings'),
    UrlUtil = HammerheadClient.get('UrlUtil'),
    ServiceCommands = TestCafeClient.get('Shared.ServiceCommands');

Hammerhead.init();

var testRunner = null,
    lastError = null,
    lastIsFailedStep = false,
    screenShotRequestCount = false,
    expectedError = null,
    expectedScreenshotCount = 0;

Transport.batchUpdate = function (callback) {
    callback();
};
Transport.switchToWorkerIdle = function () {
};
Transport.fail = function (err) {
    ok(err.code === expectedError);
    ok(screenShotRequestCount === expectedScreenshotCount);

    testRunner._destroyIFrameBehavior();
    $('iframe').remove();
    start();
};
Transport.asyncServiceMsg = function (msg, callback) {
    if (msg.cmd === ServiceCommands.TAKE_SCREENSHOT) {
        screenShotRequestCount++;
        ok(msg.isFailedStep);
    }

    if (callback)
        callback();
};

ActionBarrier.waitPageInitialization = function (callback) {
    callback();
};
$.fn.load = function (callback) {
    callback();
};

Settings.CROSS_DOMAIN_PROXY_PORT = 1336;

UrlUtil.getOriginUrlObj = function () {
    return {
        protocol: 'http:',
        host: 'origin_parent_host'
    };
};

QUnit.testStart = function () {
    testRunner = new TestRunner();
    screenShotRequestCount = 0;
    expectedError = null;
    expectedScreenshotCount = 0;
    lastIsFailedStep = false;
};

asyncTest('Uncaught error in test script', function () {
    var errorText = 'Test error',
        stepNames = ['1.Step name'],
        testSteps = [function () {
            throw errorText;
        }];

    Settings.TAKE_SCREENSHOT_ON_FAILS = true;
    expectedError = SharedErrors.UNCAUGHT_JS_ERROR_IN_TEST_CODE_STEP;
    expectedScreenshotCount = 1;

    testRunner.act._start(stepNames, testSteps, 0);
});

asyncTest('Invisible element', function () {
    var stepNames = ['1.Step name'],
        testSteps = [function () {
            ActionsAPI.click('body1');
        }];

    Settings.TAKE_SCREENSHOT_ON_FAILS = true;
    expectedError = SharedErrors.API_EMPTY_FIRST_ARGUMENT;
    expectedScreenshotCount = 1;

    testRunner.act._start(stepNames, testSteps, 0);
});

asyncTest('Failed assertion in step with action', function () {
    var stepNames = ['1.Step name'],
        eq = testRunner.eq,
        ok = testRunner.ok,
        testSteps = [function () {
            ok(0);
            eq(0, 1);
            ActionsAPI.wait('body1');
        }];

    Settings.TAKE_SCREENSHOT_ON_FAILS = true;
    expectedError = SharedErrors.API_INCORRECT_WAIT_ACTION_MILLISECONDS_ARGUMENT;
    expectedScreenshotCount = 1;

    testRunner.act._start(stepNames, testSteps, 0);
});

asyncTest('Failed assertion in step without action', function () {
    var stepNames = ['1.Step name'],
        eq = testRunner.eq,
        ok = testRunner.ok,
        testSteps = [
            function () {
                ok(0);
                eq(0, 1);
            },
            function () {
                ActionsAPI.wait('#thowError');
            }
        ];

    Settings.TAKE_SCREENSHOT_ON_FAILS = true;
    expectedError = SharedErrors.API_INCORRECT_WAIT_ACTION_MILLISECONDS_ARGUMENT;
    expectedScreenshotCount = 2;

    testRunner.act._start(stepNames, testSteps, 0);
});

asyncTest('Failed assertion and error: without "Take scr" flag', function () {
    var stepNames = ['1.Step name'],
        eq = testRunner.eq,
        ok = testRunner.ok,
        testSteps = [
            function () {
                ok(0);
                eq(0, 1);
            },
            function () {
                ActionsAPI.wait('#thowError');
            }
        ];

    Settings.TAKE_SCREENSHOT_ON_FAILS = false;
    expectedError = SharedErrors.API_INCORRECT_WAIT_ACTION_MILLISECONDS_ARGUMENT;
    expectedScreenshotCount = 0;

    testRunner.act._start(stepNames, testSteps, 0);
});

module('in IFrame');

asyncTest('Uncaught error in test script', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var steps = [
        {
            stepName: '1.',
            step: function () {
                throw 'error';
            },
            stepNum: 0
        }
    ];

    Settings.TAKE_SCREENSHOT_ON_FAILS = true;
    expectedError = SharedErrors.UNCAUGHT_JS_ERROR_IN_TEST_CODE_STEP;
    expectedScreenshotCount = 1;

    testRunner._runInIFrame($iframe[0], steps[0].stepName, steps[0].step, steps[0].stepNum);
});

asyncTest('Invisible element', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var steps = [
        {
            stepName: '1.',
            step: function () {
                act.click("body1");
            },
            stepNum: 0
        }
    ];

    Settings.TAKE_SCREENSHOT_ON_FAILS = true;
    expectedError = SharedErrors.API_EMPTY_FIRST_ARGUMENT;
    expectedScreenshotCount = 1;

    testRunner._runInIFrame($iframe[0], steps[0].stepName, steps[0].step, steps[0].stepNum);
});

asyncTest('Error in api iframe argument', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var inIFrame = testRunner.inIFrame,
        stepNames = ['1'],
        steps = [
            inIFrame(function () {
                return $('body');
            }, function () {
                wait(100);
            })
        ];

    Settings.TAKE_SCREENSHOT_ON_FAILS = true;
    expectedError = SharedErrors.API_IFRAME_ARGUMENT_IS_NOT_IFRAME;
    expectedScreenshotCount = 1;

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('Failed assertion in step with action', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var steps = [
        {
            stepName: '1.',
            step: function () {
                ok(0);
                eq(0, 1);
                act.wait('body1');
            },
            stepNum: 0
        }
    ];

    Settings.TAKE_SCREENSHOT_ON_FAILS = true;
    expectedError = SharedErrors.API_INCORRECT_WAIT_ACTION_MILLISECONDS_ARGUMENT;
    expectedScreenshotCount = 1;

    testRunner._runInIFrame($iframe[0], steps[0].stepName, steps[0].step, steps[0].stepNum);
});
