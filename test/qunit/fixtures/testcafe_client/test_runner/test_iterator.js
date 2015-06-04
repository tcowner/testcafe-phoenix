var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util,
    ServiceCommands = TestCafeClient.get('Shared.ServiceCommands'),
    Transport = TestCafeClient.get('Base.Transport'),
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Settings = TestCafeClient.get('Settings');

Hammerhead.init();
ActionBarrier.init();

var testIterator = null,
    nextStep = 0,
    stepsSharedData = null,
    states = [],
    onError = null;

QUnit.testStart = function () {
    testIterator = new TestIterator();
    nextStep = 0;
    stepsSharedData = null;
    states = [];
    onError = null;

    testIterator.on(TestIterator.NEXT_STEP_STARTED_EVENT, function (e) {
        states.push(ServiceCommands.SET_NEXT_STEP);
        nextStep = e.nextStep;
        e.callback();
    });

    testIterator.on(TestIterator.SET_STEPS_SHARED_DATA_EVENT, function (e) {
        states.push(ServiceCommands.SET_STEPS_SHARED_DATA);
        stepsSharedData = e.stepsSharedData;
        e.callback();
    });

    testIterator.on(TestIterator.GET_STEPS_SHARED_DATA_EVENT, function (e) {
        states.push(ServiceCommands.GET_STEPS_SHARED_DATA);
        e.callback(stepsSharedData);
    });

    testIterator.on(TestIterator.TEST_COMPLETE_EVENT, function () {
        states.push(ServiceCommands.TEST_COMPLETE);
        Transport.switchToWorkerIdle();
    });

    testIterator.on(TestIterator.ERROR_EVENT, function (err) {
        if (typeof onError === 'function')
            onError(err);
    });
};

$(document).ready(function () {
    asyncTest('Lifecycle', function () {
        states = [];
        nextStep = 0;
        stepsSharedData = null;

        testIterator.setGlobalWaitFor();

        var stepNames = ['0', '1', '2', '3', '4'];

        var steps = [
            function () {
                strictEqual(Settings.CURRENT_TEST_STEP_NAME, '0');

                states.push('step0');
                testIterator.asyncAction(function (callback) {
                    window.setTimeout(function () {
                        states.push('step0_action');
                        callback();
                    }, 500);
                });
            },

            function () {
                strictEqual(Settings.CURRENT_TEST_STEP_NAME, '1');

                this.counter = 1;

                states.push('step1');
                testIterator.asyncAction(function (callback) {
                    window.setTimeout(function () {
                        states.push('step1_action');
                        callback();
                    }, 0);
                });
            },

            function () {
                strictEqual(Settings.CURRENT_TEST_STEP_NAME, '2');

                states.push('step2');
                testIterator.asyncAction(function (callback) {
                    window.setTimeout(function () {
                        states.push('step2_action');
                        callback();
                    }, 0);
                });
            },

            function () {
                strictEqual(Settings.CURRENT_TEST_STEP_NAME, '3');
                strictEqual(this.counter, 1);

                states.push('step3');

                throw 'interrupt';
            },

            function () {
                strictEqual(Settings.CURRENT_TEST_STEP_NAME, '4');
                strictEqual(this.counter, 1);

                states.push('step4');

                var runArgumentIteratorEmulator = function (items, actionRunner, callback) {
                    actionRunner(items, callback);
                };

                testIterator.asyncActionSeries(['0', '1'], runArgumentIteratorEmulator, function (item, callback) {
                    window.setTimeout(function () {
                        states.push('step4_' + item + '_action');
                        callback();
                    }, 300);
                });
            }
        ];

        var stepSetup = function () {
            states.push('step' + Settings.CURRENT_TEST_STEP_NAME + '_setup');
        };

        var stepDone = function () {
            states.push('step' + Settings.CURRENT_TEST_STEP_NAME + '_done');
        };

        Transport.switchToWorkerIdle = function () {
            states.push('switchToWorkerIdle');
            deepEqual(states, expectedStates);
            start();
        };

        var expectedStates = [
            ServiceCommands.GET_STEPS_SHARED_DATA,
            ServiceCommands.SET_NEXT_STEP,
            'step0_setup',
            'step0',
            'step0_action',
            'step0_done',
            ServiceCommands.SET_NEXT_STEP,
            'step1_setup',
            'step1',
            ServiceCommands.SET_STEPS_SHARED_DATA,
            'step1_action',
            'step1_done',
            ServiceCommands.SET_NEXT_STEP,
            'step2_setup',
            'step2',
            'step2_action',
            'step2_done',
            ServiceCommands.SET_NEXT_STEP,
            'step3_setup',
            'step3',
            SharedErrors.UNCAUGHT_JS_ERROR_IN_TEST_CODE_STEP,
            ServiceCommands.GET_STEPS_SHARED_DATA,
            'step3_done',
            ServiceCommands.SET_NEXT_STEP,
            'step4_setup',
            'step4',
            'step4_0_action',
            'step4_1_action',
            'step4_done',
            ServiceCommands.TEST_COMPLETE,
            'switchToWorkerIdle'
        ];

        expect(8);

        //NOTE: simulate execution interruption (see 2nd step)
        onError = function (err) {
            testIterator.state.stoppedOnFail = false;
            states.push(err.code);
            testIterator.start(stepNames, steps, stepSetup, stepDone, nextStep);
            onError = null;
        };

        testIterator.start(stepNames, steps, stepSetup, stepDone, 0);
    });

    asyncTest('Global __waitFor', function () {
        states = [];
        nextStep = 0;
        stepsSharedData = null;

        var stepNames = ['0', '1'];

        var steps = [
            function () {
                states.push('step0');
                testIterator.asyncAction(function (callback) {
                    window.setTimeout(function () {
                        states.push('step0_action');
                        callback();
                    }, 500);
                });
            },

            function () {
                states.push('step1');
                testIterator.asyncAction(function (callback) {
                    window.setTimeout(function () {
                        states.push('step1_action');
                        callback();
                    }, 500);
                });
            }
        ];

        var stepSetup = function () {
            states.push('step' + Settings.CURRENT_TEST_STEP_NAME + '_setup');
        };

        var stepDone = function () {
            states.push('step' + Settings.CURRENT_TEST_STEP_NAME + '_done');
        };

        testIterator.setGlobalWaitFor(function (callback) {
            states.push('step' + Settings.CURRENT_TEST_STEP_NAME + '_pre_setup');
            callback();
        }, 1000);

        Transport.switchToWorkerIdle = function () {
            states.push('switchToWorkerIdle');
            deepEqual(states, expectedStates);
            start();
        };

        var expectedStates = [
            ServiceCommands.GET_STEPS_SHARED_DATA,
            ServiceCommands.SET_NEXT_STEP,
            ServiceCommands.INACTIVITY_EXPECTED,
            'step0_pre_setup',
            'step0_setup',
            'step0',
            'step0_action',
            'step0_done',
            ServiceCommands.SET_NEXT_STEP,
            ServiceCommands.INACTIVITY_EXPECTED,
            'step1_pre_setup',
            'step1_setup',
            'step1',
            'step1_action',
            'step1_done',
            ServiceCommands.TEST_COMPLETE,
            'switchToWorkerIdle'
        ];

        expect(1);

        testIterator.expectInactivity = function (timeout, callback) {
            states.push(ServiceCommands.INACTIVITY_EXPECTED);
            callback();
        };
        testIterator.start(stepNames, steps, stepSetup, stepDone, 0);
    });

    asyncTest('Global __waitFor failed', function () {
        states = [];
        nextStep = 0;
        stepsSharedData = null;

        var stepNames = ['0', '1'];

        var steps = [
            function () {
                states.push('step0');
                testIterator.asyncAction(function (callback) {
                    window.setTimeout(function () {
                        states.push('step0_action');
                        callback();
                    }, 500);
                });
            }
        ];

        var stepSetup = function () {
            states.push('step' + Settings.CURRENT_TEST_STEP_NAME + '_setup');
        };

        var stepDone = function () {
            states.push('step' + Settings.CURRENT_TEST_STEP_NAME + '_done');
        };

        testIterator.setGlobalWaitFor(function (callback) {
            states.push('step' + Settings.CURRENT_TEST_STEP_NAME + '_pre_setup');
        }, 1000);

        Transport.switchToWorkerIdle = function () {
            states.push('switchToWorkerIdle');
            deepEqual(states, expectedStates);
            start();
        };

        var expectedStates = [
            ServiceCommands.GET_STEPS_SHARED_DATA,
            ServiceCommands.SET_NEXT_STEP,
            ServiceCommands.INACTIVITY_EXPECTED,
            'step0_pre_setup',
            SharedErrors.API_WAIT_FOR_ACTION_TIMEOUT_EXCEEDED,
            ServiceCommands.TEST_COMPLETE,
            'switchToWorkerIdle'
        ];

        expect(1);

        onError = function (err) {
            states.push(err.code);
            states.push(ServiceCommands.TEST_COMPLETE);
            Transport.switchToWorkerIdle();
        };

        testIterator.expectInactivity = function (timeout, callback) {
            states.push(ServiceCommands.INACTIVITY_EXPECTED);
            callback();
        };

        testIterator.start(stepNames, steps, stepSetup, stepDone, 0);
    });

    module('Regression');
    test('T162970 - Delays between steps are very long on the github.com page', function () {
        var $a = $('<a href="http://test.org">Link</a>').appendTo('body'),
            clickRaised = false;

        testIterator._setupUnloadPrediction();

        $(document).on('click', 'a', function (e) {
            clickRaised = true;
            Util.preventDefault(e, false);
            return false;
        });

        $a[0].click();

        ok(clickRaised);
        ok(!testIterator.state.prolongStepDelay);

        $a.remove();
    });

    asyncTest('T226191 - The "Maximum call stack size exceeded" exception is raised when put an unserializable object to the shared data', function () {
        var stepNames = ['0'];

        var steps = [
            function () {
                states.push('step0');
                this.body = $('body');
                testIterator.asyncAction(function (callback) {
                    window.setTimeout(function () {
                        states.push('step0_action');
                        callback();
                    }, 500);
                });
            }
        ];

        Transport.switchToWorkerIdle = function () {
            states.push('switchToWorkerIdle');
            deepEqual(states, expectedStates);
            start();
        };

        var expectedStates = [
            ServiceCommands.GET_STEPS_SHARED_DATA,
            ServiceCommands.SET_NEXT_STEP,
            'step0',
            SharedErrors.STORE_DOM_NODE_OR_JQUERY_OBJECT,
            ServiceCommands.TEST_COMPLETE,
            'switchToWorkerIdle'
        ];

        expect(1);

        onError = function (err) {
            states.push(err.code);
            states.push(ServiceCommands.TEST_COMPLETE);
            Transport.switchToWorkerIdle();
        };

        testIterator.expectInactivity = function (timeout, callback) {
            callback();
        };

        testIterator.start(stepNames, steps, null, null, 0);
    });
});