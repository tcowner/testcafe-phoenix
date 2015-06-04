var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    EventParser = TestCafeClient.get('Recorder.EventParser'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Util = Hammerhead.Util;

Hammerhead.init();
ActionBarrier.init();

$(document).ready(function () {
    JavascriptExecutor.init();

    var TEST_ELEMENT_CLASS = 'element',

        DBLCLICK_WAITING_TIMEOUT = 500,

        A_KEY_CODE = 65,
        A_CHAR_CODE = 97,

        B_KEY_CODE = 66,
        B_CHAR_CODE = 98,

        CTRL_KEY_CODE = Util.KEYS_MAPS.MODIFIERS.ctrl;

    //Global

    var eventHandlingBlocked = false,
        preventEvent = null,
        element = null,
        editableElement = null,
        initOptions = null,
        lastParsedActionType = null,
        lastParsedActionKeysArg = null;

    //Utils
    var createTestElement = function () {
        return $('<div></div>').height(10).width(10).addClass(TEST_ELEMENT_CLASS).appendTo('body')[0];
    };

    var createTestEditableElement = function () {
        return $('<input type="text"/>').height(10).width(10).addClass(TEST_ELEMENT_CLASS).appendTo('body')[0];
    };

    //Event utils
    var createMouseEvent = function (type, target, button, x, y, ctrl, alt, shift, meta) {
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

    var createKeyEvent = function (type, target, keyCode, charCode, ctrl, alt, shift, meta) {
        var key = $.browser.opera && type === 'keypress' ? charCode : keyCode,
            char;
        if (!($.browser.opera && type === 'keypress'))
            char = charCode;
        return {
            target: target,
            type: type,
            keyCode: key,
            charCode: char,
            ctrlKey: ctrl || false,
            altKey: alt || false,
            shiftKey: shift || false,
            metaKey: meta || false
        };
    };

    //Actions emulation
    var actionParsingEmulators = {
        click: function (element) {
            var mousedown = createMouseEvent('mousedown', element),
                mouseup = createMouseEvent('mouseup', element),
                click = createMouseEvent('click', element);

            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEvent('pointerdown', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(mousedown);
            if (Util.getActiveElement() !== element)
                element.focus();
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEvent('pointerup', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(mouseup);
            return EventParser.parseEvent(click);
        },

        drag: function (element) {
            var mousedown = createMouseEvent('mousedown', element, Util.BUTTON.LEFT),
                mousemove = createMouseEvent('mousemove', element),
                mouseup = createMouseEvent('mouseup', element),
                click = createMouseEvent('click', element);

            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEvent('pointerdown', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(mousedown);
            element.focus();
            for (var i = 0; i < 10; i++) {
                if (Util.isIE && Util.browserVersion >= 10)
                    EventParser.parseEvent(createMouseEvent('pointermove', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(mousemove);
            }
            if (Util.isIE && Util.browserVersion >= 10)
                return EventParser.parseEvent(createMouseEvent('pointerup', element, Util.BUTTON.LEFT));
            return EventParser.parseEvent(mouseup);
        }
    };

    //Setup
    var blockEventHandling = function () {
        eventHandlingBlocked = true;
    };

    var unblockEventHandling = function () {
        eventHandlingBlocked = false;
    };

    var actionParsedCallback = function (action) {
        lastParsedActionType = action.type;

        if (action.apiArguments)
            lastParsedActionKeysArg = action.apiArguments.keysCommand;
    };

    QUnit.testStart = function () {
        eventHandlingBlocked = false;
        element = createTestElement();
        editableElement = createTestEditableElement();
        initOptions = {
        };
    };

    QUnit.testDone = function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
        element = null;
        editableElement = null;
        lastParsedActionType = null;
        lastParsedActionKeysArg = null;
        preventEvent = null;
        EventParser.destroy();
    };

    //Tests
    test('does not block current event when click event on non-editable element parsed', function () {
        EventParser.init(actionParsedCallback);

        preventEvent = actionParsingEmulators.click(element);
        ok(!preventEvent);
    });

    test('does not block current event when click event on editable element parsed', function () {
        EventParser.init(actionParsedCallback);

        preventEvent = actionParsingEmulators.click(editableElement);
        ok(!preventEvent);
    });

    test('does not block events during type event', function () {
        editableElement.focus();
        var keyDown = createKeyEvent('keydown', editableElement, A_KEY_CODE, A_CHAR_CODE),
            keyPress = createKeyEvent('keypress', editableElement, A_KEY_CODE, A_CHAR_CODE),
            keyUp = createKeyEvent('keyup', editableElement, A_KEY_CODE, A_CHAR_CODE);

        EventParser.init(actionParsedCallback);

        preventEvent = EventParser.parseEvent(keyDown);
        ok(!preventEvent);

        preventEvent = EventParser.parseEvent(keyPress);
        ok(!preventEvent);

        preventEvent = EventParser.parseEvent(keyUp);
        ok(!preventEvent);
    });

    test('do not block current mouse event when drag action parsed', function () {
        EventParser.init(actionParsedCallback);

        preventEvent = actionParsingEmulators.drag(element);
        ok(!preventEvent);
    });

    //On typing state changed
    asyncTest('callback when typing state changed', function () {
        var inTyping = false,

            keyDown = createKeyEvent('keydown', editableElement, A_KEY_CODE, A_CHAR_CODE),
            keyPress = createKeyEvent('keypress', editableElement, A_KEY_CODE, A_CHAR_CODE),
            keyUp = createKeyEvent('keyup', editableElement, A_KEY_CODE, A_CHAR_CODE);

        initOptions.typingStateChangedCallback = function (typing) {
            inTyping = typing;
        };

        EventParser.init(actionParsedCallback, initOptions);

        actionParsingEmulators.click(editableElement);

        EventParser.parseEvent(keyDown);
        EventParser.parseEvent(keyPress);
        window.setTimeout(function () {
            ok(inTyping);
            EventParser.parseEvent(keyUp);
            EventParser.destroy();
            ok(!inTyping);
            start();
        }, 100)
    });

    asyncTest('notify about action when typing state changed callback function call it', function () {
        var keyDown = createKeyEvent('keydown', editableElement, A_KEY_CODE, A_CHAR_CODE),
            keyPress = createKeyEvent('keypress', editableElement, A_KEY_CODE, A_CHAR_CODE),
            keyUp = createKeyEvent('keyup', editableElement, A_KEY_CODE, A_CHAR_CODE);

        initOptions.typingStateChangedCallback = function (typing, callback) {
            if (typing)
                window.setTimeout(callback, 100);
        };

        EventParser.init(actionParsedCallback, initOptions);

        editableElement.focus();
        EventParser.parseEvent(keyDown);
        EventParser.parseEvent(keyPress);
        EventParser.parseEvent(keyUp);
        window.setTimeout(function () {
            equal(lastParsedActionType, 'type');
            start();
        }, 200);
    });

    //on click editor state changed
    asyncTest('callback when activation editor state changed', function () {
        var input = createTestEditableElement(),
            isClickStarted = false,
            mousedown = createMouseEvent('mousedown', input),
            mouseup = createMouseEvent('mouseup', input),
            click = createMouseEvent('click', input);

        initOptions.clickEditorStateChangedCallback = function (clickStarted, callback) {
            isClickStarted = clickStarted;
        };
        EventParser.init(actionParsedCallback, initOptions);
        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEvent('pointerdown', input));
        EventParser.parseEvent(mousedown);
        if (Util.getActiveElement() !== input)
            input.focus();
        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEvent('pointerup', input));
        EventParser.parseEvent(mouseup);
        ok(!isClickStarted);
        EventParser.parseEvent(click);
        window.setTimeout(function () {
            ok(isClickStarted);
            EventParser.destroy();
            ok(!isClickStarted);
            start();
        }, 100)
    });

    asyncTest('notify about action when activation editor state changed callback function call it', function () {
        var input = createTestEditableElement(),
            mousedown = createMouseEvent('mousedown', input),
            mouseup = createMouseEvent('mouseup', input),
            click = createMouseEvent('click', input);

        initOptions.clickEditorStateChangedCallback = function (isClickOnEditable, callback) {
            if (isClickOnEditable)
                window.setTimeout(callback, 100);
        };

        EventParser.init(actionParsedCallback, initOptions);
        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEvent('pointerdown', input));
        EventParser.parseEvent(mousedown);
        if (Util.getActiveElement() !== input)
            input.focus();
        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEvent('pointerup', input));
        EventParser.parseEvent(mouseup);
        EventParser.parseEvent(click);
        window.setTimeout(function () {
            equal(lastParsedActionType, 'click');
            start();
        }, 200);
    });

    //Shortcuts
    var ctrlKeyDown = function (el) {
            return createKeyEvent('keydown', el || element, CTRL_KEY_CODE);
        },
        ctrlKeyUp = function (el) {
            return createKeyEvent('keyup', el || element, CTRL_KEY_CODE);
        },
        aKeyDown = function (el) {
            return createKeyEvent('keydown', el || element, A_KEY_CODE, A_CHAR_CODE);
        },
        aKeyPress = function (el) {
            return createKeyEvent('keypress', el || element, A_KEY_CODE, A_CHAR_CODE);
        },
        aKeyUp = function (el) {
            return createKeyEvent('keyup', el || element, A_KEY_CODE, A_CHAR_CODE);
        },
        bKeyDown = function (el) {
            return createKeyEvent('keydown', el || element, B_KEY_CODE, B_CHAR_CODE);
        },
        bKeyPress = function (el) {
            return createKeyEvent('keypress', el || element, B_KEY_CODE, B_CHAR_CODE);
        },
        bKeyUp = function (el) {
            return createKeyEvent('keyup', el || element, B_KEY_CODE, B_CHAR_CODE);
        };

    //blocking shortcuts
    //NOTE: Blocking shortcut parsing should raise shortcut handling and prevent event
    test('simple press blocking shortcut', function () {
        var shortcutPressed = false;
        initOptions.executableShortcuts = {
            'ctrl+a': function () {
                shortcutPressed = true;
            }
        };

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(shortcutPressed);
        ok(preventEvent);

        EventParser.parseEvent(aKeyPress());

        EventParser.parseEvent(aKeyUp());

        EventParser.parseEvent(ctrlKeyUp());

        ok(!lastParsedActionType);
    });

    test('press blocking shortcut several time with holded modifier', function () {
        var shortcutPressedCount = 0;
        initOptions.executableShortcuts = {
            'ctrl+a': function () {
                shortcutPressedCount++;
            }
        };

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        preventEvent = EventParser.parseEvent(aKeyDown());
        equal(shortcutPressedCount, 1);
        ok(preventEvent);

        EventParser.parseEvent(aKeyPress());

        EventParser.parseEvent(aKeyUp());

        preventEvent = EventParser.parseEvent(aKeyDown());
        equal(shortcutPressedCount, 2);
        ok(preventEvent);

        EventParser.parseEvent(aKeyPress());

        EventParser.parseEvent(aKeyUp());

        EventParser.parseEvent(ctrlKeyUp());

        ok(!lastParsedActionType);
    });

    test('press and hold blocking shortcut', function () {
        var shortcutPressedCount = 0;
        initOptions.executableShortcuts = {
            'ctrl+a': function () {
                shortcutPressedCount++;
            }
        };

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        preventEvent = EventParser.parseEvent(aKeyDown());
        equal(shortcutPressedCount, 1);
        ok(preventEvent);

        EventParser.parseEvent(aKeyPress());

        EventParser.parseEvent(aKeyPress());
        equal(shortcutPressedCount, 1);
        ok(preventEvent);


        EventParser.parseEvent(aKeyUp());

        EventParser.parseEvent(ctrlKeyUp());

        ok(!lastParsedActionType);
    });

    test('blocking shortcut as a part of key combination should not raise shortcut handling', function () {
        var shortcutPressedCount = 0;
        initOptions.executableShortcuts = {
            'ctrl+a': function () {
                shortcutPressedCount++;
            }
        };

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        EventParser.parseEvent(bKeyDown());
        EventParser.parseEvent(bKeyPress());
        EventParser.parseEvent(aKeyDown());
        EventParser.parseEvent(aKeyUp());
        EventParser.parseEvent(bKeyUp());
        EventParser.parseEvent(ctrlKeyUp());

        ok(!shortcutPressedCount);
        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+b+a');
    });

    //recordable shortcuts
    //NOTE: recordable shortcuts parsing should prevent current action and notify about press action, but not raise
    // shortcut handler. If shortcut is a part of pressed key combination, action's argument should contain full key
    // combination.

    //simple shortcut
    test('press simple recordable shortcut', function () {
        initOptions.recordableShortcutList = ['a'];

        EventParser.init(actionParsedCallback, initOptions);

        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(!eventHandlingBlocked);
        ok(!preventEvent);

        EventParser.parseEvent(aKeyPress());

        preventEvent = EventParser.parseEvent(aKeyUp());
        ok(!eventHandlingBlocked);
        ok(!preventEvent);

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'a');
    });

    test('hold simple recordable shortcut', function () {
        initOptions.recordableShortcutList = ['a'];

        EventParser.init(actionParsedCallback, initOptions);

        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(!preventEvent);
        EventParser.parseEvent(aKeyPress());

        ok(!lastParsedActionType);

        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(!preventEvent);

        EventParser.parseEvent(aKeyUp());

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'a a');
    });

    test('simple shortcut as a part of the combination', function () {
        initOptions.recordableShortcutList = ['a'];

        EventParser.init(actionParsedCallback, initOptions);
        EventParser.parseEvent(ctrlKeyDown());
        preventEvent = EventParser.parseEvent(aKeyDown());

        ok(!preventEvent);
        EventParser.parseEvent(aKeyPress());
        EventParser.parseEvent(aKeyUp());

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+a');
    });

    test('hold simple shortcut as a part of the combination', function () {
        initOptions.recordableShortcutList = ['a'];

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(!preventEvent);

        EventParser.parseEvent(aKeyPress());

        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(!preventEvent);

        EventParser.parseEvent(aKeyPress());

        EventParser.parseEvent(aKeyUp());

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+a ctrl+a');
    });

    test('several presses simple shortcut as a part of the combination', function () {
        initOptions.recordableShortcutList = ['a'];

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(!preventEvent);

        EventParser.parseEvent(aKeyPress());
        preventEvent = EventParser.parseEvent(aKeyUp());
        ok(!preventEvent);

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+a');

        lastParsedActionType = null;
        lastParsedActionKeysArg = null;

        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(!preventEvent);

        EventParser.parseEvent(aKeyPress());
        preventEvent = EventParser.parseEvent(aKeyUp());
        ok(!preventEvent);

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'a');
    });

    test('combination of two simple shortcuts', function () {
        initOptions.recordableShortcutList = ['a', 'b'];

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(aKeyDown());
        EventParser.parseEvent(aKeyPress());
        EventParser.parseEvent(bKeyDown());
        EventParser.parseEvent(bKeyPress());
        EventParser.parseEvent(aKeyUp());
        EventParser.parseEvent(bKeyUp());

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'a b');
    });

    test('typing and than simple shortcut', function () {
        initOptions.recordableShortcutList = ['a'];

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(bKeyDown(editableElement));
        EventParser.parseEvent(bKeyPress(editableElement));
        EventParser.parseEvent(aKeyDown(editableElement));
        EventParser.parseEvent(aKeyPress(editableElement));
        EventParser.parseEvent(aKeyUp(editableElement));
        EventParser.parseEvent(bKeyUp(editableElement));

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'a');
    });

    //combined shortcut
    test('press combined recordable shortcut', function () {
        initOptions.recordableShortcutList = ['ctrl+a'];

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(!preventEvent);

        EventParser.parseEvent(aKeyPress());
        EventParser.parseEvent(aKeyUp());

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+a');
        lastParsedActionType = null;
        ok(!lastParsedActionType);
    });

    test('hold combined recordable shortcut', function () {
        initOptions.recordableShortcutList = ['ctrl+a'];

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        preventEvent = EventParser.parseEvent(aKeyDown());

        ok(!preventEvent);
        EventParser.parseEvent(aKeyPress());

        ok(!lastParsedActionType);

        preventEvent = EventParser.parseEvent(aKeyDown());
        ok(!preventEvent);
        EventParser.parseEvent(aKeyUp());

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+a ctrl+a');
    });

    test('combination of combine and simple shortcuts', function () {
        initOptions.recordableShortcutList = ['b', 'ctrl+a'];

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        EventParser.parseEvent(aKeyDown());
        EventParser.parseEvent(aKeyPress());
        EventParser.parseEvent(bKeyDown());
        EventParser.parseEvent(bKeyPress());
        EventParser.parseEvent(bKeyUp());
        EventParser.parseEvent(aKeyUp());
        EventParser.parseEvent(ctrlKeyUp());

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+a b');
    });

    test('typing and than combine shortcut', function () {
        initOptions.recordableShortcutList = ['ctrl+a'];

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(bKeyDown(editableElement));
        EventParser.parseEvent(bKeyPress(editableElement));
        EventParser.parseEvent(ctrlKeyDown(editableElement));
        EventParser.parseEvent(aKeyDown(editableElement));
        EventParser.parseEvent(aKeyPress(editableElement));
        EventParser.parseEvent(aKeyUp(editableElement));
        EventParser.parseEvent(ctrlKeyUp(editableElement));
        EventParser.parseEvent(bKeyUp(editableElement));

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+a');
    });

    module('regression tests');

    test('B234389 - TD2 - click on non-editable element after click on editable element is not prevented', function () {
        EventParser.init(actionParsedCallback, initOptions);

        preventEvent = actionParsingEmulators.click(editableElement);
        ok(!preventEvent);

        var $link = $('<a></a>').addClass(TEST_ELEMENT_CLASS).attr('href', 'http://demos.devexpress.com/').appendTo('body')[0];
        preventEvent = actionParsingEmulators.click($link);
        ok(!preventEvent);
    });

    asyncTest('B233912: does not block event handling when element clicked twice on editable element with timeout', function () {
        EventParser.init(actionParsedCallback, initOptions);

        actionParsingEmulators.click(editableElement);
        ok(!eventHandlingBlocked);

        window.setTimeout(function () {
            EventParser.parseEvent(createMouseEvent('mouseover', element));
            preventEvent = actionParsingEmulators.click(editableElement);
            ok(!eventHandlingBlocked);
            ok(!preventEvent);
            start();
        }, DBLCLICK_WAITING_TIMEOUT + 50);
    });

    test('B234944 - Code editor selection failed', function () {
        initOptions.recordableShortcutList = ['a', 'ctrl+a'];

        EventParser.init(actionParsedCallback, initOptions);

        EventParser.parseEvent(ctrlKeyDown());
        EventParser.parseEvent(aKeyDown());
        EventParser.parseEvent(aKeyPress());
        EventParser.parseEvent(aKeyUp());

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+a');

        lastParsedActionType = null;
        lastParsedActionKeysArg = null;

        EventParser.parseEvent(aKeyDown());
        EventParser.parseEvent(aKeyPress());
        EventParser.parseEvent(aKeyUp());

        equal(lastParsedActionType, 'press');
        equal(lastParsedActionKeysArg, 'ctrl+a');

        EventParser.parseEvent(ctrlKeyUp());
    });

    asyncTest('B235930 - Complete typing icon has incorrect position on the google.com', function () {
        var callbackCallingCount = 0,

            keyDown = createKeyEvent('keydown', editableElement, A_KEY_CODE, A_CHAR_CODE),
            keyPress = createKeyEvent('keypress', editableElement, A_KEY_CODE, A_CHAR_CODE),
            keyUp = createKeyEvent('keyup', editableElement, A_KEY_CODE, A_CHAR_CODE);

        initOptions.typingStateChangedCallback = function (typing) {
            callbackCallingCount++;
        };

        EventParser.init(actionParsedCallback, initOptions);

        actionParsingEmulators.click(editableElement);

        EventParser.parseEvent(keyDown);
        EventParser.parseEvent(keyPress);
        EventParser.parseEvent(keyUp);
        EventParser.parseEvent(keyDown);
        EventParser.parseEvent(keyPress);
        EventParser.parseEvent(keyUp);
        window.setTimeout(function () {
            equal(callbackCallingCount, 2);
            start();
        }, 200)
    });
});