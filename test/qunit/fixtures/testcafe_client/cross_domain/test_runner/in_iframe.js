var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Settings = HammerheadClient.get('Settings'),
    UrlUtil = HammerheadClient.get('UrlUtil'),

    TestRunnerBase = TestCafeClient.get('TestRunner.TestRunnerBase'),
    CursorWidget = TestCafeClient.get('UI.Cursor');

Hammerhead.init();
CursorWidget.init();

Settings.CROSS_DOMAIN_PROXY_PORT = 1336;
Settings.SERVICE_MSG_URL = '/xhr-test/100';

asyncTest('run steps in iframe', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var testRunner = new TestRunnerBase(),
        count = 0,
        errorRaised = false,
        assertionFailed = false,
        clickRaised = false,
        steps = [
            {
                stepName: '1.Click',
                step: function () {
                    act.click("#button");
                },
                stepNum: 0
            },
            {
                stepName: '2.Assert',
                step: function () {
                    ok(true);
                },
                stepNum: 1
            }
        ];

    testRunner.testIterator.runNext = function () {
    };

    var storedIFrameStepExecuted = testRunner._onIFrameStepExecuted;
    testRunner._onIFrameStepExecuted = function () {
        storedIFrameStepExecuted.call(testRunner);
        count++;

        if (count === 1) {
            testRunner._runInIFrame($iframe[0], steps[1].stepName, steps[1].step, steps[1].stepNum);
            return;
        }

        if (count === 2) {
            ok(!errorRaised);
            ok(!assertionFailed);
            ok(clickRaised);

            $iframe.remove();
            testRunner._destroyIFrameBehavior();

            start();
        }
    };

    testRunner._onError = function () {
        errorRaised = true;
    };

    testRunner._onAssertionFailed = function () {
        assertionFailed = true;
    };

    window.onmessage = function (e) {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

        if (data.message === 'clickRaised')
            clickRaised = true;
    };

    testRunner._runInIFrame($iframe[0], steps[0].stepName, steps[0].step, steps[0].stepNum);
});

asyncTest('element error', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var testRunner = new TestRunnerBase(),
        errorRaised = false,
        steps = [
            {
                stepName: '1.Failed element',
                step: function () {
                    var el = $('#failed');
                    act.click(el);
                },
                stepNum: 0
            }
        ];

    testRunner._onError = function () {
        errorRaised = true;
    };

    testRunner._runInIFrame($iframe[0], steps[0].stepName, steps[0].step, steps[0].stepNum);

    $iframe.load(function () {
        window.setTimeout(function () {
            ok(errorRaised);

            $iframe.remove();
            testRunner._destroyIFrameBehavior();

            start();
        }, 1000);
    });
});

asyncTest('failed assertion', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var testRunner = new TestRunnerBase(),
        assertionFailed = false,
        steps = [
            {
                stepName: '1.Failed assertion',
                step: function () {
                    eq(true, false);
                },
                stepNum: 0
            }
        ];

    testRunner._onAssertionFailed = function (e) {
        assertionFailed = true;

        if (e && e.callback)
            e.callback();
    };

    testRunner._runInIFrame($iframe[0], steps[0].stepName, steps[0].step, steps[0].stepNum);

    testRunner.testIterator.runNext = function () {
    };

    var storedIFrameStepExecuted = testRunner._onIFrameStepExecuted;
    testRunner._onIFrameStepExecuted = function () {
        storedIFrameStepExecuted.call(testRunner);
        ok(assertionFailed);
        $iframe.remove();
        testRunner._destroyIFrameBehavior();

        start();
    };
});

asyncTest('shared data', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var testRunner = new TestRunnerBase(),
        count = 0,
        assertionFailed = false,
        errorRaised = false,
        sharedData = {},
        steps = [
            {
                stepName: '1.Set data',
                step: function () {
                    this.testValue = true;
                },
                stepNum: 0
            },
            {
                stepName: '2.Check and change data',
                step: function () {
                    ok(this.testValue);
                    this.testValue = false;
                },
                stepNum: 1
            },
            {
                stepName: '3.Check data',
                step: function () {
                    ok(!this.testValue);
                },
                stepNum: 2
            }
        ];

    testRunner._onAssertionFailed = function () {
        assertionFailed = true;
    };

    testRunner._onErrorRaised = function () {
        errorRaised = true;
    };

    testRunner._onSetStepsSharedData = function (e) {
        sharedData = e.stepsSharedData;
        e.callback();
    };

    testRunner._onGetStepsSharedData = function (e) {
        e.callback(sharedData);
    };

    testRunner._prepareStepsExecuting = function (callback) {
        callback();
    };

    testRunner._onTestComplete = function () {
        stepDone();
    };

    testRunner.testIterator.runNext = function () {
    };

    var storedIFrameStepExecuted = testRunner._onIFrameStepExecuted;
    testRunner._onIFrameStepExecuted = function () {
        storedIFrameStepExecuted.call(testRunner);
        stepDone();
    };

    testRunner.act._start([steps[0].stepName], [steps[0].step], steps[0].stepNum);

    function stepDone() {
        count++;

        if (count === 1) {
            testRunner._runInIFrame($iframe[0], steps[1].stepName, steps[1].step, steps[1].stepNum);
            return;
        }

        if (count === 2) {
            testRunner.run([steps[0].stepName, steps[1].stepName, steps[2].stepName], [steps[0].step, steps[1].step, steps[2].step], steps[2].stepNum);
            return;
        }

        if (count === 3) {
            ok(!assertionFailed);
            ok(!errorRaised);

            testRunner._destroyIFrameBehavior();
            $iframe.remove();

            start();
        }
    }
});

asyncTest('xhrBarrier', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var testRunner = new TestRunnerBase(),
        assertionFailed = false,
        count = 0,
        steps = [
            {
                stepName: '1.Click button',
                step: function () {
                    ok(!window.xhrCompleted);
                    act.click('#xhrButton');
                },
                stepNum: 0
            },
            {
                stepName: '2.Check xhr is completed',
                step: function () {
                    ok(window.xhrCompleted);
                },
                stepNum: 1
            }
        ];

    testRunner._onAssertionFailed = function () {
        assertionFailed = true;
    };

    testRunner._runInIFrame($iframe[0], steps[0].stepName, steps[0].step, steps[0].stepNum);

    testRunner.testIterator.runNext = function () {
    };

    var storedIFrameStepExecuted = testRunner._onIFrameStepExecuted;
    testRunner._onIFrameStepExecuted = function () {
        storedIFrameStepExecuted.call(testRunner);
        count++;

        if (count === 1)
            testRunner._runInIFrame($iframe[0], steps[1].stepName, steps[1].step, steps[1].stepNum);
        else {
            ok(!assertionFailed);

            testRunner._destroyIFrameBehavior();
            $iframe.remove();

            start();
        }
    };
});

asyncTest('waiting for postback', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/in_iframe.html');
    $iframe.appendTo('body');

    var testRunner = new TestRunnerBase(),
        assertionFailed = false,
        errorRaised = false,
        count = 0,
        steps = [
            {
                stepName: '1.Click link',
                step: function () {
                    ok(window.loadedTime);
                    this.firstLoadingTime = window.loadedTime;
                    act.click('#link');
                },
                stepNum: 0
            },
            {
                stepName: '2.Check the page is loaded for the second time',
                step: function () {
                    ok(window.loadedTime);
                    notEq(this.firstLoadingTime, window.loadedTime);
                },
                stepNum: 1
            }
        ];

    testRunner._onAssertionFailed = function () {
        assertionFailed = true;
    };

    testRunner._onError = function () {
        errorRaised = true;
    };

    testRunner._runInIFrame($iframe[0], steps[0].stepName, steps[0].step, steps[0].stepNum);

    testRunner.testIterator.runNext = function () {
    };

    var storedIFrameStepExecuted = testRunner._onIFrameStepExecuted;
    testRunner._onIFrameStepExecuted = function () {
        storedIFrameStepExecuted.call(testRunner);
        count++;

        if (count === 1)
            testRunner._runInIFrame($iframe[0], steps[1].stepName, steps[1].step, steps[1].stepNum);
        else {
            ok(!assertionFailed);
            ok(!errorRaised);

            testRunner._destroyIFrameBehavior();
            $iframe.remove();

            start();
        }
    };
});
