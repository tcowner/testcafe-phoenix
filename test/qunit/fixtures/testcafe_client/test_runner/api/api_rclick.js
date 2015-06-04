var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    CursorWidget = TestCafeClient.get('UI.Cursor'),
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

var TEST_COMPLETE_WAITING_TIMEOUT = 2000;

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

    //constants
    var TEST_ELEMENT_CLASS = 'testElement',

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
                startNext();
            };
            asyncActionCallback = function () {
                callbackFunction();
            };
            actions();
            var timeoutId = setTimeout(function () {
                callbackFunction = function () {
                };
                ok(false, 'Timeout is exceeded');
                startNext();
            }, timeout);
        },

        startNext = function () {
            if ($.browser.msie) {
                removeTestElements();
                window.setTimeout(start, 30);
            }
            else
                start();
        },

        removeTestElements = function () {
            $('.' + TEST_ELEMENT_CLASS).remove();
        };

    //tests
    QUnit.testStart = function () {
        asyncActionCallback = function () {
        };

        actionTargetWaitingCounter = 0;
        actionRunCounter = 0;
    };

    QUnit.testDone = function () {
        if (!$.browser.msie)
            removeTestElements();
    };

    module('dom events tests');

    asyncTest('mouse events raised', function () {
        var $input = null,

            mousedownRaised = false,
            mouseupRaised = false,
            clickRaised = false,
            contextmenuRaised = false;
        runAsyncTest(
            function () {
                $input = addInputElement('button', 'button1', Math.floor(Math.random() * 100),
                    Math.floor(Math.random() * 100));

                window.setTimeout(function () {
                    $input.mousedown(function (e) {
                        mousedownRaised = true;
                        ok(e.which, Util.WHICH_PARAMETER.RIGHT_BUTTON);
                        ok(!mouseupRaised && !clickRaised && !contextmenuRaised, 'mousedown event was raised first');
                    });
                    $input.mouseup(function (e) {
                        mouseupRaised = true;
                        ok(e.which, Util.WHICH_PARAMETER.RIGHT_BUTTON);
                        ok(mousedownRaised && !clickRaised && !contextmenuRaised, 'mouseup event was raised second');
                    });
                    $input.click(function () {
                        clickRaised = true;
                    });
                    $input.contextmenu(function (e) {
                        contextmenuRaised = true;
                        ok(e.which, Util.WHICH_PARAMETER.RIGHT_BUTTON);
                        deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                        ok(mousedownRaised && mouseupRaised && !clickRaised, 'contextmenu event was raised third ');
                    });
                    ActionsAPI.rclick($input[0]);
                }, 200);
            },
            function () {
                ok(mousedownRaised && mousedownRaised && !clickRaised && contextmenuRaised, 'mouse events were raised');
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
                expect(10);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('T191183 - pointer event properties are fixed', function () {
        var $el = null,
            mousedownRaised = false,
            mouseupRaised = false,
            contextmenu = false;
        runAsyncTest(
            function () {
                $el = addInputElement('button', 'button1', Math.floor(Math.random() * 100),
                    Math.floor(Math.random() * 100));

                $el.mousedown(function (e) {
                    mousedownRaised = true;

                    equal(e.button, 2);
                    if (Util.isIE || Util.isMozilla)
                        equal(e.buttons, 2);

                    ok(!mouseupRaised && !contextmenu, 'mousedown event was raised first');
                });
                $el.mouseup(function (e) {
                    mouseupRaised = true;

                    equal(e.button, 2);
                    if (Util.isIE || Util.isMozilla)
                        equal(e.buttons, 2);

                    ok(mousedownRaised && !contextmenu, 'mouseup event was raised second');
                });
                $el.contextmenu(function (e) {
                    contextmenu = true;

                    equal(e.button, 2);
                    if (Util.isIE || Util.isMozilla)
                        equal(e.buttons, 2);

                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                    ok(mousedownRaised && mouseupRaised, 'click event was raised third ');
                });

                $el[0].onmspointerdown = function (e) {
                    equal(e.pointerType, Util.isIE11 ? 'mouse' : 4);
                    equal(e.button, 2);
                    equal(e.buttons, 2);
                };

                $el[0].onmspointerup = function (e) {
                    equal(e.pointerType, Util.isIE11 ? 'mouse' : 4);
                    equal(e.button, 2);
                    equal(e.buttons, 2);
                };

                ActionsAPI.rclick($el[0]);
            },
            function () {
                ok(mousedownRaised && mousedownRaised && contextmenu, 'mouse events were raised');
                if (Util.isMozilla || (Util.isIE && Util.browserVersion === 9))
                    expect(11);
                else if (Util.isIE)
                    expect(17);
                else
                    expect(8);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });
});
