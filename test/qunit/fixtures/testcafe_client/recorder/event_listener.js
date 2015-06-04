var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Settings = TestCafeClient.get('Settings'),
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    EventListener = TestCafeClient.get('Recorder.EventListener'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Util = Hammerhead.Util,
    ShadowUI = Hammerhead.ShadowUI,
    EventSandbox = Hammerhead.EventSandbox,
    DOMSandbox = HammerheadClient.get('DOMSandbox'),
    NativeMethods = Hammerhead.NativeMethods;

Hammerhead.init();
ActionBarrier.init();
DOMSandbox.raiseBodyCreatedEvent();

//B234685 - TD2 - Recorder interface buttons doesn\'t work on itunes
var preventBodyClick = function () {
    var body = document.body;
    if (body.addEventListener)
        body.addEventListener('click', Util.preventDefault, true);
    else
        body.attachEvent('click', Util.preventDefault);
};

if (document.body)
    preventBodyClick();
else {
    $(document).ready(function () {
        preventBodyClick();
    });
}


$(document).ready(function () {
    var EventSimulator = EventSandbox.Simulator;

    JavascriptExecutor.init();

    var TEST_ELEMENT_CLASS = 'testElement',
        currentTestingElement = null,
        currentTestingActionType = null,
        actionParsed = false,
        asyncTestTimeoutId = null,
        DBLCLICK_WAITING_TIMEOUT = 500,

        elMethodChangedFlag = '233c06b6-2445-438d',
        savedMethodPrefix = '__';

    var swapNativeAndTestCafeClientDispatchEventFunctions = function (el) {
            if (!el)
                return;

            if (el[elMethodChangedFlag]) {
                el.dispatchEvent = el[savedMethodPrefix + 'dispatchEvent'];
                el.fireEvent = el[savedMethodPrefix + 'fireEvent'];
                el[elMethodChangedFlag] = false;
            }
            else {
                el[savedMethodPrefix + 'dispatchEvent'] = el.dispatchEvent;
                el[savedMethodPrefix + 'fireEvent'] = el.fireEvent;

                el.dispatchEvent = function () {
                    NativeMethods.dispatchEvent.apply(el, arguments);
                };

                el.fireEvent = function () {
                    NativeMethods.fireEvent.apply(el, arguments);
                };
                el[elMethodChangedFlag] = true;
            }
        },
        simulateClick = function (el) {
            EventSimulator.mousedown(el);
            EventSimulator.mouseup(el);
            EventSimulator.click(el);
        },
        simulateDblClick = function (el) {
            simulateClick(el);
            simulateClick(el);
            EventSimulator.dblclick(el);
        },
        simulatePress = function (el, keyCode) {
            var options = {
                keyCode: keyCode
            };
            EventSimulator.keydown(el, options);
            EventSimulator.keyup(el, options);
        },
        createButton = function (doc) {
            if (!doc)
                doc = document;
            return $('<button>test</button>').addClass(TEST_ELEMENT_CLASS).appendTo($('body', doc))[0];
        },
        createInput = function (value) {
            var elementString = ['<input type="text" value="', value, '" />'].join('');
            return $(elementString)
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo('body')[0];
        },
        simulateDblClickAndAssertListening = function () {
            currentTestingActionType = 'dblclick';
            swapNativeAndTestCafeClientDispatchEventFunctions(currentTestingElement);
            simulateDblClick(currentTestingElement);
            ok(actionParsed);
        },
        eventListenerCallback = function (action) {
            if (action.element === currentTestingElement && action.type === currentTestingActionType)
                actionParsed = true;
        },
        eventListenerStart = function () {
            EventListener.start(eventListenerCallback, {});
        },

        runAsyncTest = function (actions, timeout) {
            actions();
            asyncTestTimeoutId = window.setTimeout(function () {
                ok(false, 'Timeout is exceeded');
                start();
            }, timeout);
        };

//setup

    QUnit.testStart = function () {
        Settings.RECORDING = true;
    };

    QUnit.testDone = function () {
        EventListener.stop();
        if (asyncTestTimeoutId)
            window.clearTimeout(asyncTestTimeoutId);
        asyncTestTimeoutId = null;
        $('.' + TEST_ELEMENT_CLASS).remove();
        actionParsed = false;
        currentTestingElement = null;
        currentTestingActionType = null;
    };

//tests
    module('elements listening');

    test('simple element', function () {
        currentTestingElement = createButton();
        eventListenerStart();
        simulateDblClickAndAssertListening();
    });
    test('dynamically added element', function () {
        eventListenerStart();
        currentTestingElement = createButton();
        simulateDblClickAndAssertListening();
    });

    module('eventListener API');

    test('pause-resume', function () {
        eventListenerStart();
        currentTestingElement = createButton();
        simulateDblClickAndAssertListening();
        EventListener.pause();
        actionParsed = false;
        simulateDblClick(currentTestingElement);
        ok(!actionParsed);
        EventListener.resume();
        actionParsed = false;
        simulateDblClick(currentTestingElement);
        ok(actionParsed);
    });
    asyncTest('reset', function () {
        runAsyncTest(function () {
            eventListenerStart();
            currentTestingElement = createButton();
            currentTestingActionType = 'click';
            swapNativeAndTestCafeClientDispatchEventFunctions(currentTestingElement);
            EventSimulator.mousedown(currentTestingElement);
            EventSimulator.mouseup(currentTestingElement);
            EventListener.reset();
            EventSimulator.click(currentTestingElement);
            window.setTimeout(function () {
                ok(!actionParsed);
                start();
            }, DBLCLICK_WAITING_TIMEOUT + 100);
        }, 2000);
    });

    module('dispatched events');

    test('dispatched events are not listened', function () {
        eventListenerStart();
        currentTestingElement = createButton();
        currentTestingActionType = 'dblclick';
        simulateDblClick(currentTestingElement);
        ok(!actionParsed);
        actionParsed = false;
        swapNativeAndTestCafeClientDispatchEventFunctions(currentTestingElement);
        simulateDblClick(currentTestingElement);
        ok(actionParsed);
        actionParsed = false;
        swapNativeAndTestCafeClientDispatchEventFunctions(currentTestingElement);
        simulateDblClick(currentTestingElement);
        ok(!actionParsed);
    });

    test('fireEvent with null args', function () {
        currentTestingElement = createButton();

        if (currentTestingElement.fireEvent) {
            eventListenerStart();
            currentTestingElement.fireEvent('onmousedown');
            currentTestingElement.fireEvent('onmouseup');
            currentTestingElement.fireEvent('onclick');
            currentTestingElement.fireEvent('onmousedown');
            currentTestingElement.fireEvent('onmouseup');
            currentTestingElement.fireEvent('onclick');
            currentTestingElement.fireEvent('ondblclick');
            ok(!actionParsed);
        }
        else
            expect(0);
    });

    asyncTest('document\'s event handler that prevents capturing', function () {
        runAsyncTest(function () {
            var onclick = function (e) {
                Util.preventDefault(e);
            };

            if (document.addEventListener)
                document.addEventListener('click', onclick, true);
            else
                document.attachEvent('click', onclick);
            eventListenerStart();
            currentTestingElement = createButton();
            currentTestingActionType = 'click';
            swapNativeAndTestCafeClientDispatchEventFunctions(currentTestingElement);
            simulateClick(currentTestingElement);
            if (document.removeEventListener)
                document.removeEventListener('click', onclick, true);
            else
                document.detachEvent('click', onclick);

            window.setTimeout(function () {
                ok(actionParsed);
                start();
            }, DBLCLICK_WAITING_TIMEOUT + 100);
        }, 2000);
    });

    module('regression tests');
    asyncTest('B234685 - TD2 - Recorder interface buttons doesn\'t work on itunes', function () {
        var eventHandled = false;

        runAsyncTest(function () {
            eventListenerStart();

            var $currentTestingElement = $('<input />').appendTo(ShadowUI.getRoot());

            ShadowUI.bind($currentTestingElement, 'click', function () {
                eventHandled = true;
            });

            swapNativeAndTestCafeClientDispatchEventFunctions($currentTestingElement[0]);
            simulateClick($currentTestingElement[0]);

            window.setTimeout(function () {
                ok(eventHandled);
                $currentTestingElement.remove();
                start();
            }, DBLCLICK_WAITING_TIMEOUT + 100);
        }, 2000);
    });
});
