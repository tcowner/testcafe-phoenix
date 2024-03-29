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

var testIterator = new TestIterator();
ActionsAPI.init(testIterator);

$(document).ready(function () {
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

        var pageShortTimeoutDelay = 500,
            pageShortTimeoutExpired = false,
            pageShortTimeoutId = null,

            pageLongTimeoutDelay = 1000,
            pageLongTimeoutExpired = false,
            pageLongTimeoutId = null,

            currentErrorCode = null,
            currentSourceIndex = null,
        //constants
            SHORT_DELAY = 10,
            LONG_DELAY = 1000,

        //utils
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

        //tests
        QUnit.testStart = function () {
            asyncActionCallback = function () {
            };
            //set page timeouts
            pageShortTimeoutId = window.setTimeout(function () {
                pageShortTimeoutExpired = true;
            }, pageShortTimeoutDelay);

            pageLongTimeoutId = window.setTimeout(function () {
                pageLongTimeoutExpired = true;
            }, pageLongTimeoutDelay);
        };

        QUnit.testDone = function () {
            currentErrorCode = null;
            currentSourceIndex = null;

            Settings.ENABLE_SOURCE_INDEX = false;

            pageShortTimeoutExpired = false;
            window.clearTimeout(pageShortTimeoutId);
            pageShortTimeoutId = null;

            pageLongTimeoutExpired = false;
            window.clearTimeout(pageLongTimeoutId);
            pageLongTimeoutId = null;
        };

        asyncTest('wait with short ms parameter', function () {
            runAsyncTest(
                function () {
                    ActionsAPI.wait(SHORT_DELAY);
                },
                function () {
                    ok(!pageShortTimeoutExpired, 'page short timeout doesn\'t over during wait action');
                    ok(!pageLongTimeoutExpired, 'page short timeout doesn\'t over during wait action');
                },
                2000
            );
        });

        asyncTest('wait with long ms parameter', function () {
            runAsyncTest(
                function () {
                    ActionsAPI.wait(LONG_DELAY);
                },
                function () {
                    ok(pageLongTimeoutExpired, 'page short timeout was over during wait action');
                    ok(pageLongTimeoutExpired, 'page long timeout was over during wait action');
                },
                2000
            );
        });

        asyncTest('wait with feasible condition and long ms parameter', function () {
            runAsyncTest(
                function () {
                    var i = 0;
                    var condition = function () {
                        ok(this.contextCheck, 'condition context is wrong');
                        if (i !== 10) {
                            i++;
                            return false;
                        }
                        return true;
                    };

                    this.contextCheck = true;

                    ActionsAPI.wait(LONG_DELAY, condition);
                },
                function () {
                    ok(pageShortTimeoutExpired, 'page short timeout was over during wait action');
                    ok(!pageLongTimeoutExpired, 'page timeout doesn\'t over during wait action');
                },
                2000
            );
        });

        asyncTest('wait with not feasible condition and long ms parameter', function () {
            runAsyncTest(
                function () {
                    var i = 0;
                    var condition = function () {
                        return false;
                    };

                    ActionsAPI.wait(LONG_DELAY, condition);
                },
                function () {
                    ok(pageShortTimeoutExpired, 'page short timeout was over during wait action');
                    ok(pageLongTimeoutExpired, 'page timeout over over during wait action');
                },
                2000
            );
        });

        module('regression tests');

        asyncTest('not a number ms parameter raise error', function () {
            Settings.ENABLE_SOURCE_INDEX = true;
            asyncActionCallback = function () {
            };
            ActionsAPI.wait('abc', '#567');
            window.setTimeout(function () {
                equal(currentErrorCode, SharedErrors.API_INCORRECT_WAIT_ACTION_MILLISECONDS_ARGUMENT, 'correct error code sent');
                equal(currentSourceIndex, 567);
                start();
            }, 500);
        });

        asyncTest('not a function second parameter not raise error', function () {
            runAsyncTest(
                function () {
                    ActionsAPI.wait(SHORT_DELAY, 'abc');
                },
                function () {
                    ok(!pageShortTimeoutExpired, 'page short timeout doesn\'t over during wait action');
                    ok(!pageLongTimeoutExpired, 'page short timeout doesn\'t over during wait action');
                },
                2000
            );
        });

        asyncTest('mixed up settings raise error', function () {
            Settings.ENABLE_SOURCE_INDEX = true;
            asyncActionCallback = function () {
            };
            var i = 0;
            var condition = function () {
                if (i !== 10) {
                    i++;
                    return false;
                }
                return true;
            };
            ActionsAPI.wait(condition, SHORT_DELAY, '#90');
            window.setTimeout(function () {
                equal(currentErrorCode, SharedErrors.API_INCORRECT_WAIT_ACTION_MILLISECONDS_ARGUMENT, 'correct error code sent');
                equal(currentSourceIndex, 90);
                start();
            }, 500);
        });
    }
);
