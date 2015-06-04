var Hammerhead    = HammerheadClient.get('Hammerhead'),
    IFrameSandbox = HammerheadClient.get('DOMSandbox.IFrame'),
    $             = Hammerhead.$,
    async         = Hammerhead.async,
    Transport     = TestCafeClient.get('Base.Transport'),
    TestIterator  = TestCafeClient.get('TestRunner.TestIterator'),
    SharedErrors  = TestCafeClient.get('Shared.Errors'),
    Settings      = TestCafeClient.get('Settings'),
    ActionsAPI    = TestCafeClient.get('TestRunner.API.Actions'),
    TextSelection = Hammerhead.TextSelection,
    Automation    = TestCafeClient.get('Automation'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Util          = Hammerhead.Util,
    CursorWidget  = TestCafeClient.get('UI.Cursor');

Hammerhead.init();
Automation.init();
ActionBarrier.init();
CursorWidget.init();

var testIterator = new TestIterator();
ActionsAPI.init(testIterator);

$(document).ready(function () {
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

    testIterator.on(TestIterator.ERROR_EVENT, function (err) {
        testIterator.state.stoppedOnFail = false;
        currentErrorCode                 = err.code;
        currentSourceIndex               = err.__sourceIndex;
    });

    var asyncActionCallback,
        currentErrorCode   = null,
        currentSourceIndex = null,
        $input,
        $iFrame,

        //constants
        TEST_ELEMENT_CLASS = 'testElement',

        //utils
        createIFrame       = function ($element, src, callback) {
            $iFrame = $('<iframe/>')
                .attr('src', src)
                .css({
                    width:  '600px',
                    height: '600px'
                })
                .addClass(TEST_ELEMENT_CLASS);
            $element.addClass(TEST_ELEMENT_CLASS);

            var onLoadHandler = function () {
                $($iFrame[0].contentWindow.document.body).append($element);
                $iFrame.unbind('load', onLoadHandler);
                callback();
            };

            $iFrame.bind('load', onLoadHandler);
            $iFrame.appendTo($('body'));
        },

        runAsyncTest       = function (actions, assertions, timeout) {
            var callbackFunction = function () {
                clearTimeout(timeoutId);
                assertions();
                start();
            };
            asyncActionCallback  = function () {
                callbackFunction();
            };
            actions();
            var timeoutId        = setTimeout(function () {
                callbackFunction = function () {
                };
                ok(false, 'Timeout is exceeded');
                start();
            }, timeout);
        };

    var handler = function (e) {
        if (e.iframe.id.indexOf('test') !== -1) {
            e.iframe.contentWindow.eval.call(e.iframe.contentWindow, [
                'HammerheadClient.define(\'Settings\', function (require, exports) {',
                '    exports.JOB_OWNER_TOKEN = "ownerToken";',
                '    exports.JOB_UID = "jobUid";',
                '});',
                'var UrlUtil = HammerheadClient.get("UrlUtil");',
                'UrlUtil.OriginLocation.get = function() { return "https://example.com"; };',
                'HammerheadClient.get(\'Hammerhead\').init();'
            ].join(''));
        }
    };

    //tests
    QUnit.testStart = function () {
        $input              = $('<input type="text" id="input" class="input"/>').addClass(TEST_ELEMENT_CLASS).appendTo($('body'));
        $input[0].value     = 'test';
        $input[0].focus();
        TextSelection.select($input[0], 4, 4);
        asyncActionCallback = function () {
        };
        IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
        IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);
    };

    QUnit.testDone = function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
        currentErrorCode             = null;
        currentSourceIndex           = null;
        Settings.ENABLE_SOURCE_INDEX = false;
        IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
    };

    module('events raising');

    asyncTest('events raising with shortcut', function () {
        var keydownCount    = 0,
            keyupCount      = 0,
            keypressCount   = 0,
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
            });
        runAsyncTest(
            function () {
                ActionsAPI.press('ctrl+a backspace');
            },
            function () {
                equal(keydownCount, 3, 'keydown event raises twice');
                equal(keyupCount, 3, 'keyup event raises twice');
                equal(keypressCount, Util.isMozilla ? 2 : 0, 'keypress event raises twice');
            },
            3000
        );
    });

    module('shortcuts');

    asyncTest('select all', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('ctrl+a');
            },
            function () {
                equal($input[0].value, TextSelection.getSelectedText($input[0]), 'all text selected');
                equal($input[0].value, 'test', 'text is not changed');
            },
            1000
        );
    });

    asyncTest('shortcut must not be raised when preventDefault called', function () {
        $input.keydown(function (e) {
            e.preventDefault();
        });
        runAsyncTest(
            function () {
                ActionsAPI.press('ctrl+a');
            },
            function () {
                notEqual($input[0].value, TextSelection.getSelectedText($input[0]), 'text not selected');
                equal($input[0].value, 'test', 'text is not changed');
            },
            1000
        );
    });

    asyncTest('"backspace" command removes last symbol', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('backspace');
            },
            function () {
                equal($input[0].value, 'tes', 'symbol removed');
            },
            1000
        );
    });

    asyncTest('"ctrl+a backspace" removes all text', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('ctrl+a backspace');
            },
            function () {
                equal($input[0].value, '', 'text removed');
            },
            1000
        );
    });

    asyncTest('"ctrl+a delete" removes all text', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('ctrl+a delete');
            },
            function () {
                equal($input[0].value, '', 'text removed');
            },
            1000
        );
    });

    asyncTest('left', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('left backspace');
            },
            function () {
                equal($input[0].value, 'tet', 'press left done');
            },
            1000
        );
    });

    asyncTest('right', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('left left right backspace');
            },
            function () {
                equal($input[0].value, 'tet', 'press left done');
            },
            1500
        );
    });

    asyncTest('home', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('home delete');
            },
            function () {
                equal($input[0].value, 'est', 'press home done');
            },
            1000
        );
    });

    asyncTest('end', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('home end backspace');
            },
            function () {
                equal($input[0].value, 'tes', 'press end done');
            },
            1000
        );
    });

    asyncTest('press a', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('left a');
            },
            function () {
                equal($input[0].value, 'tesat');
            },
            1000
        );
    });

    asyncTest('press +', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('+ shift++');
            },
            function () {
                equal($input[0].value, 'test++');
            },
            2000
        );
    });

    asyncTest('press space', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('left space');
            },
            function () {
                equal($input[0].value, 'tes t');
            },
            1000
        );
    });

    asyncTest('press shift+a', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('shift+a');
            },
            function () {
                equal($input[0].value, 'testA');
            },
            1000
        );
    });

    asyncTest('press shift+1', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('shift+1');
            },
            function () {
                equal($input[0].value, 'test!');
            },
            1000
        );
    });

    asyncTest('press tab', function () {
        Util.getActiveElement().blur();
        $('body').focus();
        $input.attr('tabIndex', 1);
        runAsyncTest(
            function () {
                ActionsAPI.press('tab');
            },
            function () {
                deepEqual(Util.getActiveElement(), $input[0]);
            },
            1000
        );
    });

    asyncTest('press tab with tabIndexes', function () {
        var $input2 = $('<input type="text" id="$input2" class="input"/>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo($('body'))
            .attr('tabIndex', 1);
        $input.attr('tabIndex', 2);
        Util.getActiveElement().blur();
        $('body').focus();
        runAsyncTest(
            function () {
                ActionsAPI.press('tab');
            },
            function () {
                deepEqual(Util.getActiveElement(), $input2[0]);
            },
            1000
        );
    });

    asyncTest('press tab with iframe', function () {
        var $iframe      = $('<iframe id="test1" src="about:blank"/>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo($('body'));
        var $iframeInput = $('<input type="text" id="iframeInput"/>')
            .addClass(TEST_ELEMENT_CLASS);
        $($iframe.contents()[0]).find('body').append($iframeInput);

        Util.getActiveElement().blur();
        $input.focus();

        runAsyncTest(
            function () {
                ActionsAPI.press('tab');
            },
            function () {
                ok(Util.getActiveElement() !== $input[0]);
            },
            1000
        );
    });

    module('Regression tests');
    asyncTest('T178354', function () {
        Util.getActiveElement().blur();
        $('body').focus();
        $input.attr('tabIndex', 1);
        runAsyncTest(
            function () {
                ActionsAPI.press('tab');
            },
            function () {
                deepEqual(Util.getActiveElement(), $input[0]);
                equal($input[0].selectionStart, 0);
                equal($input[0].selectionEnd, $input[0].value.length);
            },
            1000
        );
    });

    asyncTest('B238757 - It is impossible to record and run \'press\' action with \'+\' key', function () {
        runAsyncTest(
            function () {
                ActionsAPI.press('+');
            },
            function () {
                equal($input[0].value, 'test+');
            },
            1000
        );
    });

    asyncTest('B253200 - TestCafe doesn\'t emulate browsers behavior for press "enter" key on the focused HyperLink editor (link with href)', function () {
        var iFrameSrc = '/data/test_runner/test.html',
            linkHref  = '/data/focus_blur_change/test_iframe.html',
            $link     = $('<a>Link</a>').attr('href', linkHref),
            clicked   = false;

        var testActions = function () {
            runAsyncTest(
                function () {
                    $link.click(function () {
                        clicked = true;
                    });
                    equal($iFrame[0].contentWindow.location.pathname, '/ownerToken!jobUid!iframe/https://example.com/data/test_runner/test.html');
                    $link.focus();

                    //NOTE: we need set timeout for waiting of focus in IE

              window.setTimeout(function () {
                        equal(Util.getActiveElement(), $link[0]);
                        ActionsAPI.press('enter');
                    }, 500);

                },
                function () {
                    equal($iFrame[0].contentWindow.location.pathname, '/ownerToken!jobUid/https://example.com/data/focus_blur_change/test_iframe.html');
                    ok(clicked);
                },
                2000
            );
        };

        createIFrame($link, iFrameSrc, testActions);
    });

    asyncTest('B253200 - TestCafe doesn\'t emulate browsers behavior for press "enter" key on the focused HyperLink editor (link with javascript)', function () {
        var iFrameSrc = '/data/test_runner/test.html';

        var $link   = $('<a>Link</a>').attr('href', 'javascript: window.location.href = "/data/focus_blur_change/test_iframe.html"'),
            clicked = false;

        var testActions = function () {
            runAsyncTest(
                function () {
                    $link.click(function () {
                        clicked = true;
                    });
                    equal($iFrame[0].contentWindow.location.pathname, '/ownerToken!jobUid!iframe/https://example.com/data/test_runner/test.html');
                    $link.focus();

                    //NOTE: we need set timeout for waiting of focus in IE
                    window.setTimeout(function () {
                        equal(Util.getActiveElement(), $link[0]);
                        ActionsAPI.press('enter');
                    }, 500);
                },
                function () {
                    equal($iFrame[0].contentWindow.location.pathname, '/ownerToken!jobUid!iframe/https://example.com/data/focus_blur_change/test_iframe.html');
                    ok(clicked);
                },
                2000
            );
        };

        createIFrame($link, iFrameSrc, testActions);
    });

    module('parse keys string');

    asyncTest('press correct symbol', function () {
        ActionsAPI.press('a');
        setTimeout(function () {
            equal(currentErrorCode, null);
            start();
        }, 300);
    });

    asyncTest('press correct symbol with spaces', function () {
        ActionsAPI.press(' a  ');
        setTimeout(function () {
            equal(currentErrorCode, null);
            start();
        }, 300);
    });

    asyncTest('press correct keys combination', function () {
        ActionsAPI.press('g h g+h  f t');
        setTimeout(function () {
            equal(currentErrorCode, null);
            start();
        }, 300);
    });

    asyncTest('press correct keys combination with shortcuts', function () {
        ActionsAPI.press('g home g+h  f t left+right');
        setTimeout(function () {
            equal(currentErrorCode, null);
            start();
        }, 300);
    });

    asyncTest('press incorrect keys combination', function () {
        Settings.ENABLE_SOURCE_INDEX = true;
        ActionsAPI.press('incorrect', '#11');
        setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_INCORRECT_PRESS_ACTION_ARGUMENT);
            equal(currentSourceIndex, 11);

            start();
        }, 300);
    });
});
