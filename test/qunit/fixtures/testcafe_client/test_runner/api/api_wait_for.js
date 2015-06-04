var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    Automation = TestCafeClient.get('Automation'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Settings = TestCafeClient.get('Settings'),
    Util = Hammerhead.Util,
    CursorWidget = TestCafeClient.get('UI.Cursor');

Hammerhead.init();
Automation.init();
ActionBarrier.init();
CursorWidget.init();

var actionTargetWaitingCounter = 0,
    actionRunCounter = 0;

TestIterator.prototype.onActionTargetWaitingStarted = function () {
    actionTargetWaitingCounter++;
};

TestIterator.prototype.onActionRun = function () {
    actionRunCounter++;
};

var testIterator = new TestIterator();
ActionsAPI.init(testIterator);

$(document).ready(function () {
        var currentErrorCode = null,
            currentSourceIndex = null,
            asyncActionCallback,

            runAsyncTest = function (actions, assertions, timeout) {
                var callbackFunction = function () {
                    clearTimeout(timeoutId);
                    assertions();
                    start();
                };

                asyncActionCallback = function () {
                    callbackFunction();
                };

                testIterator.callWithSharedDataContext(actions);

                var timeoutId = setTimeout(function () {
                    callbackFunction = function () {
                    };

                    ok(false, 'Timeout is exceeded');
                    start();
                }, timeout);
            };

        QUnit.testStart = function () {
            actionTargetWaitingCounter = 0;
            actionRunCounter = 0;
        };

        QUnit.testDone = function () {
            currentErrorCode = null;
            currentSourceIndex = null;

            Settings.ENABLE_SOURCE_INDEX = false;
        };

        TestIterator.prototype.asyncAction = function (action) {
            action(asyncActionCallback);
        };

        TestIterator.prototype.expectInactivity = function (duration, callback) {
            callback();
        };

        testIterator.on(TestIterator.ERROR_EVENT, function (err) {
            testIterator.state.stoppedOnFail = false;
            currentErrorCode = err.code;
            currentSourceIndex = err.__sourceIndex;
        });

        asyncTest('wait event', function () {
            var requestComplete = false;

            runAsyncTest(
                function () {
                    this.contextCheck = true;

                    ActionsAPI.waitFor(function (callback) {
                        ok(this.contextCheck, 'event should have access to shared data');

                        $.get('/xhr-test/200', function () {
                            requestComplete = true;
                            callback();
                        });
                    }, 1000);
                },
                function () {
                    ok(requestComplete, 'action don\'t accomplished waiting for event');
                    ok(!currentErrorCode, 'action raised error');
                    equal(actionTargetWaitingCounter, 1);
                    equal(actionRunCounter, 1);
                },
                2000
            );
        });

        asyncTest('event timeout', function () {
            Settings.ENABLE_SOURCE_INDEX = true;
            ActionsAPI.waitFor($.get('/xhr-test/300').complete, 20, '#508');

            window.setTimeout(function () {
                strictEqual(currentErrorCode, SharedErrors.API_WAIT_FOR_ACTION_TIMEOUT_EXCEEDED);
                strictEqual(currentSourceIndex, 508);
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 0);

                window.setTimeout(start, 300);
            }, 100);
        });

        asyncTest('incorrect "event" argument', function () {
            expect(2);

            Settings.ENABLE_SOURCE_INDEX = true;
            asyncActionCallback = function () {
            };

            ActionsAPI.waitFor(123, 20, '#808');

            window.setTimeout(function () {
                strictEqual(currentErrorCode, SharedErrors.API_INCORRECT_WAIT_FOR_ACTION_EVENT_ARGUMENT);
                strictEqual(currentSourceIndex, 808);
                start();
            });
        });

        asyncTest('incorrect "timeout" argument', function () {
            expect(2);

            Settings.ENABLE_SOURCE_INDEX = true;
            asyncActionCallback = function () {
            };

            ActionsAPI.waitFor(function () {
            }, 'test', '#313');

            window.setTimeout(function () {
                strictEqual(currentErrorCode, SharedErrors.API_INCORRECT_WAIT_FOR_ACTION_TIMEOUT_ARGUMENT);
                strictEqual(currentSourceIndex, 313);
                start();
            });
        });

        module('Wait for elements');
        asyncTest('wait for an element success', function () {
            expect(3);
            Settings.ENABLE_SOURCE_INDEX = true;

            var $element = $('<div></div>').attr('id', 'testDivElement');

            asyncActionCallback = function () {
                equal(currentErrorCode, null);
                $element.remove();
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
                start();
            };

            ActionsAPI.waitFor('#testDivElement', '#101');
            window.setTimeout(function () {
                $element.appendTo('body');
            }, 250);
        });

        asyncTest('wait for an element timeout exceed', function () {
            expect(5);
            Settings.ENABLE_SOURCE_INDEX = true;

            var asyncActionCallbackRaised = false;

            asyncActionCallback = function () {
                asyncActionCallbackRaised = true;
            };

            ActionsAPI.waitFor('#testDivElement', 250, '#102');

            window.setTimeout(function () {
                strictEqual(currentErrorCode, SharedErrors.API_WAIT_FOR_ACTION_TIMEOUT_EXCEEDED);
                strictEqual(currentSourceIndex, 102);
                equal(asyncActionCallbackRaised, false);
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 0);

                start();
            }, 500);
        });

        asyncTest('wait for several elements success', function () {
            expect(3);
            Settings.ENABLE_SOURCE_INDEX = true;

            var $element1 = $('<div></div>').attr('id', 'testDivElement1'),
                $element2 = $('<div></div>').attr('id', 'testDivElement2');

            asyncActionCallback = function () {
                equal(currentErrorCode, null);
                $element1.remove();
                $element2.remove();
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
                start();
            };

            ActionsAPI.waitFor(['#testDivElement1', '#testDivElement2'], '#103');

            window.setTimeout(function () {
                $element1.appendTo('body');

                window.setTimeout(function () {
                    $element2.appendTo('body');
                }, 200);
            }, 200);
        });

        asyncTest('wait for several elements timeout exceed', function () {
            expect(5);
            Settings.ENABLE_SOURCE_INDEX = true;

            var $element = $('<div></div>').attr('id', 'testDivElement1').appendTo('body'),
                asyncActionCallbackRaised = false;

            asyncActionCallback = function () {
                asyncActionCallbackRaised = true;
            };

            ActionsAPI.waitFor(['#testDivElement1', '#testDivElement2'], 150, '#104');

            window.setTimeout(function () {
                strictEqual(currentErrorCode, SharedErrors.API_WAIT_FOR_ACTION_TIMEOUT_EXCEEDED);
                strictEqual(currentSourceIndex, 104);
                equal(asyncActionCallbackRaised, false);
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 0);

                $element.remove();
                start();
            }, 300);
        });

        asyncTest('Empty array as the first argument argument', function () {
            expect(2);

            Settings.ENABLE_SOURCE_INDEX = true;
            asyncActionCallback = function () {
            };

            ActionsAPI.waitFor([], '#105');

            window.setTimeout(function () {
                strictEqual(currentErrorCode, SharedErrors.API_INCORRECT_WAIT_FOR_ACTION_EVENT_ARGUMENT);
                strictEqual(currentSourceIndex, 105);
                start();
            });
        });
    }
);
