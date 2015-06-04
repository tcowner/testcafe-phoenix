var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
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

ActionsAPI.ELEMENT_AVAILABILITY_WAITING_TIMEOUT = 400;

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

    var asyncActionCallback,
        currentErrorCode = null,
        currentSourceIndex = null,
        $input,

    //constants
        TEST_ELEMENT_CLASS = 'testElement',

    //utils
        runAsyncTest = function (actions, assertions, timeout) {
            var callbackFunction = function () {
                clearTimeout(timeoutId);
                assertions();
                start();
            };
            asyncActionCallback = function () {
                callbackFunction();
            };
            actions();
            var timeoutId = setTimeout(function () {
                callbackFunction = function () {
                };
                ok(false, 'Timeout is exceeded');
                start();
            }, timeout);
        };


    //tests
    QUnit.testStart = function () {
        $input = $('<input type="text" id="input" class="input"/>').addClass(TEST_ELEMENT_CLASS).appendTo($('body'));
        actionTargetWaitingCounter = 0;
        actionRunCounter = 0;
    };

    QUnit.testDone = function () {
        $('body').focus();

        $('.' + TEST_ELEMENT_CLASS).remove();
        currentErrorCode = null;
        currentSourceIndex = null;
        Settings.ENABLE_SOURCE_INDEX = false;
    };

    asyncTest('typetext events', function () {
        var keydownCount = 0,
            keyupCount = 0,
            keypressCount = 0,
            mouseclickCount = 0;

        $input.keydown(
            function () {
                keydownCount++;
            }).keyup(
            function () {
                keyupCount++;
            }).keypress(
            function () {
                keypressCount++;
            }).click(function () {
                mouseclickCount++;
            });
        runAsyncTest(
            function () {
                ActionsAPI.type($input, 'HI');
            },
            function () {
                equal(keydownCount, 2, 'keydown event raises twice');
                equal(keyupCount, 2, 'keyup event raises twice');
                equal(keypressCount, 2, 'keypress event raises twice');
                equal(mouseclickCount, 1, 'click event raises once');
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
            },
            3000
        );
    });

    asyncTest('input value changed', function () {
        $('<input type="text" id="input1" class="input"/>').addClass(TEST_ELEMENT_CLASS).appendTo($('body'));
        var $inputs = $('.' + TEST_ELEMENT_CLASS),
            text = 'Hello, world!';
        runAsyncTest(
            function () {
                ActionsAPI.type($inputs, text);
            },
            function () {
                equal($inputs[0].value, text, 'first elements value setted');
                equal($inputs[1].value, text, 'second elements value setted');
            },
            5000
        );
    });

    asyncTest('correct keyCode', function () {
        var key = 'k';
        $input[0].onkeypress = function (e) {
            equal((e || window.event).keyCode, key.charCodeAt(0), 'keypress event argument is correct');
        };
        runAsyncTest(
            function () {
                ActionsAPI.type($input, key);
            },
            function () {
                expect(1);
            },
            2000
        );
    });

    asyncTest('typetext to inner input', function () {
        var $outerDiv = $('<div></div>')
                .css({
                    width: '100px',
                    height: '50px'
                })
                .addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            text = 'Hi';
        $input.appendTo($outerDiv);
        runAsyncTest(
            function () {
                ActionsAPI.type($outerDiv, text);
            },
            function () {
                equal($input[0].value, text, 'text to inner input has been written')
            },
            2000
        );
    });

    asyncTest('do not click when element is focused', function () {
        var clickCount = 0,
            text = 'test';
        $input.click(function () {
            clickCount++;
        });
        $input[0].focus();
        runAsyncTest(
            function () {
                ActionsAPI.type($input, text);
            },
            function () {
                equal(clickCount, 0);
                equal($input[0].value, text, 'text to inner input has been written')
            },
            3000
        );
    });

    asyncTest('by default type command concats new text with the old one', function () {
        var newText = 'new text',
            oldText = 'old text';
        $input[0].value = oldText;
        runAsyncTest(
            function () {
                ActionsAPI.type($input, newText);
            },
            function () {
                equal($input[0].value, oldText.concat(newText), 'new text concated with the old one');
            },
            2000
        );
    });

    asyncTest('set option.replace to true to replace current text', function () {
        var text = 'new text';
        $input[0].value = 'old text';
        runAsyncTest(
            function () {
                ActionsAPI.type($input, text, {replace: true});
            },
            function () {
                equal($input[0].value, text, 'old text replaced');
            },
            2000
        );
    });

    asyncTest('empty first argument raises error', function () {
        Settings.ENABLE_SOURCE_INDEX = true;
        asyncActionCallback = function () {
        };
        ActionsAPI.type($('#nonExistentElement'), 'text', '#213');
        setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_EMPTY_FIRST_ARGUMENT, 'correct error code is sent');
            equal(currentSourceIndex, 213);
            start();
        }, ActionsAPI.ELEMENT_AVAILABILITY_WAITING_TIMEOUT + 100);
    });

    asyncTest('empty "text" argument raises error', function () {
        Settings.ENABLE_SOURCE_INDEX = true;
        asyncActionCallback = function () {
        };

        ActionsAPI.type($input, '', '#218');

        setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_EMPTY_TYPE_ACTION_ARGUMENT, 'correct error code is sent');
            equal(currentSourceIndex, 218);
            start();
        }, 500);
    });

    asyncTest('do not change readonly inputs value', function () {
        var $input1 = $('<input type="text" readonly />').addClass(TEST_ELEMENT_CLASS).appendTo($('body')),
            $input2 = $('<input type="text" value="value" />').attr('readonly', 'readonly').addClass(TEST_ELEMENT_CLASS).appendTo($('body')),
            oldInput1Val = $input1.val(),
            oldInput2Val = $input2.val();
        runAsyncTest(
            function () {
                ActionsAPI.type([$input1, $input2], 'test');
            },
            function () {
                ok($input1.val() === oldInput1Val);
                ok($input2.val() === oldInput2Val);
            },
            5000
        );
    });

    module('regression tests');

    asyncTest('input event raising (B253410)', function () {
        var $input = $('<input type="text" />').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            $div = $('<div></div>').addClass(TEST_ELEMENT_CLASS).appendTo('body');

        runAsyncTest(
            function () {
                $input.bind('input', function (e) {
                    $div.text($div.text() + $input.val());
                    $input.val('');
                });
                ActionsAPI.type($input, 'test');
            },
            function () {
                equal($div.text(), 'test');
                equal($input.val(), '');
            },
            5000
        );
    });

    asyncTest('change event must not be raised if keypress was prevented (B253816)', function () {
        var $input = $('<input type="text" />').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            changed = false;

        $input.bind('change', function () {
            changed = true;
        });

        asyncActionCallback = function () {
            $input[0].blur();

            ok(changed, 'check change event was raised if keypress was not prevented');
            changed = false;
            $input.bind('keypress', function (e) {
                e.target.value += String.fromCharCode(e.keyCode);
                return false;
            });
            asyncActionCallback = function () {
                $input[0].blur();

                ok(!changed, 'check change event was not raised if keypress was prevented');

                start();
            };

            ActionsAPI.type($input, 'new');
        };

        ActionsAPI.type($input, 'test');
    });

    asyncTest('keypress args must contain charCode of the symbol, not keyCode', function () {
        var $input = $('<input type="text" />').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            symbol = '!',
            charCode = 33,
            keyCode = 49;

        runAsyncTest(
            function () {
                $input.bind('keypress', function (e) {
                    equal(e.keyCode, charCode, 'keyCode on keypress checked');
                    equal(e.charCode, charCode, 'charCode on keypress checked');
                });
                $input.bind('keydown', function (e) {
                    equal(e.keyCode, keyCode, 'keyCode on keydown checked');
                });
                ActionsAPI.type($input, '!');
            },
            function () {
                equal($input.val(), '!', 'input value checked');
            },
            5000
        );
    });

    asyncTest('T138385 - input type="number" leave out "maxlength" attribute (act.type)', function () {
        var $input = $('<input type="number" maxlength="2"/>').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            inputEventCount = 0;

        runAsyncTest(
            function () {
                $input.bind('input', function () {
                    inputEventCount++;
                });
                ActionsAPI.type($input, '123');
            },
            function () {
                equal(inputEventCount, 3);
                equal($input.val(), Util.isIE ? '12' : '123');
            },
            5000
        );
    });

    asyncTest('T138385 - input type "number" leave out "maxlength" attribute (act.press)', function () {
        var $input = $('<input type="number" maxlength="2"/>').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            inputEventCount = 0;

        runAsyncTest(
            function () {
                $input.bind('input', function () {
                    inputEventCount++;
                });
                $input.focus();

                ActionsAPI.press('1 2 3');
            },
            function () {
                equal(inputEventCount, 3);
                equal($input.val(), Util.isIE ? '12' : '123');
            },
            5000
        );
    });

    asyncTest('T138385 - "input" event is raised if symbol count more than "maxlength" attribute (act.type)', function () {
        var $input = $('<input type="text" maxlength="3"/>').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            inputEventCount = 0;

        runAsyncTest(
            function () {
                $input.bind('input', function () {
                    inputEventCount++;
                });
                ActionsAPI.type($input, 'test');
            },
            function () {
                equal(inputEventCount, 4);
                equal($input.val(), 'tes');
            },
            5000
        );
    });

    asyncTest('T138385 - "input" event is raised if symbol count more than "maxlength" attribute (act.press)', function () {
        var $input = $('<input type="text" maxlength="3"/>').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            inputEventCount = 0;

        runAsyncTest(
            function () {
                $input.bind('input', function () {
                    inputEventCount++;
                });

                $input.focus();

                ActionsAPI.press('t e s t');
            },
            function () {
                equal(inputEventCount, 4);
                equal($input.val(), 'tes');
            },
            5000
        );
    });

    asyncTest('T239547: TD15.1 - Playback problems on https://jsfiddle.net/', function () {
        var $input = $('<input type="text" />').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            charCode = 45,
            keyCode = Util.isMozilla ? 173 : 189;

        runAsyncTest(
            function () {
                $input.bind('keypress', function (e) {
                    equal(e.keyCode, charCode, 'keyCode on keypress checked');
                    equal(e.charCode, charCode, 'charCode on keypress checked');
                });
                $input.bind('keydown', function (e) {
                    equal(e.keyCode, keyCode, 'keyCode on keydown checked');
                });
                ActionsAPI.type($input, '-');
            },
            function () {
                equal($input.val(), '-', 'input value checked');
            },
            5000
        );
    });
});
