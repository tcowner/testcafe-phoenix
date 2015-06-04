var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util,
    EventSandbox = Hammerhead.EventSandbox,
    KeyEventParser = TestCafeClient.get('Recorder.KeyEventParser'),
    ShadowUI = Hammerhead.ShadowUI,
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    CodeEditorWidget = TestCafeClient.get('UI.RecorderWidgets.CodeEditor');

Hammerhead.init();
ActionBarrier.init();

var codeEditor = null,
    $editorArea = null,
    options = {};
var currentKeyEventParser = null;

//Test parser mock
KeyEventParser.prototype.init = function (options) {
    currentKeyEventParser = this;
    var parser = this;
    if (!options)
        return;
    if (options.symbolPressed)
        parser.symbolPressedCallback = options.symbolPressed;
    if (options.keysPressed)
        parser.keysPressedCallback = options.keysPressed;
    if (options.shortcutHandlers) {
        $.each(options.shortcutHandlers, function (keys, handlers) {
            if (handlers instanceof Function)
                parser.shortcutHandlers[keys] = { start: handlers, multiple: true }
            else {
                parser.shortcutHandlers[keys] = {
                    start: handlers.start,
                    end: handlers.end,
                    multiple: handlers.multiple === undefined
                        ? true
                        : handlers.multiple
                }

            }
        });
    }
};

KeyEventParser.prototype._symbolPressed = function (symbol) {
    this.symbolPressedCallback(symbol.charCodeAt(0));
};

$(document).ready(function () {
    var hasEditLayoutOffset = $.browser.opera;
    var codeEditorInitializer = function () {
        return {
            init: function (options) {
                addEditorArea();
                codeEditor = new CodeEditorWidget($editorArea, options);
            },
            destroy: function () {
                codeEditor.$editor.remove();
                $editorArea.remove();
            }
        }
    }();

    var addEditorArea = function () {
        $editorArea = $('<div class="editorArea"></div>').appendTo(ShadowUI.getRoot());
    };
    //setup

    QUnit.testDone = function () {
        codeEditorInitializer.destroy();
    };

    /*TEST CODE EDITOR UI*/
    test('testUIWithFixedHeight', function () {
        options = {
            width: 800,
            height: 230,
            text: 'The quick brown fox jumps over a lazy dog\r\none,two.tree',
            fixedHeight: true
        };
        codeEditorInitializer.init(options);
        equal(codeEditor.$scrollLayout[0].offsetWidth, 800);
        equal(codeEditor.$scrollLayout[0].offsetHeight, 230);
        equal(codeEditor._getEditorText(), options.text);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        equal(codeEditor.$scrollLayout.css('overflow-y'), 'hidden');
        deepEqual(cursorOffset, getNullOffset());
    });

    test('testUIWithNotFixedHeight', function () {
        options = {
            width: 600,
            height: 400,
            text: 'The quick brown fox jumps over a lazy dog\r\none,two.tree',
            fixedHeight: false
        };
        codeEditorInitializer.init(options);
        equal(codeEditor.$scrollLayout[0].offsetWidth, 600);
        ok(codeEditor.$scrollLayout[0].offsetHeight >= 400);
        equal(codeEditor._getEditorText(), options.text);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        deepEqual(cursorOffset, getNullOffset());
    });

    test('testUIWithoutText', function () {
        options = {
            width: 600,
            height: 400,
            fixedHeight: false
        };
        codeEditorInitializer.init(options);
        equal(codeEditor.$scrollLayout[0].offsetWidth, 600);
        ok(codeEditor.$scrollLayout[0].offsetHeight >= 400);
        equal(codeEditor._getEditorText(), '');
        equal(codeEditor.$lines.length, 1);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        deepEqual(cursorOffset, getNullOffset());
    });

    test('testUIWithVerticalScrollBar', function () {
        options = {
            width: 800,
            height: 18,
            text: 'The\r\nquick\r\nbrown',
            fixedHeight: true
        };
        codeEditorInitializer.init(options);
        equal(codeEditor.$scrollLayout[0].offsetWidth, 800);
        equal(codeEditor.$scrollLayout[0].offsetHeight, 18);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        equal(codeEditor.$scrollLayout.css('overflow-y'), 'scroll');
        deepEqual(cursorOffset, getNullOffset());
    });

    test('testUIWithHorizontalScrollBar', function () {
        options = {
            width: 50,
            height: 100,
            text: 'The quick brown fox jumps over a lazy dog\r\nThe quick brown fox jumps over a lazy dog',
            fixedHeight: true
        };
        codeEditorInitializer.init(options);
        equal(codeEditor.$scrollLayout[0].offsetWidth, 50);
        equal(codeEditor.$scrollLayout[0].offsetHeight, 100);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        equal(codeEditor.$scrollLayout.css('overflow-x'), 'scroll');
        deepEqual(cursorOffset, getNullOffset());
    });

    asyncTest('testUIWithFloatingWidthAndExpandDirectionRight', function () {
        options = {
            width: 200,
            height: 230,
            floatingWidth: true,
            text: '    The quick brown fox jumps over a lazy dog The quick brown fox jumps over a lazy dog',
            fixedHeight: true,
            expandDirection: 'right'
        };
        codeEditorInitializer.init(options);
        var cursorOffset = getElementOffset(codeEditor.$cursor),
            codeEditorWidth = codeEditor.$scrollLayout.width(),
            codeEditorOffset = getElementOffset(codeEditor.$scrollLayout);
        window.setTimeout(function () {
            codeEditor.$textarea[0].click();
            EventSandbox.focus(codeEditor.$textarea[0], function () {
                equal(document.activeElement, codeEditor.$textarea[0]);
                ok(codeEditor.$scrollLayout.width() > codeEditorWidth);
                deepEqual(getElementOffset(codeEditor.$scrollLayout), codeEditorOffset);
                start();
            });
        }, 0);
    });

    asyncTest('testUIWithFloatingWidthAndExpandDirectionLeft', function () {
        options = {
            width: 200,
            height: 230,
            floatingWidth: true,
            text: '    The quick brown fox jumps over a lazy dog The quick brown fox jumps over a lazy dog',
            fixedHeight: true,
            expandDirection: 'left'
        };
        codeEditorInitializer.init(options);
        var cursorOffset = getElementOffset(codeEditor.$cursor),
            codeEditorWidth = codeEditor.$scrollLayout.width(),
            codeEditorOffset = getElementOffset(codeEditor.$scrollLayout);
        window.setTimeout(function () {
            EventSandbox.focus(codeEditor.$textarea[0], function () {
                equal(document.activeElement, codeEditor.$textarea[0]);
                ok(codeEditor.$scrollLayout.width() >= codeEditorWidth);
                var newCodeEditorOffset = getElementOffset(codeEditor.$scrollLayout);
                ok(newCodeEditorOffset.left < 0);
                ok(newCodeEditorOffset.left < codeEditorOffset.left);
                equal(codeEditorOffset.top, codeEditorOffset.top);
                start();
            });
        }, 0);
    });

    /*TEST LETTER PRESS*/
    test('pressLetter', function () {
        codeEditorInitializer.init();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser._symbolPressed('a');
        equal(codeEditor._getEditorText(), 'a');
        ok(getElementOffset(codeEditor.$cursor).left > cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
    });

    test('pressLetterWithSelection', function () {
        codeEditorInitializer.init({
            text: 'abc'
        });
        currentKeyEventParser.shortcutHandlers['shift+right'].start();
        currentKeyEventParser.shortcutHandlers['shift+right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser._symbolPressed('1');
        equal(codeEditor._getEditorText(), '1c');
        ok(getElementOffset(codeEditor.$cursor).left < cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top)
    });

    test('pressBracket"{"', function () {
        codeEditorInitializer.init();
        currentKeyEventParser._symbolPressed('{');
        equal(codeEditor._getEditorText(), '{}');
    });

    test('notPressBracket"{"InsideText', function () {
        codeEditorInitializer.init({
            text: 'abc'
        });
        currentKeyEventParser._symbolPressed('(');
        equal(codeEditor._getEditorText(), '(abc');
    });

    test('pressBracket"}"Inside"{}"', function () {
        codeEditorInitializer.init({
            text: '{}'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        currentKeyEventParser._symbolPressed('}');
        equal(codeEditor._getEditorText(), '{}');
    });

    test('pressQuote', function () {
        codeEditorInitializer.init();
        currentKeyEventParser._symbolPressed('"');
        equal(codeEditor._getEditorText(), '""');
    });

    test('pressQuoteInsidePairQuotes', function () {
        codeEditorInitializer.init({
            text: '""'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        currentKeyEventParser._symbolPressed('"');
        equal(codeEditor._getEditorText(), '""');
    });

    /*TEST SHORTCUTS*/
    test('pressShortcut"Right"', function () {
        codeEditorInitializer.init({
            text: 'a'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['right'].start();
        ok(getElementOffset(codeEditor.$cursor).left > cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
    });

    test('pressShortcut"Right"WithSelection', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456\r\nqw'
        });
        codeEditor._setCursor(1, 4);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        currentKeyEventParser.shortcutHandlers['right'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        ok(!codeEditor.$selectionStart.width());
        ok(!codeEditor.$selectionEnd.width());
    });

    test('pressShortcut"Left"', function () {
        codeEditorInitializer.init({
            text: 'a'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['right'].start();
        ok(getElementOffset(codeEditor.$cursor).left > cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
        currentKeyEventParser.shortcutHandlers['left'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
    });

    test('pressShortcut"Left"WithSelection', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456\r\nqw'
        });
        codeEditor._setCursor(0, 4);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['left'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        ok(!codeEditor.$selectionStart.width());
        ok(!codeEditor.$selectionEnd.width());
    });

    test('pressShortcut"Down"', function () {
        codeEditorInitializer.init({
            text: 'a\r\nb'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['down'].start();
        equal(getElementOffset(codeEditor.$cursor).left, cursorOffset.left);
        ok(getElementOffset(codeEditor.$cursor).top > cursorOffset.top);
    });

    test('pressShortcut"Up"', function () {
        codeEditorInitializer.init({
            text: 'a\r\nb'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['down'].start();
        equal(getElementOffset(codeEditor.$cursor).left, cursorOffset.left);
        ok(getElementOffset(codeEditor.$cursor).top > cursorOffset.top);
        currentKeyEventParser.shortcutHandlers['up'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
    });

    test('pressShortcut"Enter"', function () {
        codeEditorInitializer.init({
            text: 'a'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['enter'].start();
        equal(getElementOffset(codeEditor.$cursor).left, cursorOffset.left);
        ok(getElementOffset(codeEditor.$cursor).top > cursorOffset.top);
        equal(codeEditor.$lines.length, 2);
        equal(codeEditor._getLineText(0), '');
    });

    test('pressShortcut"Enter"InsideBrackets', function () {
        codeEditorInitializer.init({
            text: '{}'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['enter'].start();
        ok(getElementOffset(codeEditor.$cursor).top > cursorOffset.top);
        ok(getElementOffset(codeEditor.$cursor).top < getElementOffset(codeEditor.$lines[2]).top);
        equal(codeEditor.$lines.length, 3);
        equal(codeEditor._getLineText(0), '{');
        equal(codeEditor._getLineText(1), '    ');
        equal(codeEditor._getLineText(2), '}');
    });

    test('pressShortcut"Enter"AfterOpeningBracket', function () {
        codeEditorInitializer.init({
            text: '{a'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['enter'].start();
        ok(getElementOffset(codeEditor.$cursor).top > cursorOffset.top);
        equal(codeEditor.$lines.length, 2);
        equal(codeEditor._getLineText(0), '{');
        equal(codeEditor._getLineText(1), 'a');
    });

    test('pressShortcut"Enter"WithSelection', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456'
        });
        codeEditor._setCursor(0, 3);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['enter'].start();
        equal(codeEditor._getEditorText(), 'abc\r\n456');
        equal(codeEditor.$lines.length, 2);
        ok(getElementOffset(codeEditor.$cursor).left < cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
    });

    test('pressShortcut"Backspace"', function () {
        codeEditorInitializer.init({
            text: 'a'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        currentKeyEventParser.shortcutHandlers['backspace'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        equal(codeEditor._getEditorText(), '');
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
    });

    test('pressShortcut"Backspace"BeforeLineFirstSymbol', function () {
        codeEditorInitializer.init({
            text: 'a\r\nb'
        });
        currentKeyEventParser.shortcutHandlers['down'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['backspace'].start();
        equal(codeEditor._getEditorText(), 'ab');
        equal(codeEditor.$lines.length, 1);
        ok(getElementOffset(codeEditor.$cursor).left > cursorOffset.left);
        ok(getElementOffset(codeEditor.$cursor).top < cursorOffset.top);
    });

    test('pressShortcut"Backspace"InsideBrackets', function () {
        codeEditorInitializer.init({
            text: '{}'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['backspace'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
        equal(codeEditor._getEditorText(), '');
    });

    test('pressShortcut"Backspace"InsideQuotes', function () {
        codeEditorInitializer.init({
            text: '""'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['backspace'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
        equal(codeEditor._getEditorText(), '');
    });

    test('pressShortcut"Backspace"WithSelection', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456'
        });
        codeEditor._setCursor(0, 3);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['backspace'].start();
        equal(codeEditor._getEditorText(), 'abc456');
        equal(codeEditor.$lines.length, 1);
        equal(getElementOffset(codeEditor.$cursor).left, cursorOffset.left);
        ok(getElementOffset(codeEditor.$cursor).top < cursorOffset.top);
    });

    test('pressShortcut"Delete"', function () {
        codeEditorInitializer.init({
            text: 'a'
        });
        currentKeyEventParser.shortcutHandlers['delete'].start();
        equal(codeEditor._getEditorText(), '');
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
    });

    test('pressShortcut"Delete"AfterLineLastSymbol', function () {
        codeEditorInitializer.init({
            text: 'a\r\nb'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['delete'].start();
        equal(codeEditor._getEditorText(), 'ab');
        equal(codeEditor.$lines.length, 1);
        equal(getElementOffset(codeEditor.$cursor).left, cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
    });

    test('pressShortcut"Delete"WithSelection', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456'
        });
        codeEditor._setCursor(0, 3);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['delete'].start();
        equal(codeEditor._getEditorText(), 'abc456');
        equal(codeEditor.$lines.length, 1);
        equal(getElementOffset(codeEditor.$cursor).left, cursorOffset.left);
        ok(getElementOffset(codeEditor.$cursor).top < cursorOffset.top);
    });

    test('pressShortcut"Home"', function () {
        codeEditorInitializer.init({
            text: 'abcdef'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        codeEditor._setCursor(0, 5);
        ok(getElementOffset(codeEditor.$cursor).left > cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
        currentKeyEventParser.shortcutHandlers['home'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
    });

    test('pressShortcut"Home"OnLineWithIndents', function () {
        codeEditorInitializer.init({
            text: '    abcdef'
        });
        codeEditor._setCursor(0, 5);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['home'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.left < cursorOffset.left);
        equal(newCursorOffset.top, cursorOffset.top);
        notDeepEqual(newCursorOffset, getNullOffset());
        currentKeyEventParser.shortcutHandlers['home'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
        currentKeyEventParser.shortcutHandlers['home'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
    });

    test('pressShortcut"End"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\nb'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['end'].start();
        ok(getElementOffset(codeEditor.$cursor).left > cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
        //Check via press 'Del'
        currentKeyEventParser.shortcutHandlers['delete'].start();
        equal(codeEditor._getEditorText(), 'abcdefb');
        equal(codeEditor.$lines.length, 1);
    });

    test('pressShortcut"Tab"', function () {
        codeEditorInitializer.init({
            text: 'a'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['tab'].start();
        ok(getElementOffset(codeEditor.$cursor).left > cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
        equal(codeEditor._getEditorText(), '    a');
    });

    test('pressShortcut"Tab"WithSelection', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n\r\n123456'
        });
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+right'].start();
        currentKeyEventParser.shortcutHandlers['shift+right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor),
            selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionCenterHeight = codeEditor.$selectionCenter.height(),
            selectionEndWidth = codeEditor.$selectionEnd.width(),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart);
        currentKeyEventParser.shortcutHandlers['tab'].start();
        ok(codeEditor.$selectionStart.width() < selectionStartWidth);
        equal(selectionCenterHeight, codeEditor.$selectionCenter.height());
        ok(codeEditor.$selectionEnd.width() > selectionEndWidth);
        equal(codeEditor._getLineText(0), '    abcdef');
        equal(codeEditor._getLineText(1), '');
        ok(!codeEditor._getLineLength(1));
        equal(codeEditor._getLineText(2), '    123456');
        ok(getElementOffset(codeEditor.$selectionStart).left > selectionStartOffset.left);
        equal(getElementOffset(codeEditor.$selectionStart).top, selectionStartOffset.top);
        ok(getElementOffset(codeEditor.$cursor).left > cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
    });

    test('pressShortcut"ShiftTab"', function () {
        codeEditorInitializer.init({
            text: '      a'
        });
        codeEditor._setCursor(0, 6);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['shift+tab'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.left < cursorOffset.left);
        ok(newCursorOffset.left !== getNullOffset().left);
        equal(newCursorOffset.top, cursorOffset.top);
        equal(codeEditor._getEditorText(), '  a');
        cursorOffset = newCursorOffset;
        currentKeyEventParser.shortcutHandlers['shift+tab'].start();
        newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.left < cursorOffset.left);
        deepEqual(newCursorOffset, getNullOffset());
        equal(codeEditor._getEditorText(), 'a');
    });

    test('pressShortcut"Shift+Tab"WithSelection', function () {
        codeEditorInitializer.init({
            text: '    abcdef\r\n       a\r\n    qwerty'
        });
        codeEditor._setCursor(0, 6);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor),
            selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionEndWidth = codeEditor.$selectionEnd.width(),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart);
        currentKeyEventParser.shortcutHandlers['shift+tab'].start();
        ok(codeEditor.$selectionStart.width() > selectionStartWidth);
        ok(codeEditor.$selectionEnd.width() < selectionEndWidth);
        equal(codeEditor._getEditorText(), 'abcdef\r\n   a\r\nqwerty');
        ok(getElementOffset(codeEditor.$selectionStart).left < selectionStartOffset.left);
        equal(getElementOffset(codeEditor.$selectionStart).top, selectionStartOffset.top);
        ok(getElementOffset(codeEditor.$cursor).left < cursorOffset.left);
        equal(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
        currentKeyEventParser.shortcutHandlers['shift+tab'].start();
        equal(codeEditor._getEditorText(), 'abcdef\r\na\r\nqwerty');
    });

    test('pressShortcut"Shift+left"', function () {
        codeEditorInitializer.init({
            text: 'abc'
        });
        codeEditor._setCursor(0, 2);
        currentKeyEventParser.shortcutHandlers['shift+left'].start();
        var selectionWidth = codeEditor.$selectionStart.width();
        ok(selectionWidth);
        currentKeyEventParser.shortcutHandlers['shift+left'].start();
        ok(selectionWidth < codeEditor.$selectionStart.width());
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
        equal(codeEditor._getSelectionTextAsArray().join(''), 'ab');
    });

    test('pressShortcut"Shift+right"', function () {
        codeEditorInitializer.init({
            text: 'abc'
        });
        var cursorStartOffset = getElementOffset(codeEditor.$cursor);

        currentKeyEventParser.shortcutHandlers['shift+right'].start();
        var selectionWidth = codeEditor.$selectionStart.width();
        ok(selectionWidth);
        var cursorOffset = getElementOffset(codeEditor.$cursor);

        currentKeyEventParser.shortcutHandlers['shift+right'].start();
        var newCursorStartOffset = getElementOffset(codeEditor.$cursor);
        ok(selectionWidth < codeEditor.$selectionStart.width());
        ok(newCursorStartOffset.left > cursorOffset.left &&
           newCursorStartOffset.left > cursorStartOffset.left);
        equal(newCursorStartOffset.top, getNullOffset().top);
        equal(codeEditor._getSelectionTextAsArray().join(''), 'ab');
    });

    test('pressOnceShortcut"Shift+down"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456'
        });
        codeEditor._setCursor(0, 2);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        ok(codeEditor.$selectionStart.width());
        var selectionEndWidth = codeEditor.$selectionEnd.width(),
            newCursorOffset = getElementOffset(codeEditor.$cursor),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart),
            selectionEndOffset = getElementOffset(codeEditor.$selectionEnd);
        ok(selectionEndWidth);
        equal(selectionStartOffset.left, cursorOffset.left);
        equal(selectionStartOffset.top, cursorOffset.top);
        ok(newCursorOffset.left === cursorOffset.left &&
           newCursorOffset.top > cursorOffset.top);
        equal(selectionEndOffset.left + selectionEndWidth, newCursorOffset.left);
        equal(selectionEndOffset.top, newCursorOffset.top);
    });

    test('pressTwiceShortcut"Shift+down"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456\r\nq'
        });
        codeEditor._setCursor(0, 2);
        var cursorStartOffset = getElementOffset(codeEditor.$cursor);

        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var selectionStartWidth = codeEditor.$selectionStart.width();
        var selectionEndWidth = codeEditor.$selectionEnd.width();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        ok(getElementOffset(codeEditor.$cursor).left === cursorStartOffset.left &&
           getElementOffset(codeEditor.$cursor).top > cursorStartOffset.top);

        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var newSelectionEndWidth = codeEditor.$selectionEnd.width(),
            newCursorOffset = getElementOffset(codeEditor.$cursor),
            selectionEndOffset = getElementOffset(codeEditor.$selectionEnd),
            selectionCenterOffset = getElementOffset(codeEditor.$selectionCenter);
        //Check SelectionStart
        equal(codeEditor.$selectionStart.width(), selectionStartWidth);
        //Check SelectionEnd
        ok(newSelectionEndWidth < selectionEndWidth);
        equal(selectionEndOffset.left + newSelectionEndWidth, newCursorOffset.left);
        equal(selectionEndOffset.top, newCursorOffset.top);
        //Check SelectionCenter
        equal(selectionCenterOffset.left, getNullOffset().left);
        equal(selectionCenterOffset.top, getElementOffset(codeEditor.$selectionStart).top + codeEditor.$selectionStart.height());
        ok(codeEditor.$selectionCenter.width());
        equal(codeEditor.$selectionCenter.height(), selectionEndOffset.top - codeEditor.$selectionStart.height());
        //Check Cursor
        ok(newCursorOffset.left < cursorOffset.left &&
           newCursorOffset.top > cursorOffset.top);
    });

    test('pressShortcut"Shift+up"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456'
        });
        codeEditor._setCursor(1, 2);
        var cursorOffset = getElementOffset(codeEditor.$cursor);

        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        var selectionEndWidth = codeEditor.$selectionEnd.width(),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart),
            selectionEndOffset = getElementOffset(codeEditor.$selectionEnd),
            newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(codeEditor.$selectionStart.width());
        equal(selectionStartOffset.left, cursorOffset.left);
        deepEqual(selectionStartOffset, newCursorOffset);
        ok(selectionEndWidth);
        equal(selectionEndOffset.left + selectionEndWidth, newCursorOffset.left);
        equal(selectionEndOffset.top, newCursorOffset.top + codeEditor.$selectionStart.height());
        ok(newCursorOffset.left === cursorOffset.left &&
           newCursorOffset.top < cursorOffset.top);
    });

    test('changeSelectionDirection', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456'
        });
        codeEditor._setCursor(0, 2);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+right'].start();
        currentKeyEventParser.shortcutHandlers['shift+left'].start();
        currentKeyEventParser.shortcutHandlers['shift+left'].start();
        currentKeyEventParser.shortcutHandlers['shift+left'].start();
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor),
            selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart);
        ok(selectionStartWidth);
        ok(!codeEditor.$selectionEnd.width());
        ok(newCursorOffset.left < cursorOffset.left);
        equal(newCursorOffset.top, cursorOffset.top);
        deepEqual(newCursorOffset, selectionStartOffset);
        equal(selectionStartWidth, cursorOffset.left - newCursorOffset.left);
    });

    test('pressShortcut"Shift+home"', function () {
        codeEditorInitializer.init({
            text: 'abcdef'
        });
        currentKeyEventParser.shortcutHandlers['end'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);

        currentKeyEventParser.shortcutHandlers['shift+home'].start();
        var selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart),
            newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(selectionStartWidth);
        equal(selectionStartWidth, cursorOffset.left - newCursorOffset.left);
        equal(selectionStartOffset.top, cursorOffset.top);
        deepEqual(selectionStartOffset, newCursorOffset);
        ok(newCursorOffset.left < cursorOffset.left &&
           newCursorOffset.top === cursorOffset.top);
    });

    test('pressShortcut"Shift+home"OnLineWithIndents', function () {
        codeEditorInitializer.init({
            text: '    abcdef\r\nabcdef'
        });
        codeEditor._setCursor(1, 5);
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart),
            selectionStartWidth = codeEditor.$selectionStart.width();
        currentKeyEventParser.shortcutHandlers['shift+home'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor),
            newSelectionStartOffset = getElementOffset(codeEditor.$selectionStart),
            newSelectionStartWidth = codeEditor.$selectionStart.width();
        ok(newCursorOffset.left < cursorOffset.left);
        equal(newCursorOffset.top, cursorOffset.top);
        notDeepEqual(newCursorOffset, getNullOffset());
        ok(selectionStartOffset.left > newSelectionStartOffset.left);
        ok(newSelectionStartWidth > selectionStartWidth);
        currentKeyEventParser.shortcutHandlers['shift+home'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
        deepEqual(getElementOffset(codeEditor.$selectionStart), getNullOffset());
        ok(codeEditor.$selectionStart.width() > newSelectionStartWidth);
        currentKeyEventParser.shortcutHandlers['shift+home'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
        deepEqual(getElementOffset(codeEditor.$selectionStart), newSelectionStartOffset);
    });

    test('pressShortcut"Shift+end"', function () {
        codeEditorInitializer.init({
            text: 'abcdef'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['shift+end'].start();
        var selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart),
            newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(selectionStartWidth);
        equal(selectionStartWidth, newCursorOffset.left - cursorOffset.left);
        deepEqual(selectionStartOffset, cursorOffset);
        equal(selectionStartOffset.top, newCursorOffset.top);
        ok(newCursorOffset.left > cursorOffset.left &&
           newCursorOffset.top === cursorOffset.top);
    });

    test('pressShortcut"Ctrl+left"', function () {
        codeEditorInitializer.init({
            text: 'a*cdef'
        });
        codeEditor._setCursor(0, codeEditor._getLineLength(0));
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 6);
        currentKeyEventParser.shortcutHandlers['ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 2);
        currentKeyEventParser.shortcutHandlers['ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 1);
        currentKeyEventParser.shortcutHandlers['ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 0);
    });

    test('pressShortcut"Ctrl+left"OnLineWithSpaceAndSymbol', function () {
        codeEditorInitializer.init({
            text: 'a *cdef'
        });
        codeEditor._setCursor(0, codeEditor._getLineLength(0));
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 7);
        currentKeyEventParser.shortcutHandlers['ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 3);
        currentKeyEventParser.shortcutHandlers['ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 2);
        currentKeyEventParser.shortcutHandlers['ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 0);
    });

    test('pressShortcut"Ctrl+left"OnLineWithSymbolAndSpace', function () {
        codeEditorInitializer.init({
            text: 'a* cdef'
        });
        codeEditor._setCursor(0, codeEditor._getLineLength(0));
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 7);
        currentKeyEventParser.shortcutHandlers['ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 3);
        currentKeyEventParser.shortcutHandlers['ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 1);
        currentKeyEventParser.shortcutHandlers['ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 0);
    });

    test('pressShortcut"Ctrl+right"', function () {
        codeEditorInitializer.init({
            text: 'a*cdef'
        });
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 0);
        currentKeyEventParser.shortcutHandlers['ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 1);
        currentKeyEventParser.shortcutHandlers['ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 2);
        currentKeyEventParser.shortcutHandlers['ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 6);
    });

    test('pressShortcut"Ctrl+right"OnLineWithSpaceAndSymbol', function () {
        codeEditorInitializer.init({
            text: 'a *cdef'
        });
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 0);
        currentKeyEventParser.shortcutHandlers['ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 2);
        currentKeyEventParser.shortcutHandlers['ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 3);
        currentKeyEventParser.shortcutHandlers['ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 7);
    });

    test('pressShortcut"Ctrl+right"OnLineWithSymbolAndSpace', function () {
        codeEditorInitializer.init({
            text: 'a* cdef'
        });
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 0);
        currentKeyEventParser.shortcutHandlers['ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 1);
        currentKeyEventParser.shortcutHandlers['ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 3);
        currentKeyEventParser.shortcutHandlers['ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 7);
    });

    test('pressShortcut"Ctrl + home"', function () {
        codeEditorInitializer.init({
            text: 'a\r\nba\r\nba\r\nb'
        });
        codeEditor._setCursor(2, 2);
        currentKeyEventParser.shortcutHandlers['ctrl+home'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
    });

    test('pressShortcut"Ctrl + end"', function () {
        codeEditorInitializer.init({
            text: 'a\r\nba\r\nba\r\nabcdef'
        });
        codeEditor._setCursor(2, 2);
        currentKeyEventParser.shortcutHandlers['ctrl+end'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor),
            lastLineIndex = codeEditor.$lines.length - 1,
            lastLineOffset = getElementOffset(codeEditor.$lines[lastLineIndex]);
        equal(cursorOffset.top, lastLineOffset.top - getElementOffset(codeEditor.$editLayout).top);
        equal(cursorOffset.left, lastLineOffset.left + codeEditor._getLineLength(lastLineIndex) * codeEditor._getLetterWidth(lastLineIndex) - getElementOffset(codeEditor.$editLayout).left);
    });

    test('pressShortcut"Ctrl + shift + left"', function () {
        codeEditorInitializer.init({
            text: 'a*cdef'
        });
        currentKeyEventParser.shortcutHandlers['end'].start();
        var cursorStartOffset = getElementOffset(codeEditor.$cursor);
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 6);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 2);
        equal(getElementOffset(codeEditor.$cursor).left, getElementOffset(codeEditor.$selectionStart).left);
        equal(codeEditor.$selectionStart.width(), cursorStartOffset.left - getElementOffset(codeEditor.$cursor).left);
        currentKeyEventParser.shortcutHandlers['shift+ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 1);
        equal(getElementOffset(codeEditor.$cursor).left, getElementOffset(codeEditor.$selectionStart).left);
        equal(codeEditor.$selectionStart.width(), cursorStartOffset.left - getElementOffset(codeEditor.$cursor).left);
        currentKeyEventParser.shortcutHandlers['shift+ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 0);
        equal(getElementOffset(codeEditor.$cursor).left, getElementOffset(codeEditor.$selectionStart).left);
        equal(codeEditor.$selectionStart.width(), cursorStartOffset.left - getElementOffset(codeEditor.$cursor).left);
    });

    test('pressShortcut"Ctrl + shift + left"OnLineWithSpaceAndSymbol', function () {
        codeEditorInitializer.init({
            text: 'a *cdef'
        });
        currentKeyEventParser.shortcutHandlers['end'].start();
        var cursorStartOffset = getElementOffset(codeEditor.$cursor);
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 7);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 3);
        equal(getElementOffset(codeEditor.$cursor).left, getElementOffset(codeEditor.$selectionStart).left);
        equal(codeEditor.$selectionStart.width(), cursorStartOffset.left - getElementOffset(codeEditor.$cursor).left);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 2);
        equal(getElementOffset(codeEditor.$cursor).left, getElementOffset(codeEditor.$selectionStart).left);
        equal(codeEditor.$selectionStart.width(), cursorStartOffset.left - getElementOffset(codeEditor.$cursor).left);
        currentKeyEventParser.shortcutHandlers['shift+ctrl+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 0);
        equal(getElementOffset(codeEditor.$cursor).left, getElementOffset(codeEditor.$selectionStart).left);
        equal(codeEditor.$selectionStart.width(), cursorStartOffset.left - getElementOffset(codeEditor.$cursor).left);
    });

    test('pressShortcut"Ctrl + shift + left"OnLineWithSymbolsAndSpace', function () {
        codeEditorInitializer.init({
            text: 'a*** cdef'
        });
        currentKeyEventParser.shortcutHandlers['end'].start();
        var cursorStartOffset = getElementOffset(codeEditor.$cursor);
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 9);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 5);
        equal(getElementOffset(codeEditor.$cursor).left, getElementOffset(codeEditor.$selectionStart).left);
        equal(codeEditor.$selectionStart.width(), cursorStartOffset.left - getElementOffset(codeEditor.$cursor).left);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 1);
        equal(getElementOffset(codeEditor.$cursor).left, getElementOffset(codeEditor.$selectionStart).left);
        equal(codeEditor.$selectionStart.width(), cursorStartOffset.left - getElementOffset(codeEditor.$cursor).left);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+left'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 0);
        equal(getElementOffset(codeEditor.$cursor).left, getElementOffset(codeEditor.$selectionStart).left);
        equal(codeEditor.$selectionStart.width(), cursorStartOffset.left - getElementOffset(codeEditor.$cursor).left);
    });

    test('pressShortcut"Ctrl + shift + right"', function () {
        codeEditorInitializer.init({
            text: 'a*cdef'
        });
        var cursorStartOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 1);
        equal(getElementOffset(codeEditor.$selectionStart).left, cursorStartOffset.left);
        equal(codeEditor.$selectionStart.width(), getElementOffset(codeEditor.$cursor).left - cursorStartOffset.left);
        currentKeyEventParser.shortcutHandlers['shift+ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 2);
        equal(getElementOffset(codeEditor.$selectionStart).left, cursorStartOffset.left);
        equal(codeEditor.$selectionStart.width(), getElementOffset(codeEditor.$cursor).left - cursorStartOffset.left);
        currentKeyEventParser.shortcutHandlers['shift+ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 6);
        equal(getElementOffset(codeEditor.$selectionStart).left, cursorStartOffset.left);
        equal(codeEditor.$selectionStart.width(), getElementOffset(codeEditor.$cursor).left - cursorStartOffset.left);
    });

    test('pressShortcut"Ctrl + shift + right"OnLineWithSpaceAndSymbol', function () {
        codeEditorInitializer.init({
            text: 'a *cdef'
        });
        var cursorStartOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 2);
        equal(getElementOffset(codeEditor.$selectionStart).left, cursorStartOffset.left);
        equal(codeEditor.$selectionStart.width(), getElementOffset(codeEditor.$cursor).left - cursorStartOffset.left);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 3);
        equal(getElementOffset(codeEditor.$selectionStart).left, cursorStartOffset.left);
        equal(codeEditor.$selectionStart.width(), getElementOffset(codeEditor.$cursor).left - cursorStartOffset.left);
        currentKeyEventParser.shortcutHandlers['shift+ctrl+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 7);
        equal(getElementOffset(codeEditor.$selectionStart).left, cursorStartOffset.left);
        equal(codeEditor.$selectionStart.width(), getElementOffset(codeEditor.$cursor).left - cursorStartOffset.left);
    });

    test('pressShortcut"Ctrl + shift + right"OnLineWithSymbolsAndSpace', function () {
        codeEditorInitializer.init({
            text: 'a*** cdef'
        });
        var cursorStartOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 1);
        equal(getElementOffset(codeEditor.$selectionStart).left, cursorStartOffset.left);
        equal(codeEditor.$selectionStart.width(), getElementOffset(codeEditor.$cursor).left - cursorStartOffset.left);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 5);
        equal(getElementOffset(codeEditor.$selectionStart).left, cursorStartOffset.left);
        equal(codeEditor.$selectionStart.width(), getElementOffset(codeEditor.$cursor).left - cursorStartOffset.left);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+right'].start();
        equal(Math.round(getElementOffset(codeEditor.$cursor).left / codeEditor._getLetterWidth(0)), 9);
        equal(getElementOffset(codeEditor.$selectionStart).left, cursorStartOffset.left);
        equal(codeEditor.$selectionStart.width(), getElementOffset(codeEditor.$cursor).left - cursorStartOffset.left);
    });

    test('pressShortcut"Ctrl + backspace"', function () {
        codeEditorInitializer.init({
            text: '    Test ctrl backspace'
        });
        codeEditor._setCursor(0, 20);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+backspace'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.left < cursorOffset.left);
        equal(newCursorOffset.top, cursorOffset.top);
        equal(codeEditor._getEditorText(), '    Test ctrl ace');
        cursorOffset = newCursorOffset;
        currentKeyEventParser.shortcutHandlers['ctrl+backspace'].start();
        newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.left < cursorOffset.left);
        equal(newCursorOffset.top, cursorOffset.top);
        equal(codeEditor._getEditorText(), '    Test ace');
        cursorOffset = newCursorOffset;
        currentKeyEventParser.shortcutHandlers['ctrl+backspace'].start();
        newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.left < cursorOffset.left);
        equal(newCursorOffset.top, cursorOffset.top);
        equal(codeEditor._getEditorText(), '    ace');
        currentKeyEventParser.shortcutHandlers['ctrl+backspace'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
    });

    test('pressShortcut"Ctrl + backspace"WithSelection', function () {
        codeEditorInitializer.init({
            text: 'a b c\r\n' +
                  '    a b c\r\n' +
                  'a b c'
        });
        codeEditor._setCursor(0, 3);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionCenterHeight = codeEditor.$selectionCenter.height(),
            selectionEndWidth = codeEditor.$selectionEnd.width();
        ok(selectionStartWidth && selectionCenterHeight && selectionEndWidth);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+backspace'].start();
        ok(!codeEditor.$selectionStart.width());
        ok(!codeEditor.$selectionCenter.height());
        ok(!codeEditor.$selectionEnd.width());
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top < cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        equal(codeEditor.$lines.length, 1);
        equal(codeEditor._getEditorText(), 'a b c');
    });

    test('pressShortcut"Ctrl + backspace"WithInvertSelection', function () {
        codeEditorInitializer.init({
            text: 'a b c\r\n' +
                  '    a b c\r\n' +
                  'a b c'
        });
        codeEditor._setCursor(2, 3);
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        var selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionCenterHeight = codeEditor.$selectionCenter.height(),
            selectionEndWidth = codeEditor.$selectionEnd.width();
        ok(selectionStartWidth && selectionCenterHeight && selectionEndWidth);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+backspace'].start();
        ok(!codeEditor.$selectionStart.width());
        ok(!codeEditor.$selectionCenter.height());
        ok(!codeEditor.$selectionEnd.width());
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        equal(codeEditor.$lines.length, 1);
        equal(codeEditor._getEditorText(), 'a b c');
    });

    test('pressShortcut"Ctrl + backspace"OnLineFirstSymbol', function () {
        codeEditorInitializer.init({
            text: 'a b c\r\n' +
                  '    a b c'
        });
        codeEditor._setCursor(1, 0);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+backspace'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.left > cursorOffset.left);
        ok(newCursorOffset.top < cursorOffset.top);
        equal(codeEditor.$lines.length, 1);
        equal(codeEditor._getEditorText(), 'a b c    a b c');
    });

    test('pressShortcut"Ctrl + delete"', function () {
        codeEditorInitializer.init({
            text: 'a\r\nThe quick brown'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+delete'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        equal(codeEditor._getEditorText(), 'aThe quick brown');
        currentKeyEventParser.shortcutHandlers['ctrl+delete'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        equal(codeEditor._getEditorText(), 'aquick brown');
        currentKeyEventParser.shortcutHandlers['ctrl+delete'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        equal(codeEditor._getEditorText(), 'abrown');
    });

    test('pressShortcut"Ctrl + delete"WithSelection', function () {
        codeEditorInitializer.init({
            text: '1 2 3\r\n' +
                  '    4 5 6\r\n' +
                  '7 8 9'
        });
        codeEditor._setCursor(0, 2);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionCenterHeight = codeEditor.$selectionCenter.height(),
            selectionEndWidth = codeEditor.$selectionEnd.width();
        ok(selectionStartWidth && selectionCenterHeight && selectionEndWidth);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+delete'].start();
        ok(!codeEditor.$selectionStart.width());
        ok(!codeEditor.$selectionCenter.height());
        ok(!codeEditor.$selectionEnd.width());
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top < cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        equal(codeEditor.$lines.length, 1);
        equal(codeEditor._getEditorText(), '1 8 9');
    });

    test('pressShortcut"Ctrl + delete"WithInvertSelection', function () {
        codeEditorInitializer.init({
            text: 'a\r\n' +
                  '    A\r\n' +
                  'a b'
        });
        codeEditor._setCursor(2, 1);
        currentKeyEventParser.shortcutHandlers['shift+left'].start();
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        var selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionCenterHeight = codeEditor.$selectionCenter.height(),
            selectionEndWidth = codeEditor.$selectionEnd.width();
        ok(selectionStartWidth && selectionCenterHeight && selectionEndWidth);
        var cursorOffset = getElementOffset(codeEditor.$cursor);

        currentKeyEventParser.shortcutHandlers['ctrl+delete'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        ok(!codeEditor.$selectionStart.width());
        ok(!codeEditor.$selectionCenter.height());
        ok(!codeEditor.$selectionEnd.width());
        equal(codeEditor.$lines.length, 1);
        equal(codeEditor._getEditorText(), ' b');
    });

    asyncTest('CopyVia"Ctrl+C"AndPasteVia"Ctrl+V"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456\r\nqw'
        });
        codeEditor._setCursor(0, 3);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['ctrl+c'].start();
        codeEditor._setCursor(1, 4);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+v'].start();
        window.setTimeout(function () {
            var resultText = 'abcdef\r\n1234def\r\n123456\r\nqw56\r\nqw';
            equal(codeEditor._getEditorText(), resultText);
            notEqual(getElementOffset(codeEditor.$cursor).left, cursorOffset.left);
            notEqual(getElementOffset(codeEditor.$cursor).top, cursorOffset.top);
            start();
        });
    });

    asyncTest('CopyVia"Ctrl+C"AndChangeSelectionTextVia"Ctrl+V"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456\r\nqw'
        });
        codeEditor._setCursor(0, 3);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['ctrl+c'].start();
        codeEditor._setCursor(1, 4);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        currentKeyEventParser.shortcutHandlers['ctrl+v'].start();
        window.setTimeout(function () {
            var resultText = 'abcddef\r\n123456\r\nqw56\r\nqw';
            equal(codeEditor._getEditorText(), resultText);
            ok(getElementOffset(codeEditor.$cursor).left < cursorOffset.left);
            ok(getElementOffset(codeEditor.$cursor).top > cursorOffset.top);
            start();
        });
    });

    asyncTest('CopyTextWithIndentsVia"Ctrl+C"AndPasteVia"Ctrl+V"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n    123456\r\n  qw'
        });
        codeEditor._setCursor(0, 3);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['ctrl+c'].start();
        codeEditor._setCursor(0, 2);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+v'].start();
        window.setTimeout(function () {
            var resultText = 'abdef\r\n    123456\r\n  qcdef\r\n    123456\r\n  qw';
            equal(codeEditor._getEditorText(), resultText);
            ok(getElementOffset(codeEditor.$cursor).left > cursorOffset.left);
            ok(getElementOffset(codeEditor.$cursor).top > cursorOffset.top);
            start();
        });
    });

    test('CutViaSelectionAndPress"Ctrl+X"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456\r\nqw'
        });
        codeEditor._setCursor(0, 3);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['ctrl+x'].start();
        equal(codeEditor._getEditorText(), 'abc456\r\nqw');
        equal(codeEditor.$lines.length, 2);
        deepEqual(cursorOffset, getElementOffset(codeEditor.$cursor));
    });

    test('CutLineVia"Ctrl+X"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456\r\nqw'
        });
        codeEditor._setCursor(0, 3);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+x'].start();
        equal(codeEditor._getEditorText(), '123456\r\nqw');
        equal(codeEditor.$lines.length, 2);
        deepEqual(cursorOffset, getElementOffset(codeEditor.$cursor));
    });

    asyncTest('CutViaSelectionAndPress"Ctrl+X"AndPasteVia"Ctrl+V"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456\r\nqw'
        });
        codeEditor._setCursor(0, 3);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['ctrl+x'].start();
        codeEditor._setCursor(1, 1);
        currentKeyEventParser.shortcutHandlers['ctrl+v'].start();
        window.setTimeout(function () {
            var resultText = 'abc456\r\nqdef\r\n123w';
            equal(codeEditor._getEditorText(), resultText);
            ok(getElementOffset(codeEditor.$cursor).top > cursorOffset.top);
            start();
        });
    });

    asyncTest('CutLineVia"Ctrl+X"AndPasteVia"Ctrl+V"', function () {
        codeEditorInitializer.init({
            text: 'abcdef\r\n123456\r\nqw'
        });
        codeEditor._setCursor(0, 3);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+x'].start();
        codeEditor._setCursor(1, 1);
        currentKeyEventParser.shortcutHandlers['ctrl+v'].start();
        window.setTimeout(function () {
            var resultText = '123456\r\nqabcdef\r\nw';
            equal(codeEditor._getEditorText(), resultText);
            ok(getElementOffset(codeEditor.$cursor).top > cursorOffset.top);
            start();
        });
    });

    test('testMovingLineVia"Ctrl+Shift+Up"', function () {
        codeEditorInitializer.init({
            text: '123456\r\nabcdefg\r\n!@#$%^&*'
        });
        codeEditor._setCursor(2, 3);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+up'].start();
        equal(codeEditor._getEditorText(), '123456\r\n!@#$%^&*\r\nabcdefg');
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top < cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        cursorOffset = newCursorOffset;
        currentKeyEventParser.shortcutHandlers['ctrl+shift+up'].start();
        equal(codeEditor._getEditorText(), '!@#$%^&*\r\n123456\r\nabcdefg');
        newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top < cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+up'].start();
        equal(codeEditor._getEditorText(), '!@#$%^&*\r\n123456\r\nabcdefg');
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
    });

    test('testMovingLineVia"Ctrl+Shift+Down"', function () {
        codeEditorInitializer.init({
            text: '123456\r\nabcdefg\r\n!@#$%^&*'
        });
        codeEditor._setCursor(0, 3);
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+down'].start();
        equal(codeEditor._getEditorText(), 'abcdefg\r\n123456\r\n!@#$%^&*');
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top > cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        cursorOffset = newCursorOffset;
        currentKeyEventParser.shortcutHandlers['ctrl+shift+down'].start();
        equal(codeEditor._getEditorText(), 'abcdefg\r\n!@#$%^&*\r\n123456');
        newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top > cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+down'].start();
        equal(codeEditor._getEditorText(), 'abcdefg\r\n!@#$%^&*\r\n123456');
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
    });

    test('testMovingLinesVia"Ctrl+Shift+Up"', function () {
        codeEditorInitializer.init({
            text: 'abc\r\ndef\r\n123456\r\n789\r\n654321\r\nghi'
        });
        codeEditor._setCursor(4, 2);
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        currentKeyEventParser.shortcutHandlers['shift+up'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+up'].start();
        equal(codeEditor._getEditorText(), 'abc\r\n123456\r\n789\r\n654321\r\ndef\r\nghi');
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top < cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        cursorOffset = newCursorOffset;
        currentKeyEventParser.shortcutHandlers['ctrl+shift+up'].start();
        equal(codeEditor._getEditorText(), '123456\r\n789\r\n654321\r\nabc\r\ndef\r\nghi');
        newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top < cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        cursorOffset = newCursorOffset;
        currentKeyEventParser.shortcutHandlers['ctrl+shift+up'].start();
        equal(codeEditor._getEditorText(), '123456\r\n789\r\n654321\r\nabc\r\ndef\r\nghi');
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
    });

    test('testMovingLinesVia"Ctrl+Shift+Down"', function () {
        codeEditorInitializer.init({
            text: 'abc\r\n123456\r\n789\r\n654321\r\ndef\r\nghi'
        });
        codeEditor._setCursor(1, 2);
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+shift+down'].start();
        equal(codeEditor._getEditorText(), 'abc\r\ndef\r\n123456\r\n789\r\n654321\r\nghi');
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top > cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        cursorOffset = newCursorOffset;
        currentKeyEventParser.shortcutHandlers['ctrl+shift+down'].start();
        equal(codeEditor._getEditorText(), 'abc\r\ndef\r\nghi\r\n123456\r\n789\r\n654321');
        newCursorOffset = getElementOffset(codeEditor.$cursor);
        ok(newCursorOffset.top > cursorOffset.top);
        equal(newCursorOffset.left, cursorOffset.left);
        cursorOffset = newCursorOffset;
        currentKeyEventParser.shortcutHandlers['ctrl+shift+down'].start();
        equal(codeEditor._getEditorText(), 'abc\r\ndef\r\nghi\r\n123456\r\n789\r\n654321');
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
    });


    /*TEST UNDO/REDO*/
    test('testCancelLetterPressVia"Ctrl+z"And"Ctrl+Shift+z"', function () {
        codeEditorInitializer.init();
        currentKeyEventParser._symbolPressed('a');
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+z'].start();
        equal(codeEditor._getEditorText(), '');
        deepEqual(getElementOffset(codeEditor.$cursor), getNullOffset());
        currentKeyEventParser.shortcutHandlers['ctrl+shift+z'].start();
        equal(codeEditor._getEditorText(), 'a');
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
    });

    test('testCancelEnterPressVia"Ctrl+z"And"Ctrl+Shift+z"', function () {
        codeEditorInitializer.init({
            text: 'a'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['enter'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+z'].start();
        equal(codeEditor._getEditorText(), 'a');
        equal(codeEditor.$lines.length, 1);
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        currentKeyEventParser.shortcutHandlers['shift+ctrl+z'].start();
        equal(codeEditor._getEditorText(), 'a\r\n');
        equal(codeEditor.$lines.length, 2);
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
    });

    test('testCancelSetCursorPositionPressVia"Ctrl+z"And"Ctrl+Shift+z"', function () {
        codeEditorInitializer.init({
            text: 'abc\r\na'
        });
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['right'].start();
        currentKeyEventParser.shortcutHandlers['down'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+z'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        currentKeyEventParser.shortcutHandlers['shift+ctrl+z'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
    });

    test('testCancel"Ctrl+Delete"WithSelectionVia"Ctrl+z"And"Ctrl+Shift+z"', function () {
        codeEditorInitializer.init({
            text: 'abc\r\n123'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor),
            selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart),
            selectionEndWidth = codeEditor.$selectionEnd.width(),
            selectionEndOffset = getElementOffset(codeEditor.$selectionEnd);
        currentKeyEventParser.shortcutHandlers['ctrl+delete'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+z'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        equal(codeEditor.$selectionStart.width(), selectionStartWidth);
        equal(codeEditor.$selectionEnd.width(), selectionEndWidth);
        deepEqual(getElementOffset(codeEditor.$selectionStart), selectionStartOffset);
        deepEqual(getElementOffset(codeEditor.$selectionEnd), selectionEndOffset);
        equal(codeEditor._getEditorText(), 'abc\r\n123');
        currentKeyEventParser.shortcutHandlers['shift+ctrl+z'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
        ok(!codeEditor.$selectionStart.width());
        ok(!codeEditor.$selectionEnd.width());
    });

    asyncTest('testCancelPasteVia"Ctrl+z"And"Ctrl+Shift+z"', function () {
        codeEditorInitializer.init({
            text: 'abc'
        });
        currentKeyEventParser.shortcutHandlers['shift+right'].start();
        currentKeyEventParser.shortcutHandlers['ctrl+c'].start();
        currentKeyEventParser.shortcutHandlers['right'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor);
        currentKeyEventParser.shortcutHandlers['ctrl+v'].start();
        window.setTimeout(function () {
            var newCursorOffset = getElementOffset(codeEditor.$cursor);
            equal(codeEditor._getEditorText(), 'abac');
            currentKeyEventParser.shortcutHandlers['ctrl+z'].start();
            deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
            equal(codeEditor._getEditorText(), 'abc');
            currentKeyEventParser.shortcutHandlers['shift+ctrl+z'].start();
            deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
            equal(codeEditor._getEditorText(), 'abac');
            start();
        });
    });

    test('testCancelTabPressVia"Ctrl+z"And"Ctrl+Shift+z"', function () {
        codeEditorInitializer.init({
            text: 'abc\r\na'
        });
        currentKeyEventParser.shortcutHandlers['right'].start();
        currentKeyEventParser.shortcutHandlers['shift+down'].start();
        var cursorOffset = getElementOffset(codeEditor.$cursor),
            selectionStartWidth = codeEditor.$selectionStart.width(),
            selectionStartOffset = getElementOffset(codeEditor.$selectionStart),
            selectionEndWidth = codeEditor.$selectionEnd.width(),
            selectionEndOffset = getElementOffset(codeEditor.$selectionEnd);
        currentKeyEventParser.shortcutHandlers['tab'].start();
        var newCursorOffset = getElementOffset(codeEditor.$cursor),
            newSelectionStartWidth = codeEditor.$selectionStart.width(),
            newSelectionStartOffset = getElementOffset(codeEditor.$selectionStart),
            newSelectionEndWidth = codeEditor.$selectionEnd.width(),
            newSelectionEndOffset = getElementOffset(codeEditor.$selectionEnd);
        equal(codeEditor._getEditorText(), '    abc\r\n    a');
        currentKeyEventParser.shortcutHandlers['ctrl+z'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), cursorOffset);
        equal(codeEditor.$selectionStart.width(), selectionStartWidth);
        equal(codeEditor.$selectionEnd.width(), selectionEndWidth);
        deepEqual(getElementOffset(codeEditor.$selectionStart), selectionStartOffset);
        deepEqual(getElementOffset(codeEditor.$selectionEnd), selectionEndOffset);
        equal(codeEditor._getEditorText(), 'abc\r\na');
        currentKeyEventParser.shortcutHandlers['ctrl+shift+z'].start();
        deepEqual(getElementOffset(codeEditor.$cursor), newCursorOffset);
        equal(codeEditor.$selectionStart.width(), newSelectionStartWidth);
        equal(codeEditor.$selectionEnd.width(), newSelectionEndWidth);
        deepEqual(getElementOffset(codeEditor.$selectionStart), newSelectionStartOffset);
        deepEqual(getElementOffset(codeEditor.$selectionEnd), newSelectionEndOffset);
    });

    test('testCancelStackVia"Ctrl+z"And"Ctrl+Shift+z"', function () {
        codeEditorInitializer.init();
        currentKeyEventParser._symbolPressed('a');
        currentKeyEventParser._symbolPressed('b');
        currentKeyEventParser._symbolPressed('c');
        currentKeyEventParser.shortcutHandlers['ctrl+z'].start();
        equal(codeEditor._getEditorText(), 'ab');
        currentKeyEventParser.shortcutHandlers['ctrl+z'].start();
        equal(codeEditor._getEditorText(), 'a');
        currentKeyEventParser.shortcutHandlers['ctrl+shift+z'].start();
        equal(codeEditor._getEditorText(), 'ab');
        currentKeyEventParser._symbolPressed('1');
        equal(codeEditor._getEditorText(), 'ab1');
        currentKeyEventParser.shortcutHandlers['ctrl+shift+z'].start();
        equal(codeEditor._getEditorText(), 'ab1');
    });


    /*TEST UPDATE EDITOR SIZE*/
    test('testUpdateHeightFixedHeightCodeEditor', function () {
        options = {
            width: 800,
            height: 30,
            text: 'The quick brown',
            fixedHeight: true
        };
        codeEditorInitializer.init(options);
        var editLayoutHeight = codeEditor.$editLayout[0].offsetHeight;
        equal(editLayoutHeight, 30);
        equal(codeEditor.$scrollLayout.css('overflow-y'), 'hidden');
        currentKeyEventParser.shortcutHandlers['end'].start();
        currentKeyEventParser.shortcutHandlers['enter'].start();
        ok(codeEditor.$editLayout[0].offsetHeight > editLayoutHeight);
        equal(codeEditor.$scrollLayout.css('overflow-y'), 'scroll');
        ok(codeEditor.$scrollLayout.scrollTop());
    });

    test('testUpdateHeightNotFixedHeightCodeEditor', function () {
        options = {
            width: 800,
            height: 30,
            text: 'The quick brown',
            fixedHeight: false
        };
        codeEditorInitializer.init(options);
        var editLayoutHeight = codeEditor.$editLayout[0].offsetHeight;
        ok(codeEditor.$scrollLayout[0].offsetHeight >= 30);
        equal(codeEditor.$scrollLayout.css('overflow-y'), Util.isIE ? 'visible' : 'auto');
        currentKeyEventParser.shortcutHandlers['end'].start();
        currentKeyEventParser.shortcutHandlers['enter'].start();
        ok(codeEditor.$editLayout[0].offsetHeight > editLayoutHeight);
        equal(codeEditor.$scrollLayout.css('overflow-y'), Util.isIE ? 'visible' : 'auto');
        ok(!codeEditor.$scrollLayout.scrollTop());
    });

    test('testUpdateWidthCodeEditor', function () {
        options = {
            width: 100,
            height: 50,
            text: 'The brown ',
            fixedHeight: true
        };
        codeEditorInitializer.init(options);
        var scrollLayoutWidth = codeEditor.$scrollLayout[0].offsetWidth,
            editLayoutWidth = codeEditor.$editLayout[0].clientWidth;
        equal(scrollLayoutWidth, 100);
        equal(editLayoutWidth, codeEditor.$scrollLayout.innerWidth());
        equal(codeEditor.$scrollLayout.css('overflow-x'), 'hidden');
        currentKeyEventParser.shortcutHandlers['end'].start();
        currentKeyEventParser._symbolPressed('f');
        currentKeyEventParser._symbolPressed('o');
        currentKeyEventParser._symbolPressed('x');
        ok(codeEditor.$editLayout[0].offsetWidth > editLayoutWidth);
        equal(codeEditor.$scrollLayout.css('overflow-y'), 'hidden');
        ok(codeEditor.$scrollLayout.scrollLeft());
    });

    var getElementOffset = function ($element) {
        return {
            left: hasEditLayoutOffset ?
                $element[0].offsetLeft - codeEditor.$editLayout[0].offsetLeft :
                $element[0].offsetLeft,
            top: hasEditLayoutOffset ?
                $element[0].offsetTop - codeEditor.$editLayout[0].offsetTop :
                $element[0].offsetTop
        }
    };

    var getNullOffset = function () {
        return {
            left: 0,
            top: 0
        }
    };
});
