var Hammerhead = HammerheadClient.get('Hammerhead'),

    $ = Hammerhead.$,
    Util = Hammerhead.Util,
    EventSandbox = Hammerhead.EventSandbox;

Hammerhead.init(window, document);

$(document).ready(function () {
    var containerCaptureEventRaised = false,
        containerBubbleEventRaised = false,
        elementCaptureEventRaised = false,
        elementBubbleEventRaised = false,
        uiElementCaptureEventRaised = false,
        uiElementBubbleEventRaised = false,

        $container = null,
        container = null,
        $input = null,
        input = null,
        $uiElement = null,
        uiElement = null;

    var containerCaptureHandler = function () {
        containerCaptureEventRaised = true;
    };

    var containerBubbleHandler = function () {
        containerBubbleEventRaised = true;
    };

    var elementCaptureHandler = function () {
        elementCaptureEventRaised = true;
    };

    var elementBubbleHandler = function () {
        elementBubbleEventRaised = true;
    };

    var uiElementCaptureHandler = function () {
        uiElementCaptureEventRaised = true;
    };

    var uiElementBubbleHandler = function () {
        uiElementBubbleEventRaised = true;
    };

    var bindAll = function (event) {
        container.addEventListener(event, containerCaptureHandler, true);
        container.addEventListener(event, containerBubbleHandler, false);
        input.addEventListener(event, elementCaptureHandler, true);
        input.addEventListener(event, elementBubbleHandler, false);
        uiElement.addEventListener(event, uiElementCaptureHandler, true);
        uiElement.addEventListener(event, uiElementBubbleHandler, false);
    };

    var dispatchEvent = function (el, type) {
        var ev = document.createEvent('MouseEvents');
        ev.initMouseEvent(type, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, el);

        el.dispatchEvent(ev);
    };

    var dispatchPointerEvent = function (el, type) {
        var pointEvent = Util.isIE11 ? document.createEvent('PointerEvent') : document.createEvent('MSPointerEvent'),
            eventType = Util.isIE11 ? 'pointer' + type : 'MSPointer' + type.substring(0, 1).toUpperCase() + type.substring(1);

        pointEvent.initPointerEvent(type, true, true, window, 0, 0,
            0, 0, 0, false, false, false, false, 0, null, 0, 0, 0, 0, 0.5, 0, 0, 0, 1, 'mouse', Date.now(), true);

        el.dispatchEvent(pointEvent);
    };

    QUnit.testStart = function () {
        containerCaptureEventRaised = false;
        containerBubbleEventRaised = false;
        elementCaptureEventRaised = false;
        elementBubbleEventRaised = false;
        uiElementCaptureEventRaised = false;
        uiElementBubbleEventRaised = false;

        $container = $('<div>').appendTo('body');
        container = $container[0];
        $input = $('<input>').appendTo($container);
        input = $input[0];
        $uiElement = $('<div>').appendTo($container);
        uiElement = $uiElement[0];
    };

    QUnit.testDone = function () {
        $container.remove();
        $input.remove();
        $uiElement.remove();
    };

    test('initElementListening', function () {
        var event = 'click',
            firstHandlerCounter = 0,
            secondHandlerCounter = 0,
            thirdHandlerCounter = 0,
            fourthHandlerCounter = 0;

        var firstHandler = function () {
            firstHandlerCounter++;
        };

        var secondHandler = function () {
            secondHandlerCounter++;
        };

        var thirdHandler = function () {
            thirdHandlerCounter++;
        };

        var fourthHandler = function () {
            fourthHandlerCounter++;
        };

        EventSandbox.initElementListening(container, [event]);

        EventSandbox.addInternalEventListener(container, [event], function () {
        });

        function checkHandlerCounters(first, second, third, fourth) {
            equal(firstHandlerCounter, first);
            equal(secondHandlerCounter, second);
            equal(thirdHandlerCounter, third);
            equal(fourthHandlerCounter, fourth);

        }

        //NOTE: because of T233158 - Wrong test run for mouse click in IE
        //it should be different handlers
        container.addEventListener(event, firstHandler, true);
        container.addEventListener(event, secondHandler);
        container.addEventListener(event, thirdHandler, true);
        container.addEventListener(event, fourthHandler, false);

        dispatchEvent(container, event);

        checkHandlerCounters(1, 1, 1, 1);

        container.removeEventListener(event, firstHandler, true);
        container.removeEventListener(event, fourthHandler);

        dispatchEvent(container, event);

        checkHandlerCounters(1, 2, 2, 1);

        container.removeEventListener(event, secondHandler, false);
        container.removeEventListener(event, thirdHandler, true);

        dispatchEvent(container, event);

        checkHandlerCounters(1, 2, 2, 1);
    });

    test('stop propagation', function () {
        var event = 'focus';

        var stopPropagation = function (e, dispatched, preventEvent, cancelHandlers, stopPropagation) {
            equal(e.type, event);
            stopPropagation();
        };

        EventSandbox.initElementListening(container, [event]);

        EventSandbox.addInternalEventListener(container, [event], stopPropagation);

        bindAll(event);

        ok(Util.getActiveElement() !== input);
        input.focus();

        ok(!containerCaptureEventRaised);
        ok(!containerBubbleEventRaised);
        ok(!elementCaptureEventRaised);
        ok(!elementBubbleEventRaised);

        ok(Util.getActiveElement() === input);
    });

    test('add wrapper', function () {
        var event = 'click';

        var onclick1 = function () {
            equal(this, input);
        };

        var clickListenersWrapper = function (e, originListener) {
            originListener.call(input, e);
        };

        EventSandbox.setEventListenerWrapper(container, [event], clickListenersWrapper);

        container.addEventListener(event, onclick1, true);

        expect(1);

        dispatchEvent(container, event);
    });

    module('Prevent event');

    test('Preventer added before listener', function () {
        var event = 'click',
            preventEventRaised = false;

        var preventEvent = function (e, dispatched, preventEvent) {
            equal(e.type, event);
            preventEventRaised = true;
            preventEvent();
        };

        EventSandbox.initElementListening(container, [event]);

        EventSandbox.addInternalEventListener(container, [event], preventEvent);

        bindAll(event);

        dispatchEvent(input, event);

        ok(preventEventRaised);
        ok(!containerCaptureEventRaised);
        ok(!containerBubbleEventRaised);
        ok(!elementCaptureEventRaised);
        ok(!elementBubbleEventRaised);

        preventEventRaised = false;

        EventSandbox.removeInternalEventListener(container, [event], preventEvent);

        dispatchEvent(input, event);

        ok(!preventEventRaised);
        ok(containerCaptureEventRaised);
        ok(containerBubbleEventRaised);
        ok(elementCaptureEventRaised);
        ok(elementBubbleEventRaised);
    });

    test('Preventer added after listener', function () {
        var event = 'click',
            preventEventRaised = false;

        var preventEvent = function (e, dispatched, preventEvent) {
            equal(e.type, event);
            preventEventRaised = true;
            preventEvent();
        };

        EventSandbox.initElementListening(container, [event]);

        bindAll(event);

        EventSandbox.addInternalEventListener(container, [event], preventEvent);

        dispatchEvent(input, event);

        ok(preventEventRaised);
        ok(!containerCaptureEventRaised);
        ok(!containerBubbleEventRaised);
        ok(!elementCaptureEventRaised);
        ok(!elementBubbleEventRaised);
    });

    test('Append several handlers', function () {
        var event1 = 'click',
            event2 = 'mousedown',
            handler1Raised = false,
            handler2Raised = false,
            preventEventCounter = 0;

        var handler1 = function () {
            handler1Raised = true;
        };

        var handler2 = function () {
            handler2Raised = true;
        };

        var preventEvent = function (e, dispatched, preventEvent) {
            preventEventCounter++;
            preventEvent();
        };

        EventSandbox.initElementListening(container, [event1, event2]);

        EventSandbox.addInternalEventListener(container, [event1], handler1);
        EventSandbox.addInternalEventListener(container, [event1], preventEvent);
        EventSandbox.addInternalEventListener(container, [event1], handler2);
        EventSandbox.addInternalEventListener(container, [event2], preventEvent);

        bindAll(event1);
        bindAll(event2);

        dispatchEvent(input, event1);
        dispatchEvent(input, event2);

        equal(preventEventCounter, 2);
        ok(handler1Raised);
        ok(!handler2Raised);
        ok(!containerCaptureEventRaised);
        ok(!containerBubbleEventRaised);
        ok(!elementCaptureEventRaised);
        ok(!elementBubbleEventRaised);
    });

    module('Cancel handlers');

    test('Canceller added betfore listener', function () {
        var event = 'click',
            cancelHandlersRaised = false;

        var cancelHandlers = function (e, dispatched, preventEvent, cancelHandlers) {
            equal(e.type, event);
            cancelHandlersRaised = true;
            cancelHandlers();
        };

        EventSandbox.initElementListening(container, [event]);

        EventSandbox.addInternalEventListener(container, [event], cancelHandlers);

        bindAll(event);

        dispatchEvent(uiElement, event);

        ok(cancelHandlersRaised);
        ok(!containerCaptureEventRaised);
        ok(!containerBubbleEventRaised);
        ok(!elementCaptureEventRaised);
        ok(!elementBubbleEventRaised);
        ok(uiElementCaptureEventRaised);
        ok(uiElementBubbleEventRaised);

        EventSandbox.removeInternalEventListener(container, [event], cancelHandlers);
    });

    test('Canceller added after listener', function () {
        var event = 'click',
            cancelHandlersRaised = false;

        var cancelHandlers = function (e, dispatched, preventEvent, cancelHandlers) {
            equal(e.type, event);
            cancelHandlersRaised = true;
            cancelHandlers();
        };

        EventSandbox.initElementListening(container, [event]);

        bindAll(event);

        EventSandbox.addInternalEventListener(container, [event], cancelHandlers);

        dispatchEvent(uiElement, event);

        ok(cancelHandlersRaised);
        ok(!containerCaptureEventRaised);
        ok(!containerBubbleEventRaised);
        ok(!elementCaptureEventRaised);
        ok(!elementBubbleEventRaised);
        ok(uiElementCaptureEventRaised);
        ok(uiElementBubbleEventRaised);

        EventSandbox.removeInternalEventListener(container, [event], cancelHandlers);
    });

    module('regression');

    test('T233158 - Wrong test run for mouse click in IE (document handlers)', function () {
        var event = 'click',
            clickHandlerCounter = 0;

        var clickHandler = function () {
            clickHandlerCounter++;
        };

        EventSandbox.initElementListening(document, [event]);

        EventSandbox.addInternalEventListener(document, [event], function () {
        });

        document.addEventListener(event, clickHandler, true);
        document.addEventListener(event, clickHandler, true);
        document.addEventListener(event, clickHandler, true);
        dispatchEvent(document, event);
        equal(clickHandlerCounter, 1);

        document.removeEventListener(event, clickHandler, true);
        dispatchEvent(document, event);
        equal(clickHandlerCounter, 1);

        $(document).bind('click', clickHandler);
        $(document).bind('click', clickHandler);
        dispatchEvent(document, event);
        equal(clickHandlerCounter, 3);

        $(document).unbind('click', clickHandler);
        dispatchEvent(document, event);
        equal(clickHandlerCounter, 3);

        $(document).on('click', clickHandler);
        $(document).on('click', clickHandler);
        dispatchEvent(document, event);
        equal(clickHandlerCounter, 5);

        $(document).off('click', clickHandler);
        dispatchEvent(document, event);
        equal(clickHandlerCounter, 5);

        document.addEventListener(event, clickHandler, true);
        $(document).bind('click', clickHandler);
        $(document).on('click', clickHandler);
        dispatchEvent(document, event);
        equal(clickHandlerCounter, 8);
        document.removeEventListener(event, clickHandler, true);
        $(document).unbind('click', clickHandler);
        $(document).off('click', clickHandler);

        document.addEventListener(event, clickHandler, true);
        document.addEventListener(event, clickHandler, false);
        dispatchEvent(document, event);
        equal(clickHandlerCounter, 10);

        document.removeEventListener(event, clickHandler, true);
        document.removeEventListener(event, clickHandler, false);
    });

    test('T233158 - Wrong test run for mouse click in IE (body handlers)', function () {
        var event = 'click',
            clickHandlerCounter = 0;

        var clickHandler = function () {
            clickHandlerCounter++;
        };

        EventSandbox.initElementListening(document, [event]);

        EventSandbox.addInternalEventListener(document, [event], function () {
        });

        document.body.addEventListener(event, clickHandler, true);
        document.body.addEventListener(event, clickHandler, true);
        document.body.addEventListener(event, clickHandler, false);
        $('body').bind('click', clickHandler);
        $('body').bind('click', clickHandler);
        $('body').on('click', clickHandler);
        $('body').on('click', clickHandler);

        dispatchEvent(document.body, event);
        equal(clickHandlerCounter, 6);

        document.body.removeEventListener(event, clickHandler, true);
        document.body.removeEventListener(event, clickHandler, false);
        $('body').unbind('click', clickHandler);
        $('body').off('click', clickHandler);
    });

    test('T233158 - Wrong test run for mouse click in IE (element handlers)', function () {
        var event = 'click',
            clickHandlerCounter = 0;

        var clickHandler = function () {
            clickHandlerCounter++;
        };

        EventSandbox.initElementListening(document, [event]);

        EventSandbox.addInternalEventListener(document, [event], function () {
        });

        container.addEventListener(event, clickHandler, true);
        container.addEventListener(event, clickHandler, true);
        container.addEventListener(event, clickHandler, false);
        $container.bind('click', clickHandler);
        $container.bind('click', clickHandler);
        $container.on('click', clickHandler);
        $container.on('click', clickHandler);

        dispatchEvent(container, event);
        equal(clickHandlerCounter, 6);

        container.removeEventListener(event, clickHandler, true);
        container.removeEventListener(event, clickHandler, false);
        $container.unbind('click', clickHandler);
        $container.off('click', clickHandler);
    });

    if (Util.isIE && Util.browserVersion >= 10) {
        test('T233158 - Wrong test run for mouse click in IE (document pointer event handlers)', function () {
            var events = 'pointerdown MSPointerDown',
                eventHandlerCounter = 0;

            var handler = function () {
                eventHandlerCounter++;
            };

            EventSandbox.initElementListening(document, [events]);

            EventSandbox.addInternalEventListener(document, [events], function () {
            });

            document.addEventListener('pointerdown', handler, true);
            document.addEventListener('pointerdown', handler, true);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 1 : 0);

            document.addEventListener('MSPointerDown', handler, true);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 2 : 1);

            document.removeEventListener('pointerdown', handler, true);
            document.addEventListener('MSPointerDown', handler, true);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 3 : 2);

            document.removeEventListener('MSPointerDown', handler, true);
            document.addEventListener('MSPointerDown', handler, true);
            document.addEventListener('MSPointerDown', handler, false);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 5 : 4);
            document.removeEventListener('MSPointerDown', handler, true);
            document.removeEventListener('MSPointerDown', handler, false);

            document.addEventListener('pointerdown', handler, true);
            document.addEventListener('MSPointerDown', handler, false);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 7 : 5);
            document.removeEventListener('pointerdown', handler, true);
            document.removeEventListener('MSPointerDown', handler, false);

            document.addEventListener('pointerdown', handler, true);
            document.addEventListener('pointerdown', handler, false);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 9 : 5);
            document.removeEventListener('pointerdown', handler, true);
            document.removeEventListener('pointerdown', handler, false);

            $(document).bind('pointerdown', handler);
            $(document).bind('pointerdown', handler);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 11 : 5);
            $(document).unbind('pointerdown', handler);

            $(document).bind('pointerdown', handler);
            $(document).bind('MSPointerDown', handler);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 12 : 6);
            $(document).unbind('pointerdown', handler);
            $(document).unbind('MSPointerDown', handler);

            $(document).bind('MSPointerDown', handler);
            $(document).bind('MSPointerDown', handler);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 12 : 8);
            $(document).unbind('MSPointerDown', handler);

            $(document).on('pointerdown', handler);
            $(document).on('pointerdown', handler);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 14 : 8);
            $(document).off('pointerdown', handler);

            $(document).on('pointerdown', handler);
            $(document).on('MSPointerDown', handler);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 15 : 9);
            $(document).off('pointerdown', handler);
            $(document).off('MSPointerDown', handler);

            $(document).on('MSPointerDown', handler);
            $(document).on('MSPointerDown', handler);
            dispatchPointerEvent(container, Util.isIE11 ? 'pointerdown' : 'MSPointerDown');
            equal(eventHandlerCounter, Util.isIE11 ? 15 : 11);
            $(document).off('MSPointerDown', handler);
        });
    }
});
