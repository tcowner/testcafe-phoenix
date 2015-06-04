var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Settings = HammerheadClient.get('Settings'),
    UrlUtil = HammerheadClient.get('UrlUtil'),

    TestRunnerBase = TestCafeClient.get('TestRunner.TestRunnerBase');

Hammerhead.init();

Settings.CROSS_DOMAIN_PROXY_PORT = 1336;

UrlUtil.getOriginUrlObj = function () {
    return {
        protocol: 'http:',
        host: 'origin_parent_host'
    };
};

asyncTest('run test', function () {
    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/run_test.html');
    $iframe.appendTo('body');

    var testRunner = new TestRunnerBase(),
        inIFrame = testRunner.inIFrame,
        eq = testRunner.eq,
        stepCount = 0,
        iframeStepCount = 0,
        errorRaised = false,
        assertionFailed = false,
        sharedData = {},
        stepNames = ['1', '2', '3', '4'],
        steps = [
            function () {
                this.testValue = 1;
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                eq(this.testValue, 1);
                this.testValue = 2;
            }),
            function () {
                eq(this.testValue, 2);
                this.testValue = 3;
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                eq(this.testValue, 3);
            })
        ];

    var storedIFrameStepExecuted = testRunner._onIFrameStepExecuted;
    testRunner._onIFrameStepExecuted = function () {
        iframeStepCount++;
        storedIFrameStepExecuted.call(testRunner);
    };

    testRunner._onError = function () {
        errorRaised = true;
    };

    testRunner._onAssertionFailed = function () {
        assertionFailed = true;
    };

    testRunner._onNextStepStarted = function (e) {
        stepCount++;
        e.callback();
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

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        equal(stepCount, 4);
        equal(iframeStepCount, 2);
        ok(!errorRaised);
        ok(!assertionFailed);

        start();
    });

    testRunner.act._start(stepNames, steps, 0);
});