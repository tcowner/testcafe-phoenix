var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    TextSelection = Hammerhead.TextSelection,
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    EventParser = TestCafeClient.get('Recorder.EventParser'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Util = Hammerhead.Util;

Hammerhead.init();
ActionBarrier.init();

$(document).ready(function () {
    JavascriptExecutor.init();

    var TEST_ELEMENT_CLASS = 'testElement';

    //special keys
    var RIGHT_KEY_CODE = Util.KEYS_MAPS.SPECIAL_KEYS.right,
        TAB_KEY_CODE = Util.KEYS_MAPS.SPECIAL_KEYS.tab,

        A_KEY_CODE = 65,
        A_CHAR_CODE = 97,

        DOWN_KEY_CODE = Util.KEYS_MAPS.SPECIAL_KEYS.down,

        DBLCLICK_WAIT_TIMEOUT = 500,

        INPUT_VALUE = 'input';

    var documentElement = document.documentElement,
        cancellingOptions = [],
        expectedCancellingOptions = [],

        checkAffectedElement = false;

    var parserInitializer = function () {
        return {
            init: function (typingStateChangedCallback) {
                EventParser.init(function (actionDescriptor) {
                    var statePage = actionDescriptor.serviceInfo.prevPageState,
                        cancelingObject = {};

                    if (actionDescriptor.type === 'click' || actionDescriptor.type === 'dblclick') {
                        cancelingObject.prevActiveElement = statePage.activeElement;
                        cancelingObject.prevStartSelection = statePage.startSelection || null;
                        cancelingObject.prevEndSelection = statePage.endSelection || null;
                        cancelingObject.prevSelectionInverted = statePage.selectionInverse;
                        cancelingObject.prevSelectedIndex = statePage.selectedIndex;
                    }
                    else if (actionDescriptor.type === 'type') {
                        cancelingObject.prevActiveElement = statePage.activeElement;
                        cancelingObject.prevStartSelection = statePage.startSelection || null;
                        cancelingObject.prevEndSelection = statePage.endSelection || null;
                        cancelingObject.prevSelectionInverted = statePage.selectionInverse;
                        cancelingObject.initialValue = statePage.affectedElementValue;
                    }

                    if (statePage && statePage.affectedElement && checkAffectedElement) {
                        cancelingObject.affectedElement = statePage.affectedElement;
                        if (Util.isTextEditableElement(statePage.affectedElement)) {
                            cancelingObject.affectedElementStartSelection = statePage.affectedElementStartSelection || null;
                            cancelingObject.affectedElementEndSelection = statePage.affectedElementEndSelection || null;
                            cancelingObject.affectedElementSelectionInverted = statePage.affectedElementSelectionInverse;
                        }
                        cancelingObject.affectedElementSelectedIndex = statePage.affectedElementSelectedIndex;
                    }

                    cancellingOptions.push(cancelingObject);
                }, {
                    typingStateChangedCallback: typingStateChangedCallback || null
                });
            },

            destroy: function () {
                EventParser.destroy();
            }
        }
    }();

    //helpers
    var createInput = function (type, id) {
        var value = id || INPUT_VALUE,
            elementString = ['<input type="', type, '" value="', value, '" />'].join('');
        return $(elementString)
            .addClass(type)
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body')[0];
    };

    var createSelect = function () {
        var select = $('<select><select/>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body')[0];
        $('<option>one</option>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo(select);
        $('<option>two</option>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo(select);
        $('<option>three</option>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo(select);
        return select;
    };

    var createMouseEventObject = function (type, target, button, x, y, ctrl, alt, shift, meta) {
        var hasMSPointerEvent = /pointer/.test(type) && Util.isIE && Util.browserVersion === 10,
            eventShortType = hasMSPointerEvent ? type.replace('pointer', '') : '';

        return {
            target: target,
            type: hasMSPointerEvent ? 'MSPointer' + eventShortType.charAt(0).toUpperCase() + eventShortType.substring(1) : type,
            ctrlKey: ctrl || false,
            altKey: alt || false,
            shiftKey: shift || false,
            metaKey: meta || false,
            pageX: x || 0,
            pageY: y || 0,
            button: button || 0
        };
    };

    var createKeyEventObject = function (type, target, keyCode, charCode, ctrl, alt, shift, meta) {
        return {
            target: target,
            type: type,
            keyCode: keyCode,
            charCode: charCode,
            ctrlKey: ctrl || false,
            altKey: alt || false,
            shiftKey: shift || false,
            metaKey: meta || false
        };
    };

    var eventGenerators = {
        click: function (element, cursorPosition) {
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT));

            if (cursorPosition !== undefined) {
                TextSelection.select(element, cursorPosition, cursorPosition);
                $(element).focus();
            }
            else
                $(element).focus();

            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointermove', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT));
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointermove', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT));
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT));
        },

        pressKey: function (element, keycode, charcode, cursorPosition, needFocus) {
            if (needFocus) {
                if (cursorPosition !== undefined && cursorPosition !== null) {
                    TextSelection.select(element, cursorPosition, cursorPosition);
                    $(element).focus();
                }
                else
                    $(element).focus();
            }

            EventParser.parseEvent(createKeyEventObject('keydown', element, keycode));

            if (cursorPosition !== undefined && cursorPosition !== null) {
                $(element).focus();
                TextSelection.select(element, cursorPosition + 1, cursorPosition + 1);
            }

            if ($.browser.opera)
                EventParser.parseEvent(createKeyEventObject('keypress', element, charcode, undefined));
            else
                EventParser.parseEvent(createKeyEventObject('keypress', element, keycode, charcode));
            EventParser.parseEvent(createKeyEventObject('keyup', element, keycode));
        }
    };

    var fillExpectedCancelingOptions = function (actionType, activeElement, caretPos, selectedIndex, initialValue, affectedElementOptions) {
        var expectedCancellingObject = {};
        if (actionType === 'click' || actionType === 'dblclick') {

            expectedCancellingObject.prevActiveElement = activeElement;
            expectedCancellingObject.prevStartSelection = caretPos;
            expectedCancellingObject.prevEndSelection = caretPos;
            expectedCancellingObject.prevSelectionInverted = Util.isTextEditableElement(activeElement) ? TextSelection.hasInverseSelection(activeElement) : false;
            expectedCancellingObject.prevSelectedIndex = selectedIndex;
        }
        else if (actionType === 'type') {
            expectedCancellingObject.prevActiveElement = activeElement;
            expectedCancellingObject.prevStartSelection = caretPos;
            expectedCancellingObject.prevEndSelection = caretPos;
            expectedCancellingObject.prevSelectionInverted = Util.isTextEditableElement(activeElement) ? TextSelection.hasInverseSelection(activeElement) : false;
            expectedCancellingObject.prevSelectedIndex = selectedIndex;
            expectedCancellingObject.initialValue = typeof initialValue !== 'undefined' ? initialValue : INPUT_VALUE;
        }

        if (affectedElementOptions) {
            expectedCancellingObject.affectedElement = affectedElementOptions.affectedElement;
            if (Util.isTextEditableElement(affectedElementOptions.affectedElement)) {
                expectedCancellingObject.affectedElementStartSelection = affectedElementOptions.affectedElementStartSelection || null;
                expectedCancellingObject.affectedElementEndSelection = affectedElementOptions.affectedElementEndSelection || null;
                expectedCancellingObject.affectedElementSelectionInverted = affectedElementOptions.affectedElementSelectionInverse;
            }
            expectedCancellingObject.affectedElementSelectedIndex = affectedElementOptions.affectedElementSelectedIndex;
        }

        expectedCancellingOptions.push(expectedCancellingObject);
    };

    var checkCancelingOptions = function () {
        equal(cancellingOptions.length, expectedCancellingOptions.length, 'number of cancelling options is correct');
        $.each(expectedCancellingOptions, function (index, value) {
            var optionExist = typeof cancellingOptions[index] !== 'undefined';

            equal(optionExist ? cancellingOptions[index].prevStartSelection : null, value.prevStartSelection, 'start selection is correct');
            equal(optionExist ? cancellingOptions[index].prevEndSelection : null, value.prevEndSelection, 'end selection is correct');
            equal(optionExist ? cancellingOptions[index].prevSelectionInverted : null, value.prevSelectionInverted, 'selection direction is correct');
            equal(optionExist ? cancellingOptions[index].prevActiveElement : null, value.prevActiveElement, 'previous active element is correct');
            equal(optionExist ? cancellingOptions[index].prevSelectedIndex : null, value.prevSelectedIndex, 'previous selected index is correct');
            equal(optionExist ? cancellingOptions[index].initialValue : null, value.initialValue, 'initial value is correct');

            equal(optionExist ? cancellingOptions[index].affectedElement : null, value.affectedElement, 'affectedElement is correct');
            equal(optionExist ? cancellingOptions[index].affectedElementStartSelection : null, value.affectedElementStartSelection, 'affectedElement start selection is correct');
            equal(optionExist ? cancellingOptions[index].affectedElementEndSelection : null, value.affectedElementEndSelection, 'affectedElement end selection is correct');
            equal(optionExist ? cancellingOptions[index].affectedElementSelectionInverted : null, value.affectedElementSelectionInverted, 'affectedElement selection direction is correct');
            equal(optionExist ? cancellingOptions[index].affectedElementSelectedIndex : null, value.affectedElementSelectedIndex, 'affectedElement selected index is correct');
        });
    };

    var getAffectedElementOptions = function (el, start, end, inverse) {
        if (typeof start !== 'undefined') {
            return {
                affectedElement: el,
                affectedElementStartSelection: start,
                affectedElementEndSelection: end,
                affectedElementSelectionInverse: inverse,
                affectedElementSelectedIndex: el.selectedIndex
            }
        }

        return {
            affectedElement: el,
            affectedElementSelectedIndex: el.selectedIndex
        }
    };

    //setup

    QUnit.testStart = function () {
        parserInitializer.init();
    };

    QUnit.testDone = function () {
        parserInitializer.destroy();
        cancellingOptions = [];
        expectedCancellingOptions = [];
        checkAffectedElement = false;
        $('.' + TEST_ELEMENT_CLASS).remove();
    };

    //tests
    module('prev action: not typing and not editable');

    asyncTest('current action: not typing and not editable', function () {
        var select1 = createSelect(),
            select2 = createSelect();

        eventGenerators.click(select1);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        window.setTimeout(function () {
            eventGenerators.click(select2);
            fillExpectedCancelingOptions('click', select1, null, 0);
            parserInitializer.destroy();
            checkCancelingOptions();
            start();
        }, DBLCLICK_WAIT_TIMEOUT);
    });

    asyncTest('current action: not typing and editable', function () {
        var select = createSelect(),
            input = createInput('text');
        eventGenerators.click(select);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        window.setTimeout(function () {
            eventGenerators.click(input);
            fillExpectedCancelingOptions('click', select, null, 0);
            parserInitializer.destroy();
            checkCancelingOptions();
            start();
        }, DBLCLICK_WAIT_TIMEOUT)
    });

    test('current action: typing and editable (PRESS AND TYPE)', function () {
        var select = createSelect(),
            input = createInput('text'),
            inputCursorPosition = input.value.length;

        eventGenerators.pressKey(select, TAB_KEY_CODE, TAB_KEY_CODE);
        fillExpectedCancelingOptions('press');
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition, true);
        //NOTE: prevActiveElement is input because at the moment of typing it was active element (after tab pressed)
        fillExpectedCancelingOptions('type', input, inputCursorPosition, null, input.value);
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    asyncTest('current action: typing and editable (CLICK AND TYPE on different elements)', function () {
        var select = createSelect(),
            input = createInput('text'),
            inputCursorPosition = 3;
        eventGenerators.click(select);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        window.setTimeout(function () {
            eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition, true);
            fillExpectedCancelingOptions('type', input, inputCursorPosition);
            parserInitializer.destroy();
            checkCancelingOptions();
            start();
        }, DBLCLICK_WAIT_TIMEOUT)
    });

    module('prev action: not typing and editable');

    asyncTest('current action: not typing and not editable', function () {
        var input = createInput('text', 'input'),
            select = createSelect(),
            inputCursorPosition = 3;
        eventGenerators.click(input, inputCursorPosition);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        window.setTimeout(function () {
            eventGenerators.click(select);
            fillExpectedCancelingOptions('click', input, inputCursorPosition, null);
            parserInitializer.destroy();
            checkCancelingOptions();
            start();
        }, DBLCLICK_WAIT_TIMEOUT);
    });

    asyncTest('current action: not typing and editable', function () {
        var input1 = createInput('text', 'input1'),
            input2 = createInput('text', 'input2'),
            inputCursorPosition = 4;
        eventGenerators.click(input1, inputCursorPosition);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        window.setTimeout(function () {
            eventGenerators.click(input2);
            fillExpectedCancelingOptions('click', input1, inputCursorPosition, null);
            parserInitializer.destroy();
            checkCancelingOptions();
            start();
        }, DBLCLICK_WAIT_TIMEOUT);
    });

    test('current action: typing and editable (CLICK+TYPE)', function () {
        var input = createInput('text');
        eventGenerators.click(input);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, null, true);
        fillExpectedCancelingOptions('type', $('body')[0], null, null);
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    asyncTest('current action: typing and editable (CLICK AND TYPE on different elements)', function () {
        var input1 = createInput('text'),
            input2 = createInput('text'),
            clickCursorPosition = input1.value.length - 1;
        input2.value = '';
        eventGenerators.click(input1, clickCursorPosition);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        window.setTimeout(function () {
            eventGenerators.click(input2, 0);
            eventGenerators.pressKey(input2, A_KEY_CODE, A_CHAR_CODE, input2.value.length, true);
            fillExpectedCancelingOptions('type', input1, clickCursorPosition, null, '');
            parserInitializer.destroy();
            checkCancelingOptions();
            start();
        }, DBLCLICK_WAIT_TIMEOUT);
    });

    test('current action: typing and editable (PRESS+TYPE on the same element)', function () {
        var input = createInput('text'),
            inputCursorPosition = 3;
        eventGenerators.click(input);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        eventGenerators.pressKey(input, RIGHT_KEY_CODE, RIGHT_KEY_CODE, inputCursorPosition, true);
        fillExpectedCancelingOptions('press');
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition + 1, true);
        fillExpectedCancelingOptions('type', input, inputCursorPosition + 1, null);
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    test('current action: typing and editable (PRESS+TYPE on different elements)', function () {
        var input = createInput('text'),
            select = createSelect();
        $('body')[0].focus();
        eventGenerators.click(select);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        eventGenerators.pressKey(documentElement, RIGHT_KEY_CODE, RIGHT_KEY_CODE);
        fillExpectedCancelingOptions('press');
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        fillExpectedCancelingOptions('type', select, null, null);
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    module('prev action: typing and editable');

    test('current action: not typing and not editable', function () {
        var input = createInput('text'),
            inputCursorPosition = 2;
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition, false);
        fillExpectedCancelingOptions('type', $('body')[0], null, null);
        eventGenerators.click(documentElement);
        fillExpectedCancelingOptions('click', input, inputCursorPosition + 1, null);
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    test('current action: not typing and editable', function () {
        var input1 = createInput('text'),
            input2 = createInput('text'),
            inputCursorPosition = 1;
        $('body')[0].focus();
        eventGenerators.pressKey(input1, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition, false);
        fillExpectedCancelingOptions('type', $('body')[0], null, null);
        eventGenerators.click(input2);
        fillExpectedCancelingOptions('click', input1, inputCursorPosition + 1, null);
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    test("current action: typing and editable (TYPE+TYPE on the same element and type action doesn\'t saved)", function () {
        var input = createInput('text'),
            inputCursorPosition = 4;
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition, false);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition + 1, false);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition + 2, false);
        fillExpectedCancelingOptions('type', $('body')[0], null, null);
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    asyncTest("current action: typing and editable (TYPE+TYPE on the same element and type action saved)", function () {
        var input = createInput('text'),
            inputCursorPosition = 4;

        parserInitializer.destroy();
        var typingStateChangedCallback = function (typing, callback) {
            //NOTE: we should not set a timeout here because otherwise the first action 'type' may generated late
            if (typing && callback)
                callback();
        };
        parserInitializer.init(typingStateChangedCallback);

        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition, false);
        fillExpectedCancelingOptions('type', $('body')[0], null, null);
        window.setTimeout(function () {
            eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE, inputCursorPosition + 1, false);
            fillExpectedCancelingOptions('type', input, inputCursorPosition + 1, null);
            parserInitializer.destroy();
            checkCancelingOptions();
            start();
        }, 200);
    });

    module('regression tests');

    asyncTest('two clicks on the same editable element', function () {
        var input = createInput('text', 'test input'),
            inputFirstCursorPosition = 3,
            inputSecondCursorPosition = 5;
        eventGenerators.click(input, inputFirstCursorPosition);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        window.setTimeout(function () {
            eventGenerators.click(input, inputSecondCursorPosition);
            fillExpectedCancelingOptions('click', input, inputFirstCursorPosition, null);
            parserInitializer.destroy();
            checkCancelingOptions();
            start();
        }, DBLCLICK_WAIT_TIMEOUT);
    });

    asyncTest('two clicks on different editable elements', function () {
        var input1 = createInput('text', 'test input1'),
            input2 = createInput('text', 'test input2'),
            inputFirstCursorPosition = 3,
            inputSecondCursorPosition = 5;
        eventGenerators.click(input1, inputFirstCursorPosition);
        fillExpectedCancelingOptions('click', $('body')[0], null, null);
        window.setTimeout(function () {
            eventGenerators.click(input2, inputSecondCursorPosition);
            fillExpectedCancelingOptions('click', input1, inputFirstCursorPosition, null);
            parserInitializer.destroy();
            checkCancelingOptions();
            start();
        }, DBLCLICK_WAIT_TIMEOUT);
    });

    test('dblclick on editable element', function () {
        var input = createInput('text', 'test input'),
            inputCursorPosition = 0;
        eventGenerators.click(input, inputCursorPosition);
        eventGenerators.click(input, inputCursorPosition);
        EventParser.parseEvent(createMouseEventObject('dblclick', input, Util.BUTTON.LEFT));
        fillExpectedCancelingOptions('dblclick', $('body')[0], null, null);
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    test('B253369 - click select and option', function () {
        var select = createSelect();

        checkAffectedElement = true;

        eventGenerators.click(select);
        fillExpectedCancelingOptions('click', $('body')[0], null, null, null, getAffectedElementOptions(select));

        EventParser.parseEvent({
            type: 'change',
            target: select
        });

        if (!$.browser.webkit)
            eventGenerators.click($(select).find('option')[1]);

        fillExpectedCancelingOptions('click', $('body')[0], null, null, null, getAffectedElementOptions(select));
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    test('B253369 - click select with size more than one and option', function () {
        var select = createSelect();

        $(select).attr('size', 2);
        select.selectedIndex = 0;
        checkAffectedElement = true;
        eventGenerators.click($(select).find('option')[1]);
        EventParser.parseEvent({
            type: 'change',
            target: select
        });
        fillExpectedCancelingOptions('click', $('body')[0], null, null, null, getAffectedElementOptions(select));
        parserInitializer.destroy();
        checkCancelingOptions();
    });

    test("B253369 - press down in select", function () {
        var select = createSelect(),
            oldSelectedIndex = select.selectedIndex;

        $(select).focus();
        checkAffectedElement = true;

        eventGenerators.pressKey(select, DOWN_KEY_CODE, DOWN_KEY_CODE);

        if (!$.browser.webkit) {
            EventParser.parseEvent({
                type: 'change',
                target: select
            });
        }

        select.selectedIndex = select.selectedIndex++;
        if (!Util.isMozilla)
            fillExpectedCancelingOptions('press');
        else {
            fillExpectedCancelingOptions('press', null, null, null, null, {
                affectedElement: select,
                affectedElementSelectedIndex: oldSelectedIndex
            });
        }
        parserInitializer.destroy();
        checkCancelingOptions();
    });
});