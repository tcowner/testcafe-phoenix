var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util,
    TextSelection = Hammerhead.TextSelection,
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    SelectorGenerator = TestCafeClient.get('Recorder.SelectorGenerator'),
    EventParser = TestCafeClient.get('Recorder.EventParser'),
    Automation = TestCafeClient.get('Automation'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    AutomationSelectUtil = TestCafeClient.get('Automation.Select.Util');

Hammerhead.init();
ActionBarrier.init();
Automation.init();

$(document).ready(function () {
    var TEST_ELEMENT_CLASS = 'testElement';

    //special keys
    var EXPECTED_LOG_FLAG = 'expected',
        ACTUAL_LOG_FLAG = 'actual',

        LEFT_KEY_CODE = Util.KEYS_MAPS.SPECIAL_KEYS.left,
        RIGHT_KEY_CODE = Util.KEYS_MAPS.SPECIAL_KEYS.right,
        ALT_KEY_CODE = Util.KEYS_MAPS.MODIFIERS.alt,
        SHIFT_KEY_CODE = Util.KEYS_MAPS.MODIFIERS.shift,
        CTRL_KEY_CODE = Util.KEYS_MAPS.MODIFIERS.ctrl,
        ENTER_KEY_CODE = Util.KEYS_MAPS.SPECIAL_KEYS.enter,
        SPACE_KEY_CODE = Util.KEYS_MAPS.SPECIAL_KEYS.space,
        INSERT_KEY_CODE = Util.KEYS_MAPS.SPECIAL_KEYS.ins,
        TAB_KEY_CODE = Util.KEYS_MAPS.SPECIAL_KEYS.tab,
        EQUAL_KEY_CODE = $.browser.opera ? 61 : 187,
        EQUAL_CHAR_CODE = 61,
        DASH_KEY_CODE = $.browser.opera ? 109 : 189,
        DASH_CHAR_CODE = 45,
        SEMICOLON_KEY_CODE = $.browser.opera ? 59 : 186,
        SEMICOLON_CHAR_CODE = $.browser.opera ? 59 : 1078,

        A_KEY_CODE = 65,
        A_CHAR_CODE = 97,

        KEY_1_KEY_CODE = 49,

        TILDE_KEY_CODE = 192,
        TILDE_CHAR_CODE = 1105,

        WAIT_ACTION_SHORTCUT_KEY_CODE = 81, //ctrl+q
        HOVER_ACTION_SHORTCUT_KEY_CODE = 32;    //ctrl+space

    JavascriptExecutor.init();

    var input = null,
        dragDiv = null,
        contentEditableDiv = null,
        checkSelector = false,
        checkOffset = false,
        documentElement = document.documentElement,
        documentElementSelectors = SelectorGenerator.generate($(documentElement)),
        waitActionCount = 0,
        hoverActionCount = 0,

        selectionStart = null,
        selectionEnd = null,
        pointFrom = null,
        pointTo = null;

    var parserInitializer = function () {
        return {
            init: function () {
                EventParser.init(function (action) {
                    addToLog(action, ACTUAL_LOG_FLAG);
                }, {
                    recordableShortcutList: Automation.SUPPORTED_SHORTCUTS,
                    executableShortcuts: {
                        'Ctrl+Q': function () {
                            waitActionCount++;
                        },
                        'Ctrl+Space': function () {
                            hoverActionCount++;
                        }
                    }
                });
            },

            destroy: function () {
                EventParser.destroy();
            }
        }
    }();

    //helpers
    var createInput = function (type, id) {
        var elementString = ['<input type="', type, '" value="', id, '" />'].join('');
        return $(elementString)
            .attr('id', id ? id : '')
            .addClass(type)
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body');
    };

    var createTextarea = function (value) {
        var $textarea = $('<textarea></textarea>')
            .css({
                width: '250px',
                height: '150px'
            })
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body');
        $textarea[0].value = value;
        $textarea[0].textContent = value;
        $textarea.text(value);
        return $textarea[0];
    };

    var createOption = function (parent, text) {
        return $('<option></option>').text(text)
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo(parent);
    };

    var createOptionGroup = function (select, label) {
        return $('<optgroup></optgroup>').attr('label', label)
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo(select)[0];
    };

    var createSelect = function () {
        var select = $('<select><select/>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body')[0];

        createOption(select, 'one');
        createOption(select, 'two');
        createOption(select, 'three');

        return select;
    };

    var createSelectWithGroups = function () {
        var select = $('<select><select/>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body')[0];

        var firstGroup = createOptionGroup(select, 'First');
        createOption(firstGroup, 'one');
        createOption(firstGroup, 'two');
        createOption(firstGroup, 'three');

        var secondGroup = createOptionGroup(select, 'Second');
        createOption(secondGroup, 'four');
        createOption(secondGroup, 'five');
        createOption(secondGroup, 'six');

        var thirdGroup = createOptionGroup(select, 'Third');
        createOption(thirdGroup, 'sevent');
        createOption(thirdGroup, 'eight');
        createOption(thirdGroup, 'nine');
        return select;
    };

    var createDragDiv = function () {
        return $('<div></div>')
            .css({
                width: '100px',
                height: '100px',
                backgroundColor: 'grey',
                zIndex: 5
            })
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body');
    };

    var createContentEditableDiv = function () {
        return $('<div></div>')
            .addClass(TEST_ELEMENT_CLASS)
            .attr('contenteditable', 'true')
            .text('content editable test cafe test')
            .appendTo('body');
    };

    var createEventObject = function (type, target) {
        return {
            target: target,
            type: type
        };
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

    var createTouchEventObject = function (type, target, button, x, y) {
        return {
            target: target,
            type: type,
            targetTouches: /touchstart|touchmove/ ? [
                {
                    pageX: x || 0,
                    pageY: y || 0
                }
            ] : [],
            changedTouches: [
                {
                    pageX: x || 0,
                    pageY: y || 0
                }
            ],
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

    var createMouseActionDescriptor = function (type, element, dragX, dragY, offsetX, offsetY, ctrl) {
        var descriptor = $.extend(true, {}, Automation.defaultMouseActionDescriptor, {
            type: type,
            element: element
        });

        if ((type === 'click' || type === 'drag') && offsetX && offsetY) {
            descriptor.apiArguments.options.offsetX = offsetX;
            descriptor.apiArguments.options.offsetY = offsetY;
        }

        if (type === 'drag' && dragX && dragY) {
            descriptor.apiArguments.dragOffsetX = dragX || 0;
            descriptor.apiArguments.dragOffsetY = dragY || 0;
        }

        if (ctrl)
            descriptor.apiArguments.options.ctrl = true;

        return descriptor;
    };

    var createSelectActionDescriptor = function (element, start, end) {
        return $.extend(true, {}, Automation.defaultSelectActionDescriptor, {
            element: element,
            apiArguments: {
                startPos: start,
                endPos: end
            }
        });
    };

    var createPressActionDescriptor = function (command) {
        return $.extend(true, {}, Automation.defaultPressActionDescriptor, {
            apiArguments: {
                keysCommand: command
            }
        });
    };

    var createTypeActionDescriptor = function (text, element) {
        return $.extend(true, {}, Automation.defaultTypeActionDescriptor, {
            element: element,
            apiArguments: {
                text: text
            }
        });
    };

    var logs = {
        expected: '',
        actual: ''
    };

    var addToLog = function (action, logName) {
        logs[logName] = logs[logName].concat(createActionLog(action));
    };

    var createActionLog = function (action) {
        var element = action.element,
            type = action.type,
            args = {},
            log = [];

        if (action.apiArguments) {
            for (var arg in action.apiArguments) {
                args[arg] = action.apiArguments[arg];
            }
        }

        log.push('type:' + type);

        if (element && element.id)
            log.push('el:' + element.id);

        if (checkSelector && action.serviceInfo.selectors && action.serviceInfo.selectors.length)
            log.push('elementSelector:' + action.serviceInfo.selectors[0].selector);

        if (args.options) {
            if (args.options.ctrl) log.push('ctrl:' + args.options.ctrl);
            if (args.options.alt) log.push('alt:' + args.options.alt);
            if (args.options.shift) log.push('shift:' + args.options.shift);
            if (args.options.meta) log.push('meta:' + args.options.meta);

            if (checkOffset) {
                if (args.options.offsetX) log.push('offsetX:' + args.options.offsetX);
                if (args.options.offsetY) log.push('offsetX:' + args.options.offsetY);
            }
        }
        if (typeof args.dragOffsetX !== 'undefined') {
            log.push('dragOffsetX:' + args.dragOffsetX);
            log.push('dragOffsetY:' + args.dragOffsetY);
        }
        if (args.startPos && args.endPos) {
            log.push('startPos:' + args.startPos);
            log.push('endPos:' + args.endPos);
        }
        if (args.keysCommand) log.push('command:' + args.keysCommand);
        if (args.text) log.push('text:' + args.text);
        return log.join(',') + ';';
    };

    var eventGenerators = {
        click: function (element, pageX, pageY) {
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT, pageX, pageY));
            EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT, pageX, pageY));
            EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT, pageX, pageY));
        },

        rclick: function (element) {
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.RIGHT));
            EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.RIGHT));
            if (Util.isMozilla)
                EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.RIGHT));
            EventParser.parseEvent(createMouseEventObject('contextmenu', element, Util.BUTTON.RIGHT));
        },

        dblclick: function (element) {
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('dblclick', element, Util.BUTTON.LEFT));
        },

        drag: function (element, x, y) {
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT, x, y));
            EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT, x, y));
            for (var i = 0; i < 10; i++) {
                EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT, x + 5 * i, y + 5 * i));
            }
            EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT, x + 50 * i, y + 50 * i));
            EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT, x + 50 * i, y + 50 * i));
        },

        dragByFinger: function (element, x, y) {
            EventParser.parseEvent(createTouchEventObject('touchstart', element, Util.BUTTON.LEFT, x, y));
            for (var i = 0; i < 10; i++) {
                EventParser.parseEvent(createTouchEventObject('touchmove', element, Util.BUTTON.LEFT, x + 5 * i, y + 5 * i));
            }
            EventParser.parseEvent(createTouchEventObject('touchend', element, Util.BUTTON.LEFT, x + 50 * i, y + 50 * i));
        },

        select: function (element, start, end) {
            var correctOptions = null;

            AutomationSelectUtil.getCorrectOptions(element, function (opt) {
                selectionStart = TextSelection.getPositionCoordinates(element, start, opt);
                if (end) {
                    selectionEnd = TextSelection.getPositionCoordinates(element, end, opt);
                    pointFrom = {x: selectionStart.left, y: start < end ? selectionStart.top : selectionStart.bottom};
                    pointTo = {x: selectionEnd.left, y: start < end ? selectionEnd.bottom : selectionEnd.top};
                }
                else {
                    pointFrom = {x: selectionStart.left, y: selectionStart.top};
                    pointTo = {
                        x: selectionStart.left + 2 * element.offsetWidth,
                        y: selectionStart.bottom + 2 * element.offsetHeight
                    };
                }

                if (Util.isIE && Util.browserVersion >= 10)
                    EventParser.parseEvent(createMouseEventObject('pointerover', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mouseover', element, Util.BUTTON.LEFT, pointFrom.x, pointFrom.y));
                if (Util.isIE && Util.browserVersion >= 10)
                    EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT, pointFrom.x, pointFrom.y));
                for (var i = 0; i < 10; i++) {
                    EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT));
                }
                TextSelection.select(element, start, end || (element.value ? element.value.length : $(element).text().length));
                EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT, pointTo.x, pointTo.y));
            });
        },

        selectWithoutMouseover: function (element, start, end) {
            var correctOptions = null;
            AutomationSelectUtil.getCorrectOptions(element, function (opt) {
                selectionStart = TextSelection.getPositionCoordinates(element, start, opt);

                selectionEnd = TextSelection.getPositionCoordinates(element, end, opt);
                pointFrom = {x: selectionStart.left, y: start < end ? selectionStart.top : selectionStart.bottom};
                pointTo = {x: selectionEnd.left, y: start < end ? selectionEnd.bottom : selectionEnd.top};

                if (Util.isIE && Util.browserVersion >= 10)
                    EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT, pointFrom.x, pointFrom.y));
                for (var i = 0; i < 10; i++) {
                    EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT));
                }
                TextSelection.select(element, start, end || element.value.length);
                EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT, pointTo.x, pointTo.y));
            });
        },

        dragWithoutClickEvent: function (element, x, y) {
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT, x, y));
            EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT, x, y));
            for (var i = 0; i < 10; i++) {
                EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT, x + 5 * i, y + 5 * i));
            }
            EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT, x + 50 * i, y + 50 * i));
        },

        dragWithMouseoutEvents: function (element, container, x, y) {
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT, 200, 200));
            EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT, 200, 200));
            for (var i = 0; i < 10; i++) {
                EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mouseout', container, Util.BUTTON.LEFT));
            }
            EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT, x + 200, y + 200));
            EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT));
        },

        pressKey: function (element, keycode, charcode) {
            EventParser.parseEvent(createKeyEventObject('keydown', element, keycode));
            if ($.browser.opera)
                EventParser.parseEvent(createKeyEventObject('keypress', element, charcode, undefined));
            else
                EventParser.parseEvent(createKeyEventObject('keypress', element, keycode, charcode));
            EventParser.parseEvent(createKeyEventObject('keyup', element, keycode));
        },

        pressCtrlAShortcut: function (element) {
            EventParser.parseEvent(createKeyEventObject('keydown', element, CTRL_KEY_CODE));
            EventParser.parseEvent(createKeyEventObject('keydown', element, A_KEY_CODE));
            if (Util.isMozilla)
                EventParser.parseEvent(createKeyEventObject('keypress', element, 0, 97));
            else if ($.browser.opera)
                EventParser.parseEvent(createKeyEventObject('keypress', element, 97, undefined));
            EventParser.parseEvent(createKeyEventObject('keyup', element, CTRL_KEY_CODE));
            EventParser.parseEvent(createKeyEventObject('keyup', element, A_KEY_CODE));
            if (Util.isMozilla)
                EventParser.parseEvent(createEventObject('change', element));
        },

        pressShiftCtrlAShortcut: function (element) {
            EventParser.parseEvent(createKeyEventObject('keydown', element, SHIFT_KEY_CODE));
            EventParser.parseEvent(createKeyEventObject('keydown', element, CTRL_KEY_CODE));
            EventParser.parseEvent(createKeyEventObject('keydown', element, A_KEY_CODE));
            if (Util.isMozilla || $.browser.opera) {
                if ($.browser.opera)
                    EventParser.parseEvent(createKeyEventObject('keypress', element, A_KEY_CODE, undefined));
                else
                    EventParser.parseEvent(createKeyEventObject('keypress', element, 0, A_KEY_CODE));
                EventParser.parseEvent(createKeyEventObject('keyup', element, A_KEY_CODE));
                EventParser.parseEvent(createKeyEventObject('keyup', element, SHIFT_KEY_CODE));
                EventParser.parseEvent(createKeyEventObject('keyup', element, CTRL_KEY_CODE));
            }
            else if (Util.isIE) {
                EventParser.parseEvent(createKeyEventObject('keypress', element, 1, 1));
                EventParser.parseEvent(createKeyEventObject('keyup', element, SHIFT_KEY_CODE));
                EventParser.parseEvent(createKeyEventObject('keyup', element, A_KEY_CODE));
                EventParser.parseEvent(createKeyEventObject('keyup', element, CTRL_KEY_CODE));
            }
            else {
                EventParser.parseEvent(createKeyEventObject('keypress', element, 1, 1));
                EventParser.parseEvent(createKeyEventObject('keyup', element, A_KEY_CODE));
                EventParser.parseEvent(createKeyEventObject('keyup', element, CTRL_KEY_CODE));
                EventParser.parseEvent(createKeyEventObject('keyup', element, SHIFT_KEY_CODE));
            }
        },

        pressEnter: function (element) {
            EventParser.parseEvent(createKeyEventObject('keydown', element, ENTER_KEY_CODE));

            if (Util.isMozilla)
                EventParser.parseEvent(createKeyEventObject('keypress', element, ENTER_KEY_CODE, 0));
            else if ($.browser.opera)
                EventParser.parseEvent(createKeyEventObject('keypress', element, ENTER_KEY_CODE, undefined));
            else
                EventParser.parseEvent(createKeyEventObject('keypress', element, ENTER_KEY_CODE, ENTER_KEY_CODE));

            EventParser.parseEvent(createKeyEventObject('keyup', element, ENTER_KEY_CODE));
        },

        pressKeyWhenShiftHolded: function (element, keyCode) {
            EventParser.parseEvent(createKeyEventObject('keydown', element, keyCode));
            if (Util.isMozilla || $.browser.opera)
                EventParser.parseEvent(createKeyEventObject('keypress', element, keyCode, Util.isMozilla ? 0 : undefined));
            EventParser.parseEvent(createKeyEventObject('keyup', element, keyCode));
        },

        holdDownLetter: function (element, holdingTime, keycode, charcode) {
            EventParser.parseEvent(createKeyEventObject('keydown', element, keycode));
            for (var i = 0; i < holdingTime; i++) {
                if ($.browser.opera)
                    EventParser.parseEvent(createKeyEventObject('keypress', element, charcode, undefined));
                else
                    EventParser.parseEvent(createKeyEventObject('keypress', element, keycode, charcode));
            }
            EventParser.parseEvent(createKeyEventObject('keyup', element, keycode));
        },

        holdDownKey: function (element, holdingTime, keyCode) {
            for (var i = 0; i < 3; i++) {
                EventParser.parseEvent(createKeyEventObject('keydown', element, keyCode));
                if (Util.isMozilla)
                    EventParser.parseEvent(createKeyEventObject('keypress', element, keyCode, 0));
            }
            EventParser.parseEvent(createKeyEventObject('keyup', element, keyCode));
        },

        pressWaitActionShortcut: function () {
            for (var i = 0; i < 3; i++) {
                EventParser.parseEvent(createKeyEventObject('keydown', documentElement, CTRL_KEY_CODE));
            }
            EventParser.parseEvent(createKeyEventObject('keydown', documentElement, WAIT_ACTION_SHORTCUT_KEY_CODE));
            EventParser.parseEvent(createKeyEventObject('keyup', documentElement, WAIT_ACTION_SHORTCUT_KEY_CODE));
            EventParser.parseEvent(createKeyEventObject('keyup', documentElement, CTRL_KEY_CODE));
        },

        hoverActionShortcut: function () {
            var intervalId = null;
            return {
                start: function () {
                    for (var i = 0; i < 3; i++) {
                        EventParser.parseEvent(createKeyEventObject('keydown', documentElement, CTRL_KEY_CODE));
                    }
                    intervalId = window.setInterval(function () {
                        EventParser.parseEvent(createKeyEventObject('keydown', documentElement, HOVER_ACTION_SHORTCUT_KEY_CODE));

                    }, 50);
                },
                end: function () {
                    window.clearInterval(intervalId);
                    EventParser.parseEvent(createKeyEventObject('keyup', documentElement, CTRL_KEY_CODE));
                }
            }
        },

        pressSpecialKey: function (element, keyCode) {
            EventParser.parseEvent(createKeyEventObject('keydown', element, keyCode));
            EventParser.parseEvent(createKeyEventObject('keyup', element, keyCode));
        },

        pointer: {
            click: function (element, pageX, pageY) {
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('pointermove', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT, pageX, pageY));
            },
            preventDefaultClick: function (element, pageX, pageY) {
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT, pageX, pageY));
            },
            rclick: function (element, pageX, pageY) {
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.RIGHT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.RIGHT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.RIGHT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.RIGHT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('contextmenu', element, Util.BUTTON.RIGHT, pageX, pageY));
            },
            preventDefaultRClick: function (element, pageX, pageY) {
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.RIGHT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.RIGHT, pageX, pageY));
                EventParser.parseEvent(createMouseEventObject('contextmenu', element, Util.BUTTON.RIGHT, pageX, pageY));
            },
            dblclick: function (element) {
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('dblclick', element, Util.BUTTON.LEFT));
            },
            preventDefaultDblclick: function (element) {
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('dblclick', element, Util.BUTTON.LEFT));
            },
            drag: function (element, x, y) {
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT, x, y));
                EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT, x, y));
                for (var i = 0; i < 10; i++) {
                    EventParser.parseEvent(createMouseEventObject('pointermove', element, Util.BUTTON.LEFT, x + 5 * i, y + 5 * i));
                    EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT, x + 5 * i, y + 5 * i));
                }
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT, x + 50 * i, y + 50 * i));
                EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT, x + 50 * i, y + 50 * i));
                EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT, x + 50 * i, y + 50 * i));
            },
            preventDefaultDrag: function (element, x, y) {
                EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT, x, y));
                for (var i = 0; i < 10; i++) {
                    EventParser.parseEvent(createMouseEventObject('pointermove', element, Util.BUTTON.LEFT, x + 5 * i, y + 5 * i));
                }
                EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT, x + 50 * i, y + 50 * i));
                EventParser.parseEvent(createMouseEventObject('click', element, Util.BUTTON.LEFT, x + 50 * i, y + 50 * i));
            },
            select: function (element, start, end) {
                AutomationSelectUtil.getCorrectOptions(element, function (opt) {
                    selectionStart = TextSelection.getPositionCoordinates(element, start, opt);
                    if (end) {
                        selectionEnd = TextSelection.getPositionCoordinates(element, end, opt);
                        pointFrom = {
                            x: selectionStart.left,
                            y: start < end ? selectionStart.top : selectionStart.bottom
                        };
                        pointTo = {x: selectionEnd.left, y: start < end ? selectionEnd.bottom : selectionEnd.top};
                    }
                    else {
                        pointFrom = {x: selectionStart.left, y: selectionStart.top};
                        pointTo = {
                            x: selectionStart.left + 2 * element.offsetWidth,
                            y: selectionStart.bottom + 2 * element.offsetHeight
                        };
                    }

                    EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT, pointFrom.x, pointFrom.y));
                    EventParser.parseEvent(createMouseEventObject('mousedown', element, Util.BUTTON.LEFT, pointFrom.x, pointFrom.y));
                    for (var i = 0; i < 10; i++) {
                        EventParser.parseEvent(createMouseEventObject('pointermove', element, Util.BUTTON.LEFT));
                        EventParser.parseEvent(createMouseEventObject('mousemove', element, Util.BUTTON.LEFT));
                    }
                    TextSelection.select(element, start, end || (element.value ? element.value.length : $(element).text().length));
                    EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT, pointTo.x, pointTo.y));
                    EventParser.parseEvent(createMouseEventObject('mouseup', element, Util.BUTTON.LEFT, pointTo.x, pointTo.y));
                });
            },
            preventDefaultSelect: function (element, start, end) {
                AutomationSelectUtil.getCorrectOptions(element, function (opt) {
                    selectionStart = TextSelection.getPositionCoordinates(element, start, opt);
                    if (end) {
                        selectionEnd = TextSelection.getPositionCoordinates(element, end, opt);
                        pointFrom = {
                            x: selectionStart.left,
                            y: start < end ? selectionStart.top : selectionStart.bottom
                        };
                        pointTo = {x: selectionEnd.left, y: start < end ? selectionEnd.bottom : selectionEnd.top};
                    }
                    else {
                        pointFrom = {x: selectionStart.left, y: selectionStart.top};
                        pointTo = {
                            x: selectionStart.left + 2 * element.offsetWidth,
                            y: selectionStart.bottom + 2 * element.offsetHeight
                        };
                    }

                    EventParser.parseEvent(createMouseEventObject('pointerdown', element, Util.BUTTON.LEFT, pointFrom.x, pointFrom.y));
                    for (var i = 0; i < 10; i++) {
                        EventParser.parseEvent(createMouseEventObject('pointermove', element, Util.BUTTON.LEFT));
                    }
                    TextSelection.select(element, start, end || (element.value ? element.value.length : $(element).text().length));
                    EventParser.parseEvent(createMouseEventObject('pointerup', element, Util.BUTTON.LEFT, pointTo.x, pointTo.y));
                });
            }
        },

        clickSelectAndOption: function (select, index) {
            if (Util.isSafari) {
                EventParser.parseEvent(createMouseEventObject('mousedown', select, Util.BUTTON.LEFT));

                EventParser.parseEvent(createMouseEventObject('change', select, Util.BUTTON.LEFT));
                select.selectedIndex = index;
                EventParser.parseEvent(createMouseEventObject('mouseup', select, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('click', select, Util.BUTTON.LEFT));
                return;
            }

            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerdown', select, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mousedown', select, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mouseup', select, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('click', select, Util.BUTTON.LEFT));

            var option = $(select).find('option')[index];

            if (!$.browser.webkit) {
                if (Util.isIE && Util.browserVersion >= 10)
                    EventParser.parseEvent(createMouseEventObject('pointerdown', Util.isIE ? select : option, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mousedown', Util.isIE ? select : option, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('mouseup', Util.isIE ? select : option, Util.BUTTON.LEFT));
            }

            select.selectedIndex = index;
            EventParser.parseEvent(createMouseEventObject('change', select, Util.BUTTON.LEFT));

            if (!$.browser.webkit)
                EventParser.parseEvent(createMouseEventObject('click', option, Util.BUTTON.LEFT));
            else {
                EventParser.parseEvent(createMouseEventObject('mouseup', select, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('click', select, Util.BUTTON.LEFT));
            }
        },

        clickSelectAndOptionGroup: function (select, group) {
            if (Util.isSafari) {
                EventParser.parseEvent(createMouseEventObject('mousedown', select, Util.BUTTON.LEFT));

                EventParser.parseEvent(createMouseEventObject('change', select, Util.BUTTON.LEFT));
                select.selectedIndex = index;
                EventParser.parseEvent(createMouseEventObject('mouseup', select, Util.BUTTON.LEFT));
                EventParser.parseEvent(createMouseEventObject('click', select, Util.BUTTON.LEFT));
                return;
            }

            EventParser.parseEvent(createMouseEventObject('mousedown', select, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mouseup', select, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('click', select, Util.BUTTON.LEFT));

            EventParser.parseEvent(createMouseEventObject('mousedown', group, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mouseup', group, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('click', group, Util.BUTTON.LEFT));
        }
    };

//setup

    QUnit.testStart = function () {
        input = createInput('text', 'input')[0];
        dragDiv = createDragDiv()[0];
        contentEditableDiv = createContentEditableDiv()[0];
        parserInitializer.init();
    };

    QUnit.testDone = function () {
        parserInitializer.destroy();
        logs.actual = '';
        logs.expected = '';
        checkSelector = false;
        checkOffset = false;
        waitActionCount = 0;
        hoverActionCount = 0;
        $('.' + TEST_ELEMENT_CLASS).remove();
    };

//tests
//mouse events
    test('click', function () {
        eventGenerators.click(input);
        addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);

    });

    test('rclick', function () {
        eventGenerators.rclick(input);
        addToLog(createMouseActionDescriptor('rclick', input), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('dblclick on input', function () {
        eventGenerators.dblclick(input);
        addToLog(createMouseActionDescriptor('dblclick', input), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('dblclick on document', function () {
        eventGenerators.dblclick(documentElement);
        addToLog(createMouseActionDescriptor('dblclick', documentElement), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('click and rclick', function () {
        eventGenerators.click(input);
        eventGenerators.rclick(input);
        addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('rclick', input), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    asyncTest('two clicks', function () {
        eventGenerators.click(input);
        window.setTimeout(function () {
            eventGenerators.click(input);
            addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
            start();
        }, 500)
    });

    test('drag', function () {
        eventGenerators.drag(dragDiv, 200, 200);
        addToLog(createMouseActionDescriptor('drag', dragDiv, 500, 500), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('drag without click event', function () {
        eventGenerators.dragWithoutClickEvent(dragDiv, 200, 200);
        addToLog(createMouseActionDescriptor('drag', dragDiv, 500, 500), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('select input', function () {
        input.value = '12345678909876';
        eventGenerators.select(input, 2, 13);
        addToLog(createSelectActionDescriptor(input, 2, 13), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('select input (start from input and end outside)', function () {
        input.value = '12345678909876';
        eventGenerators.select(input, 2);
        addToLog(createSelectActionDescriptor(input, 2, input.value.length), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('select textarea backward', function () {
        var textarea = createTextarea('123456789abcd\n\n\nefghi\njklmop\n\nqwerty test cafe');
        eventGenerators.select(textarea, textarea.value.length - 3, 2);
        addToLog(createSelectActionDescriptor(textarea, textarea.value.length - 3, 2), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('click option in select with attribute size more than one', function () {
        var select = createSelect(),
            option = $('option')[2];
        $(select).attr('size', 2);
        eventGenerators.click(option);
        addToLog(createMouseActionDescriptor('click', option), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    //keyboard events
    test('type letters in input', function () {
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        equal(logs.actual, logs.expected);
        eventGenerators.click(documentElement);
        addToLog(createTypeActionDescriptor('aa', input), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('click', documentElement), EXPECTED_LOG_FLAG);

        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('type letters with spaces', function () {
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        eventGenerators.pressKey(input, SPACE_KEY_CODE, SPACE_KEY_CODE);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        eventGenerators.pressKey(input, SPACE_KEY_CODE, SPACE_KEY_CODE);
        addToLog(createTypeActionDescriptor('a a ', input), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('type letter with shift key in input', function () {
        EventParser.parseEvent(createKeyEventObject('keydown', input, SHIFT_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keydown', input, A_KEY_CODE));

        var keyCode = null,
            charCode = null;

        if ($.browser.opera) {
            keyCode = A_KEY_CODE;
            charCode = undefined;
        }
        else if ($.browser.webkit || Util.isIE)
            keyCode = charCode = A_KEY_CODE;
        else {
            keyCode = 0;
            charCode = A_KEY_CODE;
        }
        EventParser.parseEvent(createKeyEventObject('keypress', input, keyCode, charCode));

        EventParser.parseEvent(createKeyEventObject('keyup', input, SHIFT_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keyup', input, A_KEY_CODE));

        equal(logs.actual, logs.expected);
        eventGenerators.click(documentElement);

        addToLog(createTypeActionDescriptor('A', input), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('click', documentElement), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('type text and press special key', function () {
        eventGenerators.pressKey(input, A_KEY_CODE, 97);
        eventGenerators.pressEnter(input);
        addToLog(createTypeActionDescriptor('a', input), EXPECTED_LOG_FLAG);
        addToLog(createPressActionDescriptor('enter'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press ctrl+a combination', function () {
        eventGenerators.pressCtrlAShortcut(input);
        addToLog(createPressActionDescriptor('ctrl+a'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press ctrl+shift+a combination', function () {
        eventGenerators.pressShiftCtrlAShortcut(input);
        addToLog(createPressActionDescriptor('shift+ctrl+a'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press special key', function () {
        eventGenerators.pressEnter(input);
        addToLog(createPressActionDescriptor('enter'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('several key presses with holded shift', function () {
        EventParser.parseEvent(createKeyEventObject('keydown', input, SHIFT_KEY_CODE));
        eventGenerators.pressKeyWhenShiftHolded(input, ENTER_KEY_CODE);
        eventGenerators.pressKeyWhenShiftHolded(input, ENTER_KEY_CODE);
        eventGenerators.pressKeyWhenShiftHolded(input, ENTER_KEY_CODE);
        EventParser.parseEvent(createKeyEventObject('keyup', input, SHIFT_KEY_CODE));

        addToLog(createPressActionDescriptor('shift+enter'), EXPECTED_LOG_FLAG);
        addToLog(createPressActionDescriptor('enter'), EXPECTED_LOG_FLAG);
        addToLog(createPressActionDescriptor('enter'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('hold down letter in input', function () {
        eventGenerators.holdDownLetter(input, 5, A_KEY_CODE, A_CHAR_CODE);
        addToLog(createTypeActionDescriptor('aaaaa', input), EXPECTED_LOG_FLAG);

        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('hold down letter, than hold down key combination with modifier', function () {
        eventGenerators.holdDownLetter(input, 5, A_KEY_CODE, A_CHAR_CODE);

        EventParser.parseEvent(createKeyEventObject('keydown', input, SHIFT_KEY_CODE));
        eventGenerators.holdDownKey(input, 3, LEFT_KEY_CODE);
        EventParser.parseEvent(createKeyEventObject('keyup', input, SHIFT_KEY_CODE));

        addToLog(createTypeActionDescriptor('aaaaa', input), EXPECTED_LOG_FLAG);
        addToLog(createPressActionDescriptor('shift+left shift+left shift+left'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press letter', function () {
        eventGenerators.pressKey(documentElement, A_KEY_CODE, A_CHAR_CODE);
        addToLog(createPressActionDescriptor('a'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press digit', function () {
        eventGenerators.pressKey(documentElement, KEY_1_KEY_CODE, KEY_1_KEY_CODE);
        addToLog(createPressActionDescriptor('1'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press tilde', function () {
        eventGenerators.pressKey(documentElement, TILDE_KEY_CODE, TILDE_CHAR_CODE);
        addToLog(createPressActionDescriptor('`'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press space', function () {
        eventGenerators.pressKey(documentElement, SPACE_KEY_CODE, SPACE_KEY_CODE);
        addToLog(createPressActionDescriptor('space'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press arrow left', function () {
        eventGenerators.pressKey(documentElement, LEFT_KEY_CODE, LEFT_KEY_CODE);
        addToLog(createPressActionDescriptor('left'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press insert', function () {
        eventGenerators.pressSpecialKey(documentElement, INSERT_KEY_CODE);
        addToLog(createPressActionDescriptor('ins'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('press equal, semi-colon, dash', function () {
        eventGenerators.pressKey(documentElement, EQUAL_KEY_CODE, EQUAL_CHAR_CODE);
        eventGenerators.pressKey(documentElement, SEMICOLON_KEY_CODE, SEMICOLON_CHAR_CODE);
        eventGenerators.pressKey(documentElement, DASH_KEY_CODE, DASH_CHAR_CODE);
        addToLog(createPressActionDescriptor('='), EXPECTED_LOG_FLAG);
        addToLog(createPressActionDescriptor(';'), EXPECTED_LOG_FLAG);
        addToLog(createPressActionDescriptor('-'), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    //shortcuts
    test('press wait action shortcut', function () {
        eventGenerators.pressWaitActionShortcut();
        equal(waitActionCount, 1);
    });

    test('mouseover', function () {
        EventParser.parseEvent(createMouseEventObject('mouseover', input));
        equal(logs.actual, logs.expected);
    });

    asyncTest('hover action shortcut', function () {
        var hoverActionShortcut = eventGenerators.hoverActionShortcut();
        hoverActionShortcut.start();
        window.setTimeout(function () {
            if (Util.isIE && Util.browserVersion >= 10)
                EventParser.parseEvent(createMouseEventObject('pointerover', input));
            EventParser.parseEvent(createMouseEventObject('mouseover', input));
            hoverActionShortcut.end();
            equal(hoverActionCount, 1);
            start();
        }, 200);
    });

    //deferred action tests
    asyncTest('check selector generation during typing', function () {
        checkSelector = true;
        var $input = createInput('text'),
            input = $input[0],
            clickInputDescriptor = createMouseActionDescriptor('click', input),
            typeInputDescriptor = createTypeActionDescriptor('a', input),
            clickDocDescriptor = createMouseActionDescriptor('click', documentElement);

        clickInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
        clickDocDescriptor.serviceInfo.selectors = documentElementSelectors;

        eventGenerators.click(input);
        typeInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
        $input.addClass('HOVERED').addClass('FOCUSED').addClass('CLICKED');

        EventParser.parseEvent(createKeyEventObject('keydown', input, A_KEY_CODE));
        $input.addClass('KEYDOWN');

        if ($.browser.opera)
            EventParser.parseEvent(createKeyEventObject('keypress', input, A_CHAR_CODE, undefined));
        else
            EventParser.parseEvent(createKeyEventObject('keypress', input, A_KEY_CODE, A_CHAR_CODE));
        EventParser.parseEvent(createKeyEventObject('keyup', input, A_KEY_CODE));

        window.setTimeout(function () {
            eventGenerators.click(documentElement);
            addToLog(typeInputDescriptor, EXPECTED_LOG_FLAG);
            addToLog(clickDocDescriptor, EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
            start();
        }, 500)
    });

    test('raise type and click on document twice', function () {
        eventGenerators.click(input);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        eventGenerators.click(documentElement);
        eventGenerators.click(input);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        eventGenerators.click(documentElement);
        addToLog(createTypeActionDescriptor('a', input), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('click', documentElement), EXPECTED_LOG_FLAG);
        addToLog(createTypeActionDescriptor('a', input), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('click', documentElement), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    asyncTest('type and click on the same element', function () {
        var $input = createInput('text'),
            input = $input[0],
            clickInputDescriptor = createMouseActionDescriptor('click', input),
            typeInputDescriptor = createTypeActionDescriptor('a', input),
            secondClickInputDescriptor = createMouseActionDescriptor('click', input);
        checkSelector = true;

        clickInputDescriptor.serviceInfo.selectors = typeInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
        eventGenerators.click(input);
        $input.addClass('HOVERED').addClass('FOCUSED').addClass('CLICKED');

        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);

        secondClickInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
        window.setTimeout(function () {
            eventGenerators.click(input);
            addToLog(typeInputDescriptor, EXPECTED_LOG_FLAG);
            addToLog(secondClickInputDescriptor, EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
            start();
        }, 500);
    });

    asyncTest('two click on input', function () {
        eventGenerators.click(input);
        window.setTimeout(function () {
            eventGenerators.click(input);
            addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
            start();
        }, 500);
    });

    asyncTest('two clicks and type in input', function () {
        eventGenerators.click(input);
        window.setTimeout(function () {
            eventGenerators.click(input);
            eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
            addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
            addToLog(createTypeActionDescriptor('a', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
            start();
        }, 500);
    });

    test('dblclick on input and type', function () {
        var $input = createInput('text'),
            input = $input[0],
            dblclickInputDescriptor = createMouseActionDescriptor('dblclick', input),
            typeInputDescriptor = createTypeActionDescriptor('a', input);
        checkSelector = true;
        dblclickInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
        eventGenerators.dblclick(input);
        $input.addClass('HOVERED').addClass('FOCUSED').addClass('CLICKED');
        typeInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);

        addToLog(dblclickInputDescriptor, EXPECTED_LOG_FLAG);
        addToLog(typeInputDescriptor, EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('type letter and drag', function () {
        var $input = createInput('text'),
            input = $input[0],
            clickInputDescriptor = createMouseActionDescriptor('click', input),
            typeInputDescriptor = createTypeActionDescriptor('a', input),
            dragInputDescriptor = createMouseActionDescriptor('select', input, 200, 200);
        checkSelector = true;
        clickInputDescriptor.serviceInfo.selectors = typeInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
        eventGenerators.click(input);
        $input.addClass('HOVERED').addClass('FOCUSED').addClass('CLICKED');
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        $input.addClass('KEYDOWN');
        eventGenerators.drag(input, 200, 200);
        dragInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
        addToLog(typeInputDescriptor, EXPECTED_LOG_FLAG);
        addToLog(dragInputDescriptor, EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('type in two inputs', function () {
        var input2 = createInput('text', 'input2')[0];
        eventGenerators.click(input);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        eventGenerators.click(input2);
        eventGenerators.pressKey(input2, A_KEY_CODE, A_CHAR_CODE);
        addToLog(createTypeActionDescriptor('a', input), EXPECTED_LOG_FLAG);
        addToLog(createTypeActionDescriptor('a', input2), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    asyncTest('click on element that changes class on hover', function () {
        var $input = createInput('text').addClass('notHovered'),
            input = $input[0],
            clickInputDescriptor = createMouseActionDescriptor('click', input);

        checkSelector = true;

        clickInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEventObject('pointerover', input));
        EventParser.parseEvent(createMouseEventObject('mouseover', input));
        $input.removeClass('notHovered').addClass('hovered');
        eventGenerators.click(input);
        window.setTimeout(function () {
            parserInitializer.destroy();
            addToLog(clickInputDescriptor, EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
            start();
        }, 500);
    });

    asyncTest('click on element that load page on mousedown', function () {
        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEventObject('pointerdown', dragDiv));
        EventParser.parseEvent(createMouseEventObject('mousedown', dragDiv));
        parserInitializer.destroy();
        addToLog(createMouseActionDescriptor('click', dragDiv), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
        start();
    });

    asyncTest('click on element that load page on mouseup', function () {
        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEventObject('pointerdown', dragDiv));
        EventParser.parseEvent(createMouseEventObject('mousedown', dragDiv));
        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEventObject('pointerup', dragDiv));
        EventParser.parseEvent(createMouseEventObject('mouseup', dragDiv));
        parserInitializer.destroy();
        addToLog(createMouseActionDescriptor('click', dragDiv), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
        start();
    });

    module('contentEditable tests');

    asyncTest('type and click on the same contentEditable element', function () {
        var $editableDiv = $(contentEditableDiv),
            clickEditableDivDescriptor = createMouseActionDescriptor('click', contentEditableDiv),
            typeEditableDivDescriptor = createTypeActionDescriptor('a', contentEditableDiv),
            secondClickEditableDivDescriptor = createMouseActionDescriptor('click', contentEditableDiv);
        checkSelector = true;

        clickEditableDivDescriptor.serviceInfo.selectors = typeEditableDivDescriptor.serviceInfo.selectors = SelectorGenerator.generate($editableDiv);
        eventGenerators.click(contentEditableDiv);
        $editableDiv.addClass('HOVERED').addClass('FOCUSED').addClass('CLICKED');

        eventGenerators.pressKey(contentEditableDiv, A_KEY_CODE, A_CHAR_CODE);

        secondClickEditableDivDescriptor.serviceInfo.selectors = SelectorGenerator.generate($editableDiv);
        window.setTimeout(function () {
            eventGenerators.click(contentEditableDiv);
            addToLog(typeEditableDivDescriptor, EXPECTED_LOG_FLAG);
            addToLog(secondClickEditableDivDescriptor, EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
            start();
        }, 500);
    });

    asyncTest('two click on contentEditable element', function () {
        eventGenerators.click(contentEditableDiv);
        window.setTimeout(function () {
            eventGenerators.click(contentEditableDiv);
            addToLog(createMouseActionDescriptor('click', contentEditableDiv), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('click', contentEditableDiv), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
            start();
        }, 500);
    });

    asyncTest('two clicks and type in contentEditable element', function () {
        eventGenerators.click(contentEditableDiv);
        window.setTimeout(function () {
            eventGenerators.click(contentEditableDiv);
            eventGenerators.pressKey(contentEditableDiv, A_KEY_CODE, A_CHAR_CODE);
            addToLog(createMouseActionDescriptor('click', contentEditableDiv), EXPECTED_LOG_FLAG);
            addToLog(createTypeActionDescriptor('a', contentEditableDiv), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
            start();
        }, 500);
    });

    test('dblclick on contentEditable element and type', function () {
        var dblclickEditableDivDescriptor = createMouseActionDescriptor('dblclick', contentEditableDiv),
            typeEditableDivDescriptor = createTypeActionDescriptor('a', contentEditableDiv);
        checkSelector = true;
        dblclickEditableDivDescriptor.serviceInfo.selectors = SelectorGenerator.generate($(contentEditableDiv));
        eventGenerators.dblclick(contentEditableDiv);
        $(contentEditableDiv).addClass('HOVERED').addClass('FOCUSED').addClass('CLICKED');
        typeEditableDivDescriptor.serviceInfo.selectors = SelectorGenerator.generate($(contentEditableDiv));
        eventGenerators.pressKey(contentEditableDiv, A_KEY_CODE, A_CHAR_CODE);

        addToLog(dblclickEditableDivDescriptor, EXPECTED_LOG_FLAG);
        addToLog(typeEditableDivDescriptor, EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('select contentEditable element', function () {
        eventGenerators.select(contentEditableDiv, 2, 13);
        addToLog(createSelectActionDescriptor(contentEditableDiv, 2, 13), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('select contentEditable element (start from element and end outside)', function () {
        eventGenerators.select(contentEditableDiv, 2);
        addToLog(createSelectActionDescriptor(contentEditableDiv, 2, $(contentEditableDiv).text().length), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    if (!Util.isIE) {
        //NOTE: For IE we can't create inverse selection
        test('select contentEditable element backward', function () {
            eventGenerators.select(contentEditableDiv, $(contentEditableDiv).text().length - 3, 2);
            addToLog(createSelectActionDescriptor(contentEditableDiv, $(contentEditableDiv).text().length - 3, 2), EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
        });
    }

    module('regression tests');

    test('B234599 - TD2 - Wrong detection of drag action offset  in IE10', function () {
        checkOffset = true;
        var fraction = {
                left: 5.5,
                top: 3.42189721
            },
            divOffset = Util.getOffsetPosition(dragDiv),
            pageX = divOffset.left + fraction.left,
            pageY = divOffset.top + fraction.top,
            mouseDownOffset = {
                x: Math.round(fraction.left),
                y: Math.round(fraction.top)
            };
        eventGenerators.drag(dragDiv, pageX, pageY);
        addToLog(createMouseActionDescriptor('drag', dragDiv, 500, 500, mouseDownOffset.x, mouseDownOffset.y), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);

    });

    test('B234634 - Dragging is not recorded on ASPxDocking "Widgets" demo', function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
        var divSize = 500,
            div = $('<div></div>')
                .css({
                    width: divSize + 'px',
                    height: divSize + 'px',
                    position: 'absolute',
                    backgroundColor: 'red',
                    left: '50px',
                    top: '50px',
                    zIndex: 5
                })
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo('body')[0];

        var span = $('<span></span>')
            .addClass(TEST_ELEMENT_CLASS)
            .css({
                position: 'absolute'
            })
            .appendTo(div)[0];

        $(span).text('Date & Time');

        var divOffset = Util.getOffsetPosition(div),
            destX = divOffset.left + divSize + 200,
            destY = divOffset.top + divSize + 200;

        eventGenerators.dragWithMouseoutEvents(span, div, destX, destY);
        addToLog(createMouseActionDescriptor('drag', span, destX, destY), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    test('B238612 - Recorder - select action records like a drag action', function () {
        input.value = '12345678909876';
        eventGenerators.select(input, 2, 13);
        addToLog(createSelectActionDescriptor(input, 2, 13), EXPECTED_LOG_FLAG);
        eventGenerators.selectWithoutMouseover(input, 0, 10);
        addToLog(createSelectActionDescriptor(input, 0, 10), EXPECTED_LOG_FLAG);
        equal(logs.actual, logs.expected);
    });

    if (!Util.isIE || Util.browserVersion === 9) {
        test('B253119 - [DevExtreme] record drag action by touch (on touch monitor) do not works at desktop google chrome 31', function () {
            eventGenerators.dragByFinger(dragDiv, 200, 200);
            addToLog(createMouseActionDescriptor('drag', dragDiv, 500, 500), EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
        });
    }

    test('B239376 - The click action will not be recorded if the mousedown/mouseup events come to different elements', function () {
        var $input = createInput('text', 'B239376_Input'),
            input = $input[0];

        $input.mousedown(function () {
            $(this).remove();
        });

        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEventObject('pointerdown', input, Util.BUTTON.LEFT));
        EventParser.parseEvent(createMouseEventObject('mousedown', input, Util.BUTTON.LEFT));
        EventParser.parseEvent(createMouseEventObject('mousemove', document, Util.BUTTON.LEFT));
        EventParser.parseEvent(createMouseEventObject('mousemove', document, Util.BUTTON.LEFT));
        EventParser.parseEvent(createMouseEventObject('mouseup', document, Util.BUTTON.LEFT));

        addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);

        equal(logs.actual, logs.expected);
    });

    test('B254340 - click on input with type = "number"', function () {
        var input = createInput('number', '123456')[0];

        eventGenerators.click(input);
        addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);

    });

    test('B254340 - type in input with type = "email"', function () {
        var input = createInput('email', 'support@devexpress.com')[0];

        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);
        equal(logs.actual, logs.expected);

        eventGenerators.click(documentElement);
        addToLog(createTypeActionDescriptor('aa', input), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('click', documentElement), EXPECTED_LOG_FLAG);

        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

//T101195 - Recording crashed after action with input type = "number" recorded in FF 29
    if (!(Util.isMozilla && Util.browserVersion >= 29)) {
        test('B254340 - select input with type = "number"', function () {
            var input = createInput('number', '12345678909876')[0];

            eventGenerators.select(input, 2, 13);
            addToLog(createSelectActionDescriptor(input, 2, 13), EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
        });
    }

    test('B254740 - Unexpected Press action is saved when a click + some modifier (ctrl, shift, alt) action is recorded', function () {
        EventParser.parseEvent(createKeyEventObject('keydown', input, CTRL_KEY_CODE));

        if (Util.isIE && Util.browserVersion >= 10)
            EventParser.parseEvent(createMouseEventObject('pointerdown', input, Util.BUTTON.LEFT));
        EventParser.parseEvent(createMouseEventObject('mousedown', input, Util.BUTTON.LEFT, 0, 0, true));
        EventParser.parseEvent(createMouseEventObject('mouseup', input, Util.BUTTON.LEFT, 0, 0, true));
        EventParser.parseEvent(createMouseEventObject('click', input, Util.BUTTON.LEFT, 0, 0, true));

        EventParser.parseEvent(createKeyEventObject('keydown', input, CTRL_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keyup', input, CTRL_KEY_CODE));

        parserInitializer.destroy();
        addToLog(createMouseActionDescriptor('click', input, 0, 0, 0, 0, true), EXPECTED_LOG_FLAG);

        equal(logs.actual, logs.expected);
    });

    if (Util.isIE && Util.browserVersion >= 10) {
        test('T116673 - Some mouse actions are not recorded in IE (click)', function () {
            eventGenerators.pointer.click(input);
            addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (click with preventDefault pointerdown)', function () {
            eventGenerators.pointer.preventDefaultClick(input);
            addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (rclick)', function () {
            eventGenerators.pointer.rclick(input);
            addToLog(createMouseActionDescriptor('rclick', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (rclick with preventDefault pointerdown)', function () {
            eventGenerators.pointer.preventDefaultRClick(input);
            addToLog(createMouseActionDescriptor('rclick', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (dblclick input)', function () {
            eventGenerators.pointer.dblclick(input);
            addToLog(createMouseActionDescriptor('dblclick', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (dblclick input with preventDefault pointerdown)', function () {
            eventGenerators.pointer.preventDefaultDblclick(input);
            addToLog(createMouseActionDescriptor('dblclick', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (click+rclick)', function () {
            eventGenerators.pointer.click(input);
            eventGenerators.pointer.rclick(input);
            addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('rclick', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (click+rclick with preventDefault pointerdown)', function () {
            eventGenerators.pointer.preventDefaultClick(input);
            eventGenerators.pointer.preventDefaultRClick(input);
            addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('rclick', input), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });

        asyncTest('T116673 - Some mouse actions are not recorded in IE (two clicks)', function () {
            eventGenerators.pointer.click(input);
            window.setTimeout(function () {
                eventGenerators.pointer.click(input);
                addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
                addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
                parserInitializer.destroy();
                equal(logs.actual, logs.expected);
                start();
            }, 500);
        });

        asyncTest('T116673 - Some mouse actions are not recorded in IE (two clicks with preventDefault pointerdown)', function () {
            eventGenerators.pointer.preventDefaultClick(input);
            window.setTimeout(function () {
                eventGenerators.pointer.preventDefaultClick(input);
                addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
                addToLog(createMouseActionDescriptor('click', input), EXPECTED_LOG_FLAG);
                parserInitializer.destroy();
                equal(logs.actual, logs.expected);
                start();
            }, 500);
        });

        test('T116673 - Some mouse actions are not recorded in IE (drag)', function () {
            eventGenerators.pointer.drag(dragDiv, 200, 200);
            addToLog(createMouseActionDescriptor('drag', dragDiv, 500, 500), EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (drag with preventDefault pointerdown)', function () {
            eventGenerators.pointer.preventDefaultDrag(dragDiv, 200, 200);
            addToLog(createMouseActionDescriptor('drag', dragDiv, 500, 500), EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (select in input)', function () {
            input.value = '12345678909876';
            eventGenerators.pointer.select(input, 2, 13);
            addToLog(createSelectActionDescriptor(input, 2, 13), EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (select in input with preventDefault pointerdown)', function () {
            input.value = '12345678909876';
            eventGenerators.pointer.preventDefaultSelect(input, 2, 13);
            addToLog(createSelectActionDescriptor(input, 2, 13), EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (select + rclick)', function () {
            input.value = '12345678909876';
            eventGenerators.pointer.select(input, 2, 13);
            eventGenerators.pointer.rclick(input);
            addToLog(createSelectActionDescriptor(input, 2, 13), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('rclick', input), EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
        });

        test('T116673 - Some mouse actions are not recorded in IE (select + rclick with preventDefault pointerdown)', function () {
            input.value = '12345678909876';
            eventGenerators.pointer.preventDefaultSelect(input, 2, 13);
            eventGenerators.pointer.preventDefaultRClick(input);
            addToLog(createSelectActionDescriptor(input, 2, 13), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('rclick', input), EXPECTED_LOG_FLAG);
            equal(logs.actual, logs.expected);
        });

        asyncTest('T116673 - Some mouse actions are not recorded in IE (type+click)', function () {
            var $input = createInput('text'),
                input = $input[0],
                clickInputDescriptor = createMouseActionDescriptor('click', input),
                typeInputDescriptor = createTypeActionDescriptor('a', input),
                secondClickInputDescriptor = createMouseActionDescriptor('click', input);

            checkSelector = true;
            clickInputDescriptor.serviceInfo.selectors = typeInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
            eventGenerators.pointer.click(input);
            $input.addClass('HOVERED').addClass('FOCUSED').addClass('CLICKED');

            eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);

            secondClickInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
            window.setTimeout(function () {
                eventGenerators.pointer.click(input);
                addToLog(typeInputDescriptor, EXPECTED_LOG_FLAG);
                addToLog(secondClickInputDescriptor, EXPECTED_LOG_FLAG);
                parserInitializer.destroy();
                equal(logs.actual, logs.expected);
                start();
            }, 500);
        });

        asyncTest('T116673 - Some mouse actions are not recorded in IE (type+click with preventDefault pointerdown)', function () {
            var $input = createInput('text'),
                input = $input[0],
                clickInputDescriptor = createMouseActionDescriptor('click', input),
                typeInputDescriptor = createTypeActionDescriptor('a', input),
                secondClickInputDescriptor = createMouseActionDescriptor('click', input);

            checkSelector = true;
            clickInputDescriptor.serviceInfo.selectors = typeInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
            eventGenerators.pointer.preventDefaultClick(input);
            $input.addClass('HOVERED').addClass('FOCUSED').addClass('CLICKED');

            eventGenerators.pressKey(input, A_KEY_CODE, A_CHAR_CODE);

            secondClickInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
            window.setTimeout(function () {
                eventGenerators.pointer.preventDefaultClick(input);
                addToLog(typeInputDescriptor, EXPECTED_LOG_FLAG);
                addToLog(secondClickInputDescriptor, EXPECTED_LOG_FLAG);
                parserInitializer.destroy();
                equal(logs.actual, logs.expected);
                start();
            }, 500);
        });

        asyncTest('T116673 - Some mouse actions are not recorded in IE (click on element that changes class on hover)', function () {
            var $input = createInput('text').addClass('notHovered'),
                input = $input[0],
                clickInputDescriptor = createMouseActionDescriptor('click', input);

            checkSelector = true;
            clickInputDescriptor.serviceInfo.selectors = SelectorGenerator.generate($input);
            EventParser.parseEvent(createMouseEventObject('pointerover', input));
            $input.removeClass('notHovered').addClass('pointer_hovered');
            EventParser.parseEvent(createMouseEventObject('mouseover', input));
            $input.addClass('mouse_hovered');
            eventGenerators.pointer.click(input);
            window.setTimeout(function () {
                parserInitializer.destroy();
                addToLog(clickInputDescriptor, EXPECTED_LOG_FLAG);
                equal(logs.actual, logs.expected);
                start();
            }, 500);
        });
    }

    test('click select and option', function () {
        var select = $(createSelect()).attr('id', 'select')[0],
            option = $('option').eq(2).attr('id', 'option')[0];

        eventGenerators.clickSelectAndOption(select, 2);

        addToLog(createMouseActionDescriptor('click', select), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('click', option), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    module('select with option groups');

    test('click select and option', function () {
        var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
            option = $('option').eq(4).attr('id', 'option')[0];

        eventGenerators.clickSelectAndOption(select, 4);

        addToLog(createMouseActionDescriptor('click', select), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('click', option), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

//NOTE: click on optgroup can be written only in Mozilla
    if (Util.isMozilla) {
        test('click select and optgroup', function () {
            var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
                group = $('optgroup').eq(1).attr('id', 'group')[0];

            eventGenerators.clickSelectAndOptionGroup(select, group);

            addToLog(createMouseActionDescriptor('click', select), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('click', group), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });
    }

    test('click select and option in subgroup', function () {
        var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
            $optgroup = $(select).find('optgroup').eq(1),
            $newOptgroup = $('<optgroup label="subgroup"></optgroup>').attr('id', 'subGroup')
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo($optgroup[0]),
            $newOption = $('<option></option>').text('sub option').attr('id', 'subGroupOpt')
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo($newOptgroup[0]);

        eventGenerators.clickSelectAndOption(select, 6);

        addToLog(createMouseActionDescriptor('click', select), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('click', $newOption[0]), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

//NOTE: click on optgroup can be written only in Mozilla
    if (Util.isMozilla) {
        test('click select and subgroup', function () {
            var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
                $optgroup = $(select).find('optgroup').eq(1).attr('id', 'oldGroup'),
                $newOptgroup = $('<optgroup label="subgroup"></optgroup>').attr('id', 'subGroup')
                    .addClass(TEST_ELEMENT_CLASS)
                    .appendTo($optgroup[0]),
                $newOption = $('<option></option>').text('sub option').attr('id', 'subGroupOpt')
                    .addClass(TEST_ELEMENT_CLASS)
                    .appendTo($newOptgroup[0]);

            eventGenerators.clickSelectAndOptionGroup(select, $newOptgroup[0]);

            addToLog(createMouseActionDescriptor('click', select), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('click', $newOptgroup[0]), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });
    }

    test('click select and option out of group', function () {
        var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
            $optgroup = $(select).find('optgroup').eq(2),
            $newOption = $('<option></option>').text('outer option')
                .addClass(TEST_ELEMENT_CLASS)
                .attr('id', 'outerOpt')
                .insertAfter($optgroup);

        eventGenerators.clickSelectAndOption(select, 9);

        addToLog(createMouseActionDescriptor('click', select), EXPECTED_LOG_FLAG);
        addToLog(createMouseActionDescriptor('click', $newOption[0]), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    module('select with option groups and size more than one');

    test('click option', function () {
        var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
            option = $('option').eq(2).attr('id', 'option')[0];

        $(select).attr('size', 2);
        eventGenerators.click(option);
        addToLog(createMouseActionDescriptor('click', option), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('click optgroup', function () {
        var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
            group = $('optgroup').eq(1).attr('id', 'group')[0];

        $(select).attr('size', 8);
        eventGenerators.click(group);
        addToLog(createMouseActionDescriptor('click', group), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('click option in subgroup', function () {
        var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
            $optgroup = $(select).find('optgroup').eq(1).attr('id', 'oldSubGroup'),
            $newOptgroup = $('<optgroup label="subgroup"></optgroup>').attr('id', 'subGroup')
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo($optgroup[0]),
            $newOption = $('<option></option>').text('sub option').attr('id', 'subGroupOpt')
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo($newOptgroup[0]);

        $(select).attr('size', 2);
        eventGenerators.click($newOption[0]);
        addToLog(createMouseActionDescriptor('click', $newOption[0]), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('click subgroup', function () {
        var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
            $optgroup = $(select).find('optgroup').eq(1).attr('id', 'oldGroup'),
            $newOptgroup = $('<optgroup label="subgroup"></optgroup>').attr('id', 'subGroup')
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo($optgroup[0]),
            $newOption = $('<option></option>').text('sub option').attr('id', 'subGroupOpt')
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo($newOptgroup[0]);

        $(select).attr('size', 2);
        eventGenerators.click($newOptgroup[0]);
        addToLog(createMouseActionDescriptor('click', $newOptgroup[0]), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('click option out of group', function () {
        var select = $(createSelectWithGroups()).attr('id', 'selectOpt')[0],
            $optgroup = $(select).find('optgroup').eq(2),
            $newOption = $('<option></option>').text('outer option')
                .addClass(TEST_ELEMENT_CLASS)
                .attr('id', 'outerOpt')
                .insertAfter($optgroup);

        $(select).attr('size', 2);
        eventGenerators.click($newOption[0]);
        addToLog(createMouseActionDescriptor('click', $newOption[0]), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('destroy event parser before "keyup" event was raised', function () {
        EventParser.parseEvent(createKeyEventObject('keydown', input, ENTER_KEY_CODE));

        if (Util.isMozilla)
            EventParser.parseEvent(createKeyEventObject('keypress', input, ENTER_KEY_CODE, 0));
        else if ($.browser.opera)
            EventParser.parseEvent(createKeyEventObject('keypress', input, ENTER_KEY_CODE, undefined));
        else
            EventParser.parseEvent(createKeyEventObject('keypress', input, ENTER_KEY_CODE, ENTER_KEY_CODE));

        equal(logs.actual, logs.expected);
        addToLog(createPressActionDescriptor('enter'), EXPECTED_LOG_FLAG);

        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('destroy event parser before "keypress, keyup" events were raised', function () {
        EventParser.parseEvent(createKeyEventObject('keydown', input, ALT_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keydown', input, SHIFT_KEY_CODE));

        equal(logs.actual, logs.expected);
        addToLog(createPressActionDescriptor('alt+shift'), EXPECTED_LOG_FLAG);

        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('T182340 - Press "Tab" and "Shift+Tab" recording problem', function () {
        EventParser.parseEvent(createKeyEventObject('keydown', input, SHIFT_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keydown', input, TAB_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keyup', input, SHIFT_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keyup', input, TAB_KEY_CODE));

        addToLog(createPressActionDescriptor('shift+tab'), EXPECTED_LOG_FLAG);

        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('T230273 - TD15.1 - Enter key press is not captured', function () {
        var textarea = $('<textarea></textarea>').addClass(TEST_ELEMENT_CLASS).appendTo('body')[0];

        $(textarea).focus();
        //simulate prevented pressing enter
        EventParser.parseEvent(createKeyEventObject('keydown', textarea, ENTER_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keyup', textarea, ENTER_KEY_CODE));

        addToLog(createPressActionDescriptor('enter'), EXPECTED_LOG_FLAG);

        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });

    test('T243116 - TD15.1 - Enter pressing isn\'t recorded on jsfiddle', function () {
        var textarea = $('<textarea></textarea>').addClass(TEST_ELEMENT_CLASS).appendTo('body')[0];

        $(textarea).focus();
        //turn on typing mode
        EventParser.parseEvent(createKeyEventObject('keydown', textarea, A_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keypress', textarea, A_KEY_CODE, A_CHAR_CODE));
        EventParser.parseEvent(createKeyEventObject('keyup', textarea, A_KEY_CODE));

        //simulate prevented pressing enter
        EventParser.parseEvent(createKeyEventObject('keydown', textarea, ENTER_KEY_CODE));
        EventParser.parseEvent(createKeyEventObject('keyup', textarea, ENTER_KEY_CODE));

        addToLog(createTypeActionDescriptor('a', textarea), EXPECTED_LOG_FLAG);
        addToLog(createPressActionDescriptor('enter'), EXPECTED_LOG_FLAG);

        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
    });


    if (Util.isSafari) {
        test('T173548 - TD_14_2 Safari 8 - Wrong recording click on select and option', function () {
            var select = $(createSelect()).attr('id', 'select')[0],
                option = $('option').eq(2).attr('id', 'option')[0];

            //eventGenerators.clickSelectAndOption(select, 2);

            EventParser.parseEvent(createMouseEventObject('mousedown', select, Util.BUTTON.LEFT));
            select.selectedIndex = 2;
            EventParser.parseEvent(createMouseEventObject('change', select, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('mouseup', select, Util.BUTTON.LEFT));
            EventParser.parseEvent(createMouseEventObject('click', select, Util.BUTTON.LEFT));

            addToLog(createMouseActionDescriptor('click', select), EXPECTED_LOG_FLAG);
            addToLog(createMouseActionDescriptor('click', option), EXPECTED_LOG_FLAG);
            parserInitializer.destroy();
            equal(logs.actual, logs.expected);
        });
    }

    test('T230234 - TD15.1 - TestCafe hangs while recording after drag-n-dropping block of text on jsfiddle.net on IE11', function () {
        //NOTE: this is a performance bug. If the bug is not fixed, browser hangs or the timeout exceed.
        // Count of the events in this test are from real situation on jsfiddle.net in IE11
        var textarea = $('<textarea></textarea>').addClass(TEST_ELEMENT_CLASS).appendTo('body')[0],
            i = 0,
            timeStart = Date.now();

        for (; i < 55; i++)
            EventParser.parseEvent(createMouseEventObject('pointermove', textarea));

        EventParser.parseEvent(createMouseEventObject('pointerdown', textarea));
        EventParser.parseEvent(createMouseEventObject('mousedown', textarea));

        for (i = 0; i < 32; i++) {
            EventParser.parseEvent(createMouseEventObject('pointermove', textarea));
            EventParser.parseEvent(createMouseEventObject('mousemove', textarea));
        }

        EventParser.parseEvent(createMouseEventObject('pointerdown', textarea));
        EventParser.parseEvent(createMouseEventObject('mousedown', textarea));

        for (i = 0; i < 27; i++) {
            EventParser.parseEvent(createMouseEventObject('pointermove', textarea));
            EventParser.parseEvent(createMouseEventObject('mousemove', textarea));
        }

        EventParser.parseEvent(createMouseEventObject('pointerup', textarea));

        addToLog(createMouseActionDescriptor('select', textarea), EXPECTED_LOG_FLAG);
        parserInitializer.destroy();
        equal(logs.actual, logs.expected);
        ok(Date.now() - timeStart < 1000);
    });
});