var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    TextSelection = Hammerhead.TextSelection,
    Automation = TestCafeClient.get('Automation'),
    Util = Hammerhead.Util;

Hammerhead.init();
Automation.init();

$(document).ready(function () {
    //consts
    var TEST_ELEMENT_CLASS = 'testElement';

    //var
    var $el = null,
        press = TestCafeClient.get('Automation.Press.KeyPressSimulator').press,
        focusedElements = [];

    //utils
    var createTextInput = function (text, startSelection, endSelection, inverse) {
        var start = startSelection || text.length,
            end = endSelection || start;
        $el = $('<input type="text">').attr('id', 'input').addClass(TEST_ELEMENT_CLASS).appendTo('body').attr('value', text);
        $el[0].focus();
        nativeSelect($el[0], start, end, inverse);
        return $el[0];
    };

    var createTextarea = function (text, startSelection, endSelection, inverse, parent) {
        var start = startSelection || text.length,
            end = endSelection || start;
        $el = $('<textarea>').attr('id', 'textarea').addClass(TEST_ELEMENT_CLASS).appendTo((parent || 'body')).css('height', 200).attr('value', text);
        $el[0].focus();
        nativeSelect($el[0], start, end, inverse);
        return $el[0];
    };

    var nativeSelect = function (el, from, to, inverse) {
        var start = from || 0,
            end = to;

        //NOTE: set to start position
        var startPosition = inverse ? end : start;
        if (el.setSelectionRange) {
            el.setSelectionRange(startPosition, startPosition);
        }
        else {
            el.selectionStart = startPosition;
            el.selectionEnd = startPosition;
        }

        //NOTE: select
        if (el.setSelectionRange) {
            el.setSelectionRange(start, end, inverse ? 'backward' : 'forward');
        }
        else {
            el.selectionStart = start;
            el.selectionEnd = end;
        }
    };

    var checkShortcut = function (element, value, selectionStart, selectionEnd, inverse) {
        var selectionEnd = selectionEnd || selectionStart,
            activeElement = Util.findDocument(element).activeElement,
            inverseSelection = TextSelection.hasInverseSelection(activeElement);

        equal(activeElement, element, 'active element are correct');
        equal(activeElement.value, value, 'active element value are correct');
        equal(TextSelection.getSelectionStart(activeElement), selectionStart, 'active element selection start are correct');
        equal(TextSelection.getSelectionEnd(activeElement), selectionEnd, 'active element selection end are correct');

        ok(inverseSelection === (typeof inverse === 'undefined' ? false : inverse));
    };

    QUnit.testDone = function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
        $el = null;
    };

    //tests

    module('utils testing');
    test('getShortcutsByKeyCombination', function () {
        deepEqual(Util.getShortcutsByKeyCombination({ a: {}}, 'a'), ['a'], 'simple shortcut');
        deepEqual(Util.getShortcutsByKeyCombination({ 'ctrl+a': {}}, 'ctrl+a'), ['ctrl+a'], 'combined shortcut');
        deepEqual(Util.getShortcutsByKeyCombination({ 'a': {}}, 'b+a'), ['a'], 'symbol and simple shortcut');
        deepEqual(Util.getShortcutsByKeyCombination({ 'a': {}}, 'a+b'), ['a'], 'simple shortcut and symbol');
        deepEqual(Util.getShortcutsByKeyCombination({ 'ctrl+a': {}}, 'b+ctrl+a'), ['ctrl+a'], 'symbol and combined shortcut');
        deepEqual(Util.getShortcutsByKeyCombination({ 'ctrl+a': {}}, 'ctrl+a+b'), ['ctrl+a'], 'combined shortcut and symbol');
        deepEqual(Util.getShortcutsByKeyCombination({ 'ctrl+a': {}, a: {}}, 'a+ctrl+a'), ['a', 'ctrl+a'], 'simple shortcut and combined shortcut');
        deepEqual(Util.getShortcutsByKeyCombination({ 'ctrl+a': {}, a: {}}, 'ctrl+a+a'), ['ctrl+a', 'a'], 'combined shortcut and simple shortcut');
        deepEqual(Util.getShortcutsByKeyCombination({ 'ctrl+a': {}, a: {}}, 'ctrl+a+b+a'), ['ctrl+a', 'a'], 'combined shortcut, symbol and simple shortcut');
    });

    module('enter');

    asyncTest('press enter in input', function () {
        var text = 'text',
            cursorPosition = 2,
            input = createTextInput(text, cursorPosition);

        var callback = function () {
            checkShortcut(input, text, cursorPosition);
            start();
        };
        press('enter', callback);
    });

    asyncTest('press enter in textarea', function () {
        var text = 'text',
            cursorPosition = 2,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = 'te\nxt';
            checkShortcut(textarea, newText, newText.indexOf('\n') + 1);
            start();
        };
        press('enter', callback);
    });

    module('home');

    asyncTest('press home in input', function () {
        var text = 'text',
            input = createTextInput(text, 2);

        var callback = function () {
            checkShortcut(input, text, 0);
            start();
        };
        press('home', callback);
    });

    asyncTest('press home in textarea', function () {
        var text = 'text\rarea',
            textarea = createTextarea(text, 7);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, newText.indexOf('\n') + 1);
            start();
        };
        press('home', callback);
    });

    asyncTest('press home with selection', function () {
        var text = 'text',
            input = createTextInput(text, 2, text.length);

        var callback = function () {
            checkShortcut(input, text, 0);
            start();
        };
        press('home', callback);
    });

    module('end');

    asyncTest('press end in input', function () {
        var text = 'text',
            input = createTextInput(text, 2);

        var callback = function () {
            checkShortcut(input, text, text.length);
            start();
        };
        press('end', callback);
    });

    asyncTest('press end in textarea', function () {
        var text = 'text\rarea',
            textarea = createTextarea(text, 7);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, newText.length);
            start();
        };
        press('end', callback);
    });

    asyncTest('press end with selection', function () {
        var text = 'text',
            input = createTextInput(text, 2, text.length);

        var callback = function () {
            checkShortcut(input, text, text.length);
            start();
        };
        press('end', callback);
    });

    module('up');

    asyncTest('press up in input', function () {
        var text = 'text',
            cursorPosition = 2,
            input = createTextInput(text, cursorPosition);

        var callback = function () {
            if (!$.browser.webkit)
                checkShortcut(input, text, cursorPosition);
            else
                checkShortcut(input, text, 0);
            start();
        };
        press('up', callback);
    });

    asyncTest('press up in textarea', function () {
        var text = 'text\rarea',
            textarea = createTextarea(text, 7);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, 2);
            start();
        };
        press('up', callback);
    });

    module('down');

    asyncTest('press down in input', function () {
        var text = 'text',
            cursorPosition = 2,
            input = createTextInput(text, cursorPosition);

        var callback = function () {
            if (!$.browser.webkit)
                checkShortcut(input, text, cursorPosition);
            else
                checkShortcut(input, text, text.length);
            start();
        };
        press('down', callback);
    });

    asyncTest('press down in textarea', function () {
        var text = 'text\rarea',
            cursorPosition = 2,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, newText.indexOf('\n') + cursorPosition + 1);
            start();
        };
        press('down', callback);
    });

    module('left');

    asyncTest('press left in input', function () {
        var text = 'text',
            cursorPosition = 2,
            input = createTextInput(text, cursorPosition);

        var callback = function () {
            checkShortcut(input, text, cursorPosition - 1);
            start();
        };
        press('left', callback);
    });

    asyncTest('press left in textarea', function () {
        var text = 'text\rarea',
            textarea = createTextarea(text, 7),
            oldSelectionStart = TextSelection.getSelectionStart(textarea);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, oldSelectionStart - 1);
            start();
        };
        press('left', callback);
    });

    module('right');

    asyncTest('press right in input', function () {
        var text = 'text',
            cursorPosition = 2,
            input = createTextInput(text, cursorPosition);

        var callback = function () {
            checkShortcut(input, text, cursorPosition + 1);
            start();
        };
        press('right', callback);
    });

    asyncTest('press right in textarea', function () {
        var text = 'text\rarea',
            textarea = createTextarea(text, 7),
            oldSelectionStart = TextSelection.getSelectionStart(textarea);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, oldSelectionStart + 1);
            start();
        };
        press('right', callback);
    });

    module('backspace');

    asyncTest('press backspace in input', function () {
        var text = 'text',
            cursorPosition = 2,
            input = createTextInput(text, cursorPosition);

        var callback = function () {
            var newText = text.substring(0, cursorPosition - 1) + text.substring(cursorPosition);
            checkShortcut(input, newText, cursorPosition - 1);
            start();
        };
        press('backspace', callback);
    });

    asyncTest('press backspace in textarea', function () {
        var text = 'text\rarea',
            cursorPosition = 5,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = text.replace('\r', '');
            checkShortcut(textarea, newText, cursorPosition - 1);
            start();
        };
        press('backspace', callback);
    });

    module('delete');

    asyncTest('press delete in input', function () {
        var text = 'text',
            cursorPosition = 2,
            input = createTextInput(text, cursorPosition);

        var callback = function () {
            var newText = text.substring(0, cursorPosition) + text.substring(cursorPosition + 1);
            checkShortcut(input, newText, cursorPosition);
            start();
        };
        press('delete', callback);
    });

    asyncTest('press delete in textarea', function () {
        var text = 'text\rarea',
            cursorPosition = 4,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = text.replace('\r', '');
            checkShortcut(textarea, newText, cursorPosition);
            start();
        };
        press('delete', callback);
    });

    module('ctrl+a');

    asyncTest('press ctrl+a in input', function () {
        var text = 'test',
            input = createTextInput(text, 2);

        var callback = function () {
            checkShortcut(input, text, 0, text.length);
            start();
        };
        press('ctrl+a', callback);
    });

    asyncTest('press ctrl+a in textarea', function () {
        var text = 'test\rarea',
            textarea = createTextarea(text, 2);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, 0, newText.length);
            start();
        };
        press('ctrl+a', callback);
    });

    asyncTest('B233976: Wrong recording key combination Ctrl+A and DELETE', function () {
        var text = 'test\rarea',
            textarea = createTextarea(text, 2);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, 0, newText.length);

            var deleteCallback = function () {
                checkShortcut(textarea, '', 0, 0);
                start();
            };
            press('delete', deleteCallback);
        };
        press('ctrl+a', callback);
    });

    asyncTest('press ctrl+a and backspace press in textarea', function () {
        var text = 'test\rarea',
            textarea = createTextarea(text, 2);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, 0, newText.length);

            var deleteCallback = function () {
                checkShortcut(textarea, '', 0, 0);
                start();
            };
            press('backspace', deleteCallback);
        };
        press('ctrl+a', callback);
    });

    module('test shortcut inside keys combination');

    asyncTest('press left+a in input', function () {
        var text = '1',
            input = createTextInput(text, text.length);

        var callback = function () {
            checkShortcut(input, 'a1', 1);
            start();
        };
        press('left+a', callback);
    });

    asyncTest('press a+left in input', function () {
        var text = '1',
            input = createTextInput(text, text.length);

        var callback = function () {
            checkShortcut(input, '1a', 1);
            start();
        };
        press('a+left', callback);
    });

    module('test keys combination of two shortcuts');

    asyncTest('press left+home in textarea', function () {
        var text = 'test\rarea',
            textarea = createTextarea(text, 7);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, newText.indexOf('\n') + 1);
            start();
        };
        press('left+home', callback);
    });

    asyncTest('press home+left in textarea', function () {
        var text = 'test\rarea',
            textarea = createTextarea(text, 7);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, 4);
            start();
        };
        press('home+left', callback);
    });

    module('shift+left');

    asyncTest('press shift+left in textarea without selection', function () {
        var text = 'text\rarea',
            cursorPosition = 6,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, cursorPosition - 4, cursorPosition, true);
            start();
        };
        press('shift+left', function () {
            press('shift+left', function () {
                press('shift+left', function () {
                    press('shift+left', callback);
                });
            });
        });
    });

    asyncTest('press shift+left in textarea with forward selection', function () {
        var text = 'text\rare\rtest',
            startSelection = 7,
            endSelection = 10,
            textarea = createTextarea(text, startSelection, endSelection);

        var callback = function () {
            var newText = text.replace(/\r/g, '\n');
            checkShortcut(textarea, newText, 6, 7, true);
            start();
        };
        press('shift+left', function () {
            press('shift+left', function () {
                press('shift+left', function () {
                    press('shift+left', callback);
                });
            });
        });
    });

    asyncTest('press shift+left in textarea with backward selection', function () {
        var text = 'text\rare\rtest',
            startSelection = 7,
            endSelection = 10,
            textarea = createTextarea(text, startSelection, endSelection, true);

        var callback = function () {
            var newText = text.replace(/\r/g, '\n');
            checkShortcut(textarea, newText, startSelection - 4, endSelection, true);
            start();
        };

        press('shift+left', function () {
            press('shift+left', function () {
                press('shift+left', function () {
                    press('shift+left', callback);
                });
            });
        });
    });

    module('shift+right');

    asyncTest('press shift+right in textarea without selection', function () {
        var text = 'text\rarea',
            cursorPosition = 3,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, cursorPosition, cursorPosition + 4);
            start();
        };
        press('shift+right', function () {
            press('shift+right', function () {
                press('shift+right', function () {
                    press('shift+right', callback);
                });
            });
        });
    });

    asyncTest('press shift+right in textarea with forward selection', function () {
        var text = 'text\rarea\rtest',
            startSelection = 3,
            endSelection = 7,
            textarea = createTextarea(text, startSelection, endSelection);

        var callback = function () {
            var newText = text.replace(/\r/g, '\n');
            checkShortcut(textarea, newText, startSelection, 11);
            start();
        };
        press('shift+right', function () {
            press('shift+right', function () {
                press('shift+right', function () {
                    press('shift+right', callback);
                });
            });
        });
    });

    asyncTest('press shift+right in textarea with backward selection', function () {
        var text = 'text\rare\rtest',
            startSelection = 2,
            endSelection = 12,
            textarea = createTextarea(text, startSelection, endSelection, true);

        var callback = function () {
            var newText = text.replace(/\r/g, '\n');
            checkShortcut(textarea, newText, startSelection + 4, endSelection, true);
            start();
        };
        press('shift+right', function () {
            press('shift+right', function () {
                press('shift+right', function () {
                    press('shift+right', callback);
                });
            });
        });
    });

    module('shift+up');

    asyncTest('press shift+up in input', function () {
        var text = 'text',
            cursorPosition = 2,
            input = createTextInput(text, cursorPosition);

        var callback = function () {
            if (!$.browser.webkit)
                checkShortcut(input, text, cursorPosition);
            else
                checkShortcut(input, text, 0, cursorPosition, true);
            start();
        };
        press('shift+up', callback);
    });

    asyncTest('press shift+up in textarea without selection', function () {
        var text = 'text\rarea',
            cursorPosition = 7,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, cursorPosition - 5, cursorPosition, true);
            start();
        };

        press('shift+up', callback);
    });

    asyncTest('press shift+up in textarea with forward selection', function () {
        var text = 'aaaa\rbbbb\rcccc',
            startSelection = 8,
            endSelection = 12,
            textarea = createTextarea(text, startSelection, endSelection);

        var callback = function () {
            var newText = text.replace(/\r/g, '\n');
            checkShortcut(textarea, newText, startSelection - 1, startSelection, true);
            start();
        };

        press('shift+up', callback);
    });

    asyncTest('press shift+right in textarea with backward selection', function () {
        var text = 'aaaa\rbbbb\rcccc',
            startSelection = 8,
            endSelection = 12,
            textarea = createTextarea(text, startSelection, endSelection, true);

        var callback = function () {
            var newText = text.replace(/\r/g, '\n');

            checkShortcut(textarea, newText, startSelection - 5, endSelection, true);
            start();
        };
        press('shift+up', callback);
    });

    module('shift+down');

    asyncTest('press shift+down in input', function () {
        var text = 'text',
            cursorPosition = 2,
            input = createTextInput(text, cursorPosition);

        var callback = function () {
            if (!$.browser.webkit)
                checkShortcut(input, text, cursorPosition);
            else
                checkShortcut(input, text, cursorPosition, text.length);
            start();
        };
        press('shift+down', callback);
    });

    asyncTest('press shift+down in textarea without selection', function () {
        var text = 'text\rarea',
            cursorPosition = 2,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, cursorPosition, cursorPosition + 5);
            start();
        };

        press('shift+down', callback);
    });

    asyncTest('press shift+down in textarea with forward selection', function () {
        var text = 'aaaa\rbbbb\rcccc',
            startSelection = 3,
            endSelection = 8,
            textarea = createTextarea(text, startSelection, endSelection);

        var callback = function () {
            var newText = text.replace(/\r/g, '\n');
            checkShortcut(textarea, newText, startSelection, endSelection + 5);
            start();
        };

        press('shift+down', callback);
    });

    asyncTest('press shift+down in textarea with backward selection', function () {
        var text = 'aaaa\rbbbb\rcccc',
            startSelection = 8,
            endSelection = 12,
            textarea = createTextarea(text, startSelection, endSelection, true);

        var callback = function () {
            var newText = text.replace(/\r/g, '\n');

            checkShortcut(textarea, newText, endSelection, startSelection + 5);
            start();
        };
        press('shift+down', callback);
    });

    module('shift+home');

    asyncTest('press shift+home in input', function () {
        var text = 'text',
            input = createTextInput(text, 2);

        var callback = function () {
            checkShortcut(input, text, 0, 2, true);
            start();
        };
        press('shift+home', callback);
    });

    asyncTest('press shift+home in textarea without selection', function () {
        var text = 'text\rarea',
            cursorPosition = 7,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, newText.indexOf('\n') + 1, cursorPosition, true);
            start();
        };
        press('shift+home', callback);
    });

    asyncTest('press shift+home in textarea with forward selection', function () {
        var text = 'text\rarea',
            startPosition = 7,
            endPosition = 8,
            textarea = createTextarea(text, startPosition, endPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, newText.indexOf('\n') + 1, startPosition, true);
            start();
        };
        press('shift+home', callback);
    });

    asyncTest('press shift+home in textarea with backward selection', function () {
        var text = 'text\rarea',
            startPosition = 7,
            endPosition = 8,
            textarea = createTextarea(text, startPosition, endPosition, true);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, newText.indexOf('\n') + 1, endPosition, true);
            start();
        };
        press('shift+home', callback);
    });

    module('shift+end');

    asyncTest('press shift+end in input', function () {
        var text = 'text',
            input = createTextInput(text, 2);

        var callback = function () {
            checkShortcut(input, text, 2, 4);
            start();
        };
        press('shift+end', callback);
    });

    asyncTest('press shift+end in textarea without selection', function () {
        var text = 'text\rarea',
            cursorPosition = 7,
            textarea = createTextarea(text, cursorPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, cursorPosition, text.length);
            start();
        };
        press('shift+end', callback);
    });

    asyncTest('press shift+end in textarea with forward selection', function () {
        var text = 'text\rarea',
            startPosition = 7,
            endPosition = 8,
            textarea = createTextarea(text, startPosition, endPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, startPosition, text.length);
            start();
        };
        press('shift+end', callback);
    });

    asyncTest('press shift+end in textarea with backward selection', function () {
        var text = 'text\rarea',
            startPosition = 7,
            endPosition = 8,
            textarea = createTextarea(text, startPosition, endPosition, true);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, endPosition, text.length);
            start();
        };
        press('shift+end', callback);
    });

    module('Resression tests. B238614 ');

    asyncTest('Incorrectly selection reproduce (left)', function () {
        var text = 'input',
            startPosition = 2,
            endPosition = 4,
            input = createTextInput(text, startPosition, endPosition);

        var callback = function () {
            checkShortcut(input, text, startPosition, startPosition);
            start();
        };

        press('left', callback);
    });

    asyncTest('Incorrectly selection reproduce (right)', function () {
        var text = 'input',
            startPosition = 2,
            endPosition = 4,
            input = createTextInput(text, startPosition, endPosition);

        var callback = function () {
            checkShortcut(input, text, endPosition, endPosition);
            start();
        };

        press('right', callback);
    });

    module('Resression tests.');

    //B238809 - Wrong playback test with shift+home/shift+end shortcuts in multiline textarea.
    asyncTest('B238809. Press shift+home in textarea with forward multiline selection', function () {
        var text = 'text\rarea',
            startPosition = 2,
            endPosition = 7,
            textarea = createTextarea(text, startPosition, endPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, startPosition, newText.indexOf('\n') + 1, false);
            start();
        };
        press('shift+home', callback);
    });

    asyncTest('B238809. Press shift+home in textarea with backward multiline selection', function () {
        var text = 'text\rarea',
            startPosition = 2,
            endPosition = 7,
            textarea = createTextarea(text, startPosition, endPosition, true);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, 0, endPosition, true);
            start();
        };
        press('shift+home', callback);
    });

    asyncTest('B238809. Press shift+end in textarea with forward multiline selection', function () {
        var text = 'text\rarea',
            startPosition = 2,
            endPosition = 8,
            textarea = createTextarea(text, startPosition, endPosition);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, startPosition, newText.length, false);
            start();
        };
        press('shift+end', callback);
    });

    asyncTest('B238809. Press shift+end in textarea with backward multiline selection', function () {
        var text = 'text\rarea',
            startPosition = 2,
            endPosition = 8,
            textarea = createTextarea(text, startPosition, endPosition, true);

        var callback = function () {
            var newText = text.replace('\r', '\n');
            checkShortcut(textarea, newText, newText.indexOf('\n'), endPosition, true);
            start();
        };
        press('shift+end', callback);
    });
});
