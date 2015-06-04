var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    Automation = TestCafeClient.get('Automation'),
    TextSelection = Hammerhead.TextSelection,
    Settings = TestCafeClient.get('Settings'),
    CursorWidget = TestCafeClient.get('UI.Cursor'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Util = Hammerhead.Util;

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

        if (err.element)
            currentErrorElement = err.element;
    });

    var checkScrollAfterSelect = !(Util.isMozilla || Util.isIE),

        currentErrorCode = null,
        currentSourceIndex = null,
        currentErrorElement = null,
    //constants
        TEST_ELEMENT_CLASS = 'testElement',
        BIG_TEXTAREA_SELECTOR = '#textareaTest',
        INPUT_SELECTOR = '#inputTest',

    //utils
        asyncActionCallback,

        addTextareaElement = function (value, width, height) {
            var $textarea = $('<textarea></textarea>')
                .css({
                    width: width + 'px',
                    height: height + 'px'
                })
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo('body');
            $textarea[0].value = value;
            $textarea[0].textContent = value;
            $textarea.text(value);
            return $textarea;
        },

        getMidpointXCoordinate = function (y, pointStart, pointEnd) {
            return pointStart.x + ((y - pointStart.y) * (pointEnd.x - pointStart.x)) / (pointEnd.y - pointStart.y);
        },

        checkSelection = function (el, start, end, inverse) {
            equal(Util.getActiveElement(), el, 'selected element is active');
            equal(TextSelection.getSelectionStart(el), start, 'start selection correct');
            equal(TextSelection.getSelectionEnd(el), end, 'end selection correct');
            equal(TextSelection.hasInverseSelection(el), inverse, 'selection direction correct');
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

    $('<div></div>').css({width: 1, height: 1500, position: 'absolute'}).appendTo('body');
    $('body').css('height', '1500px');
    //NOTE: problem with window.top bodyMargin in IE9 if test 'runAll'
    //because we can't determine that element is in qunit test iframe
    if (Util.isIE && Util.browserVersion === 9)
        $(window.top.document).find('body').css('marginTop', '0px');

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
        $(BIG_TEXTAREA_SELECTOR)[0].selectionStart = 0;
        $(BIG_TEXTAREA_SELECTOR)[0].selectionEnd = 0;
        $(BIG_TEXTAREA_SELECTOR)[0].scrollTop = 0;
        $(INPUT_SELECTOR)[0].selectionStart = 0;
        $(INPUT_SELECTOR)[0].selectionEnd = 0;
        $(INPUT_SELECTOR)[0].scrollLeft = 0;
        currentErrorCode = null;
        currentErrorElement = null;
        currentSourceIndex = null;
        Settings.ENABLE_SOURCE_INDEX = false;
    };

    module('different arguments tests. element is input');

    asyncTest('only dom element as a parameter', function () {
        var $input = $(INPUT_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    mouseup = true;
                };
                ActionsAPI.select($input);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 0, $input[0].value.length, false);
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
            },
            correctTestWaitingTime(4000)
        );
    });

    asyncTest('positive offset as a parameters', function () {
        var $input = $(INPUT_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    mouseup = true;
                };
                ActionsAPI.select($input, 5);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 0, 5, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('and negative offset as a parameters', function () {
        var $input = $(INPUT_SELECTOR),
            valueLength = $input[0].value.length,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    mouseup = true;
                };
                ActionsAPI.select($input, -5);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], valueLength - 5, valueLength, true);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('zero offset as a parameters', function () {
        var $input = $(INPUT_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    mouseup = true;
                };
                ActionsAPI.select($input, 0);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 0, 0, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('startPos less than endPos as a parameters', function () {
        var $input = $(INPUT_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    mouseup = true;
                };
                ActionsAPI.select($input, 2, 4);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 2, 4, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('startPos more than endPos as a parameters', function () {
        var $input = $(INPUT_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    mouseup = true;
                };
                ActionsAPI.select($input, 4, 2);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 2, 4, true);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('startLine, startPos, endLine, endPos as a parameters', function () {
        var $input = $(INPUT_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    mouseup = true;
                };
                ActionsAPI.select($input, 2, 15, 7, 15);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 2, $input[0].value.length, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('not a number offset raise error', function () {
        var $input = $(INPUT_SELECTOR);
        Settings.ENABLE_SOURCE_INDEX = true;
        asyncActionCallback = function () {
        };
        ActionsAPI.select($input, 'abc', '#34');
        window.setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_INCORRECT_SELECT_ACTION_ARGUMENTS, 'correct error code sent');
            equal(currentSourceIndex, 34);
            start();
        }, correctTestWaitingTime(500));
    });

    asyncTest('negative endPos raise error', function () {
        var $input = $(INPUT_SELECTOR);
        Settings.ENABLE_SOURCE_INDEX = true;
        asyncActionCallback = function () {
        };
        ActionsAPI.select($input, 2, -4, '#12');
        window.setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_INCORRECT_SELECT_ACTION_ARGUMENTS, 'correct error code sent');
            equal(currentSourceIndex, 12);
            start();
        }, correctTestWaitingTime(500));
    });

    module('different arguments tests. element is textarea');

    asyncTest('only dom element as a parameter', function () {
        var $textarea = addTextareaElement('123456789abcd\nefjtybllsjaLJS', 250, 150),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 0, $textarea[0].value.length, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('positive offset as a parameters', function () {
        var $textarea = addTextareaElement('123456789abcd\nefjtybllsjaLJS', 250, 150),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea, 5);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 0, 5, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('negative offset as a parameters', function () {
        var $textarea = addTextareaElement('123456789abcd\nefjtybllsjaLJS', 250, 150),
            valueLength = $textarea[0].value.length,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea, -5);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], valueLength - 5, valueLength, true);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('startPos less than endPos as a parameters', function () {
        var $textarea = addTextareaElement('123456789abcd\nefjtybllsjaLJS\nqwerty test cafe', 250, 150),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea, 3, 20);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 3, 20, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('startPos more than endPos as a parameters', function () {
        var $textarea = addTextareaElement('123456789abcd\nefjtybllsjaLJS\nqwerty test cafe', 250, 150),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea, 20, 3);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 3, 20, true);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('startLine, startPos less than endLine, endPos as a parameters', function () {
        var $textarea = addTextareaElement('123456789abcd\nefjtybllsjaLJS\nqwerty test cafe', 250, 150),
            startPosition = null,
            endPosition = null,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea, 0, 3, 2, 7);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                startPosition = Util.getTextareaPositionByLineAndOffset($textarea[0], 0, 3);
                endPosition = Util.getTextareaPositionByLineAndOffset($textarea[0], 2, 7);
                checkSelection($textarea[0], startPosition, endPosition, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('startLine, startPos more than endLine, endPos as a parameters', function () {
        var $textarea = addTextareaElement('123456789abcd\nefjtybllsjaLJS\nqwerty test cafe', 250, 150),
            startPosition = null,
            endPosition = null,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea, 2, 7, 0, 3);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                startPosition = Util.getTextareaPositionByLineAndOffset($textarea[0], 0, 3);
                endPosition = Util.getTextareaPositionByLineAndOffset($textarea[0], 2, 7);
                checkSelection($textarea[0], startPosition, endPosition, true);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('startLine, startPos equal endLine, endPos as a parameters', function () {
        var $textarea = addTextareaElement('123456789abcd\nefjtybllsjaLJS\nqwerty test cafe', 250, 150),
            selectPosition = null,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea, 2, 7, 2, 7);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                selectPosition = Util.getTextareaPositionByLineAndOffset($textarea[0], 2, 7);
                checkSelection($textarea[0], selectPosition, selectPosition, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('startLine, startPos and endLine as a parameters', function () {
        var $textarea = addTextareaElement('123456789abcd\nefj\nqwerty test cafe', 250, 150),
            textareaValue = $textarea[0].value,
            startPosition = null,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea, 1, 8, 2);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                startPosition = Util.getTextareaPositionByLineAndOffset($textarea[0], 1, Math.min(8, textareaValue.split('\n')[1].length));
                checkSelection($textarea[0], startPosition, textareaValue.length, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('negative endLine raise error', function () {
        var $textarea = addTextareaElement('123456789abcd\nefj\nqwerty test cafe', 250, 150);
        Settings.ENABLE_SOURCE_INDEX = true;
        asyncActionCallback = function () {
        };
        ActionsAPI.select($textarea, 2, 4, -2, 5, '#56');
        window.setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_INCORRECT_SELECT_ACTION_ARGUMENTS, 'correct error code sent');
            equal(currentSourceIndex, 56);
            start();
        }, correctTestWaitingTime(500));
    });

    module('check the boundary cases');

    asyncTest('select empty input', function () {
        var $input = $(INPUT_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0].value = '';
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    mouseup = true;
                };
                ActionsAPI.select($input);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 0, 0, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('select empty textarea', function () {
        var $textarea = addTextareaElement('', 250, 150),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 0, 0, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    asyncTest('select in input with some spaces in succession', function () {
        var $input = $(INPUT_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0].value = '1   2     3    4    5      6';
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    mouseup = true;
                };
                ActionsAPI.select($input, 3, 25);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 3, 25, false);
            },
            correctTestWaitingTime(3000)
        );
    });

    asyncTest('select in textarea with some empty strings', function () {
        var $textarea = addTextareaElement('123456789abcd\n\n\nefghi\njklmop\n\nqwerty test cafe', 250, 150),
            valueLength = $textarea[0].value.length,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function () {
                    mousedown = true;
                });
                $textarea.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
                    mouseup = true;
                });
                ActionsAPI.select($textarea, 3, valueLength - 3);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 3, valueLength - 3, false);
            },
            correctTestWaitingTime(2000)
        );
    });

    module('scroll in input');

    asyncTest('forward select and scroll', function () {
        var $input = $(INPUT_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0].value = '1234567891012131415161718911200111554454455454545412121212121212';
                $input[0].selectionStart = 0;
                $input[0].selectionEnd = 0;
                $input[0].scrollLeft = 0;
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    equal(Util.getElementScroll($input).left, 0);
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    if (checkScrollAfterSelect)
                        ok(Util.getElementScroll($input).left > 0);
                    mouseup = true;
                };
                ActionsAPI.select($input, 3, 33);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 3, 33, false);
                if (checkScrollAfterSelect)
                    ok(Util.getElementScroll($input).left > 0);

                expect(checkScrollAfterSelect ? 9 : 7);
            },
            correctTestWaitingTime(3000)
        );
    });

    asyncTest('backward select and scroll', function () {
        var $input = $(INPUT_SELECTOR),
            oldScroll = null,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $input[0].value = '1234567891012131415161718911200111554454455454545412121212121212';
                $input[0].selectionStart = 0;
                $input[0].selectionEnd = 0;
                $input[0].scrollLeft = 0;
                $input[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    oldScroll = Util.getElementScroll($input).left;
                    if (checkScrollAfterSelect)
                        ok(Util.getElementScroll($input).left > 0);
                    mousedown = true;
                };
                $input[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    if (checkScrollAfterSelect)
                        ok(Util.getElementScroll($input).left < oldScroll);
                    mouseup = true;
                };
                ActionsAPI.select($input, 33, 0);
            },
            function () {
                ok(mousedown, 'select started from input');
                ok(mouseup, 'select ended on input');
                checkSelection($input[0], 0, 33, true);
                if (checkScrollAfterSelect) {
                    ok(Util.getElementScroll($input).left < oldScroll);
                    expect(9);
                }
                else
                    expect(6);
            },
            correctTestWaitingTime(5000)
        );
    });

    module('scroll in textarea');

    asyncTest('forward select and right direction (endPos more than startPos)', function () {
        var $textarea = $(BIG_TEXTAREA_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.css('height', '100px');
                $textarea[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    equal(Util.getElementScroll($textarea).top, 0);
                    mousedown = true;
                };
                $textarea[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    if (checkScrollAfterSelect)
                        ok(Util.getElementScroll($textarea).top > 0);
                    mouseup = true;
                };
                ActionsAPI.select($textarea, 2, 628);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 2, 628, false);

                if (checkScrollAfterSelect) {
                    ok(Util.getElementScroll($textarea).top > 0);
                    expect(9);
                }
                else
                    expect(7);
            },
            correctTestWaitingTime(5000)
        );
    });

    asyncTest('forward select and left direction (endPos less than startPos)', function () {
        var $textarea = $(BIG_TEXTAREA_SELECTOR),
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.css('height', '100px');
                $textarea[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    equal(Util.getElementScroll($textarea).top, 0);
                    mousedown = true;
                };
                $textarea[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    if (checkScrollAfterSelect)
                        ok(Util.getElementScroll($textarea).top > 0);
                    mouseup = true;
                };
                ActionsAPI.select($textarea, 34, 591);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 34, 591, false);

                if (checkScrollAfterSelect)
                    ok(Util.getElementScroll($textarea).top > 0);

                expect(checkScrollAfterSelect ? 9 : 7);
            },
            correctTestWaitingTime(5000)
        );
    });

    asyncTest('backward select and right direction (endPos less than startPos)', function () {
        var $textarea = $(BIG_TEXTAREA_SELECTOR),
            oldScroll = null,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.css('height', '100px');
                $textarea[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    oldScroll = Util.getElementScroll($textarea).top;
                    ok(Util.getElementScroll($textarea).top > 0);
                    mousedown = true;
                };
                $textarea[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    if (checkScrollAfterSelect)
                        ok(Util.getElementScroll($textarea).top < oldScroll);
                    mouseup = true;
                };
                ActionsAPI.select($textarea, 591, 34);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 34, 591, true);

                if (checkScrollAfterSelect)
                    ok(Util.getElementScroll($textarea).top < oldScroll);

                expect(checkScrollAfterSelect ? 9 : 7);
            },
            correctTestWaitingTime(5000)
        );
    });

    asyncTest('backward select and left direction (endPos more than startPos)', function () {
        var $textarea = $(BIG_TEXTAREA_SELECTOR),
            oldScroll = null,
            mousedown = false,
            mouseup = false;
        runAsyncTest(
            function () {
                $textarea.css('height', '100px');
                $textarea[0][Util.hasTouchEvents ? 'ontouchstart' : 'onmousedown'] = function () {
                    oldScroll = Util.getElementScroll($textarea).top;
                    ok(Util.getElementScroll($textarea).top > 0);
                    mousedown = true;
                };
                $textarea[0][Util.hasTouchEvents ? 'ontouchend' : 'onmouseup'] = function () {
                    if (checkScrollAfterSelect)
                        ok(Util.getElementScroll($textarea).top < oldScroll);
                    mouseup = true;
                };
                ActionsAPI.select($textarea, 628, 2);
            },
            function () {
                ok(mousedown, 'select started from textarea');
                ok(mouseup, 'select ended on textarea');
                checkSelection($textarea[0], 2, 628, true);

                if (checkScrollAfterSelect)
                    ok(Util.getElementScroll($textarea).top < oldScroll);

                expect(checkScrollAfterSelect ? 9 : 7);
            },
            correctTestWaitingTime(5000)
        );
    });
});
