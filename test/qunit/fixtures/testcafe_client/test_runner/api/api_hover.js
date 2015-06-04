var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    JSProcessor = Hammerhead.JSProcessor,
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
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
        currentSourceIndex = null,
        currentErrorCode = null,
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
        };

    //tests
    QUnit.testStart = function () {
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

    asyncTest('check mouseover and mouseout event', function () {
        if (Util.hasTouchEvents) {
            expect(0);
            start();
            return;
        }

        var $el1 = addInputElement('button', 'button1', 200, 200),
            $el2 = addInputElement('button', 'button1', 400, 400),

            mouseOver1Raised = false,
            mouseOut1Raised = false,
            mouseOver2Raised = false;

        $el1.mouseover(function () {
            mouseOver1Raised = true;
        });

        $el1.mouseout(function () {
            mouseOut1Raised = true;
        });

        $el2.mouseover(function () {
            mouseOver2Raised = true;
        });

        asyncActionCallback = function () {
            ok(mouseOver1Raised);

            asyncActionCallback = function () {
                ok(mouseOut1Raised);
                ok(mouseOver2Raised);
                equal(actionTargetWaitingCounter, 2);
                equal(actionRunCounter, 2);
                start();
            };

            ActionsAPI.hover($el2);
        };

        ActionsAPI.hover($el1);
    });


    asyncTest('T188166 - act.hover trigger "mouseenter" event with "which" parameter 1', function () {
        if (Util.hasTouchEvents) {
            expect(0);
            start();
            return;
        }

        var $el = addInputElement('button', 'button1', 200, 200);

        $el.mouseover(function (e) {
            equal(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('e.which')), $.browser.webkit ? 0 : 1);
            equal(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('e.originalEvent.which')), $.browser.webkit ? 0 : 1);
        });

        $el.mouseenter(function (e) {
            equal(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('e.which')), $.browser.webkit ? 0 : 1);
            equal(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('e.originalEvent.which')), $.browser.webkit ? 0 : 1);
        });

        $el[0].addEventListener('mouseover', function (e) {
            equal(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('e.which')), $.browser.webkit ? 0 : 1);
        });

        asyncActionCallback = function () {
            expect(5);
            start();
        };

        ActionsAPI.hover($el);
    });

    asyncTest('T191183 - pointer event properties are fixed', function () {
        if (Util.hasTouchEvents) {
            expect(0);
            start();
            return;
        }

        var $el = addInputElement('button', 'button1', 400, 400),
            mouseoverRaised = false,
            mouseoverWhichParam = null,
            mouseenterRaised = false,
            mouseenterWhichParam = null;

        $el.mouseover(function (e) {
            mouseoverRaised = true;
            equal(e.button, 0);
            if (Util.isIE || Util.isMozilla)
                equal(e.buttons, 0);
            mouseoverWhichParam = eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('e.which'));
        });

        $el.mouseenter(function (e) {
            mouseenterRaised = true;
            equal(e.button, 0);
            if (Util.isIE || Util.isMozilla)
                equal(e.buttons, 0);
            mouseenterWhichParam = eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('e.which'));
        });

        $el[0].onmspointermove = function (e) {
            equal(e.pointerType, Util.isIE11 ? 'mouse' : 4);
            equal(e.button, -1);
            equal(e.buttons, 0);
        };

        $el[0].onmspointerover = function (e) {
            equal(e.pointerType, Util.isIE11 ? 'mouse' : 4);
            equal(e.button, -1);
            equal(e.buttons, 0);
        };

        asyncActionCallback = function () {
            ok(mouseoverRaised);
            ok(mouseenterRaised);
            equal(mouseoverWhichParam, $.browser.webkit ? 0 : 1);
            equal(mouseenterWhichParam, $.browser.webkit ? 0 : 1);

            if (Util.isMozilla || (Util.isIE && Util.browserVersion === 9))
                expect(8);
            else if (Util.isIE)
                expect(17);
            else
                expect(6);
            start();
        };

        ActionsAPI.hover($el);
    });

    asyncTest('T214458 - The Hover action does not allow specifying mouse action options thus being inconsistent with other actions', function () {
        if (Util.hasTouchEvents) {
            expect(0);
            start();
            return;
        }

        var $el = addInputElement('button', 'button1', 200, 200),
            elementOffset = Util.getOffsetPosition($el[0]),
            actionOffset = 10,
            lastMouseMoveEvent = null;

        $el.mousemove(function (e) {
            lastMouseMoveEvent = e;
        });

        asyncActionCallback = function () {
            equal(lastMouseMoveEvent.pageX, elementOffset.left + actionOffset);
            equal(lastMouseMoveEvent.pageY, elementOffset.top + actionOffset);
            ok(lastMouseMoveEvent.shiftKey);

            start();
        };

        ActionsAPI.hover($el, {shift: true, offsetX: actionOffset, offsetY: actionOffset});
    });
});
