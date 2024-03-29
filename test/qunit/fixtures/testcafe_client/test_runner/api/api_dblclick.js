var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    Settings = TestCafeClient.get('Settings'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    Automation = TestCafeClient.get('Automation'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Util = Hammerhead.Util,
    CursorWidget = TestCafeClient.get('UI.Cursor');

Hammerhead.init();
Automation.init();
ActionBarrier.init();
CursorWidget.init();

var testIterator = new TestIterator();
ActionsAPI.init(testIterator);

var correctTestWaitingTime = function (time) {
    if (Util.isTouchDevice && Util.isMozilla)
        return time * 2;

    return time;
};

ActionsAPI.ELEMENT_AVAILABILITY_WAITING_TIMEOUT = 400;

$(document).ready(function () {
    var actionTargetWaitingCounter = 0,
        actionRunCounter = 0;

    TestIterator.prototype.asyncActionSeries = function (items, runArgumentsIterator, action) {
        var seriesActionsRun = function (elements, callback) {
            async.forEachSeries(
                elements,
                function (element, seriaCallback) {
                    action(element, seriaCallback);
                },
                function () {
                    callback();
                });
        };

        runArgumentsIterator(items, seriesActionsRun, asyncActionCallback);
    };

    TestIterator.prototype.onActionTargetWaitingStarted = function () {
        actionTargetWaitingCounter++;
    };

    TestIterator.prototype.onActionRun = function () {
        actionRunCounter++;
    };

    testIterator.on(TestIterator.ERROR_EVENT, function (err) {
        testIterator.state.stoppedOnFail = false;
        currentErrorCode = err.code;
        currentSourceIndex = err.__sourceIndex;
    });

    var $el,
        currentErrorCode = null,
        currentSourceIndex = null,

    //constants
        TEST_ELEMENT_CLASS = 'testElement',

    //utils
        asyncActionCallback,

        addInputElement = function (type, id, x, y) {
            var elementString = ['<input type="', type, '" id="', id, '" value="', id, '" />'].join('');
            return $(elementString)
                .css({
                    position: 'absolute',
                    marginLeft: x + 'px',
                    marginTop: y + 'px'
                })
                .addClass(type)
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo('body');
        },

        runAsyncTest = function (actions, assertions, timeout) {
            var callbackFunction = function () {
                clearTimeout(timeoutId);
                assertions();
                start();
            };
            asyncActionCallback = function () {
                callbackFunction();
            };
            actions();
            var timeoutId = setTimeout(function () {
                callbackFunction = function () {
                };
                ok(false, 'Timeout is exceeded');
                start();
            }, timeout);
        };

    //tests
    QUnit.testStart = function () {
        $el = addInputElement('button', 'button1', Math.floor(Math.random() * 100),
            Math.floor(Math.random() * 100));
        asyncActionCallback = function () {
        };

        actionTargetWaitingCounter = 0;
        actionRunCounter = 0;
    };

    QUnit.testDone = function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
        currentErrorCode = null;
        currentSourceIndex = null;
        Settings.ENABLE_SOURCE_INDEX = false;
    };

    module('different arguments tests');

    asyncTest('dom element as a parameter', function () {
        var dblclicked = false;
        runAsyncTest(
            function () {
                $el.dblclick(function () {
                    dblclicked = true;
                });
                ActionsAPI.dblclick($el[0]);
            },
            function () {
                ok(dblclicked, 'dblclick raised');
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
            },
            correctTestWaitingTime(5500)
        );
    });

    asyncTest('jQuery object with two elements as a parameter', function () {
        var dblclicksCount = 0;
        runAsyncTest(
            function () {
                addInputElement('button', 'button2', 150, 150);
                var $elements = $('.button').dblclick(function () {
                    dblclicksCount++;
                });
                ActionsAPI.dblclick($elements);
            },
            function () {
                equal(dblclicksCount, 2, 'both elements click events were raised');
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
            },
            correctTestWaitingTime(5500)
        );
    });

    asyncTest('empty first argument raises error', function () {
        Settings.ENABLE_SOURCE_INDEX = true;
        ActionsAPI.dblclick($('#nonExistentElement'), '#0');
        setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_EMPTY_FIRST_ARGUMENT);
            equal(currentSourceIndex, 0);
            start();
        }, correctTestWaitingTime(ActionsAPI.ELEMENT_AVAILABILITY_WAITING_TIMEOUT + 100));
    });

    asyncTest('dblclick with options keys', function () {
        var focused = false,
            alt = false,
            shift = false,
            ctrl = false,
            meta = false;

        runAsyncTest(
            function () {
                $el.css({ display: 'none' });
                var $input = addInputElement('text', 'input', 150, 150);
                $input.focus(function () {
                    focused = true;
                });
                $input.dblclick(function (e) {
                    alt = e.altKey;
                    ctrl = e.ctrlKey;
                    shift = e.shiftKey;
                    meta = e.metaKey;
                });
                ActionsAPI.dblclick($input[0], {
                    alt: true,
                    ctrl: true,
                    shift: true,
                    meta: true
                });
            },
            function () {
                ok(focused, 'clicked element focused');
                ok(alt, 'alt key is pressed');
                ok(shift, 'shift key is pressed');
                ok(ctrl, 'ctrl key is pressed');
                ok(meta, 'meta key is pressed');
            },
            correctTestWaitingTime(5500)
        );
    });

    module('event tests');
    asyncTest('dom events', function () {
        var clickCount = 0,
            dblclickCount = 0;
        $el.click(
            function () {
                clickCount++;
            })
            .dblclick(function () {
                dblclickCount++;
            });
        runAsyncTest(
            function () {
                ActionsAPI.dblclick($el);
            },
            function () {
                equal(clickCount, 2, 'click raised twice');
                equal(dblclickCount, 1, 'dblclick raised once');
            },
            correctTestWaitingTime(5000)
        );
    });
});
