/*
var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util,
    Settings = HammerheadClient.get('Settings'),
    UrlUtil = HammerheadClient.get('UrlUtil'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    CursorWidget = TestCafeClient.get('UI.Cursor'),
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    TestRunnerBase = TestCafeClient.get('TestRunner.TestRunnerBase');

Hammerhead.init();

var testIterator = new TestIterator();
ActionsAPI.init(testIterator);

Settings.CROSS_DOMAIN_PROXY_PORT = 1336;

UrlUtil.getOriginUrlObj = function () {
    return {
        protocol: 'http:',
        host: 'origin_parent_host'
    };
};

//Globals
var testRunner = null,
    eq = null,
    inIFrame = null,
    storedIFrameStepExecuted = null,

    clickRaised = false,
    dblclickRaised = false,
    rclickRaised = false,
    selectRaised = false,
    selectionFailed = false,

    $body = $('body'),

    offsetX = null,
    offsetY = null,

    $iframe = null,
    stepCount = 0,
    oldDocumentScroll = null,

    assertionFailed = false,
    errorRaised = false,
    possibleFailCause = false,

    assertionFailedInIFrame = false,
    errorRaisedInIFrame = false,
    possibleFailCauseInIFrame = false,

    sharedData = {};

window.onmessage = function (e) {
    var msg = JSON.parse(e.data).message;

    switch (msg) {
        case'assertionFailed':
            assertionFailedInIFrame = true;
            break;
        case'possibleFailCauseFound':
            possibleFailCauseInIFrame = true;
            break;
        case'onError':
            errorRaisedInIFrame = true;
            break;

        case'clickRaised':
            clickRaised = true;
            break;
        case'dblclickRaised':
            dblclickRaised = true;
            break;
        case'rclickRaised':
            rclickRaised = true;
            break;
        case'dragStart':
            oldDocumentScroll = Util.getElementScroll($(document));
            break;
        case 'selectRaised':
            selectRaised = true;
            break;
        case 'selectionFailed':
            selectionFailed = true;
            break;
    }
};

QUnit.testStart = function () {
    testRunner = new TestRunnerBase();
    initTestRunner();
    eq = testRunner.eq;
    inIFrame = testRunner.inIFrame;
    storedIFrameStepExecuted = testRunner._onIFrameStepExecuted;
    stepCount = 0;
    oldDocumentScroll = null;
};

QUnit.testDone = function () {
    clickRaised = false;
    dblclickRaised = false;
    rclickRaised = false;
    selectRaised = false;
    selectionFailed = false;

    assertionFailed = false;
    errorRaised = false;
    possibleFailCause = false;

    assertionFailedInIFrame = false;
    errorRaisedInIFrame = false;
    possibleFailCauseInIFrame = false;

    offsetX = null;
    offsetY = null;

    sharedData = {};

    $(document).scrollLeft(0);
    $(document).scrollTop(0);
};

//Util
function initTestRunner() {
    testRunner._onError = function (err) {
        errorRaised = err;
    };

    testRunner._onPossibleFailCauseFound = function (err) {
        possibleFailCause = err;
    };

    testRunner._onSetStepsSharedData = function (e) {
        sharedData = e.stepsSharedData;
        e.callback();
    };

    testRunner._onGetStepsSharedData = function (e) {
        e.callback(sharedData);
    };

    testRunner._onNextStepStarted = function (e) {
        e.callback();
    };

    testRunner._prepareStepsExecuting = function (callback) {
        CursorWidget.init();
        callback();
    };

    testRunner._onAssertionFailed = function () {
        assertionFailed = true;
    };
}

function createIFrame(top, width, height, left) {
    var $body = $('body'),
        scrollbarSize = Util.getScrollbarSize();

    $iframe = $('<iframe>');
    $iframe[0].src = window.getCrossDomainPageUrl('test_runner/api_action.html');

    $body.height(1500);

    $iframe.css({
        position: 'absolute',
        margin: '20px',
        border: '20px solid grey',
        top: (top || 1000) + 'px'
    });

    if (left)
        $iframe.css('left', left);

    //NOTE: in old IE and Mozilla iframe's scrollbar may have different widths depends of window theme
    //we must take this into account because we use hardcoded values for check cursor position
    $iframe.height((height || 150) - (scrollbarSize === 16 ? 1 : 0));
    $iframe.width((width || 300) - (scrollbarSize === 16 ? 1 : 0));

    $iframe.appendTo($body[0]);
}

function createInput(top, left) {
    return $('<input/>').css({
        position: 'absolute',
        left: left ? left : '12px',
        top: top ? top : '12px',
        width: '40px',
        height: '40px',
        border: '0px solid black',
        backgroundColor: 'green',
        padding: 0,
        margin: 0
    }).insertBefore($iframe)
}

function checkErrors() {
    ok(!errorRaised, 'there are no errors');
    ok(!possibleFailCause, 'there are no possible fail causes');
    ok(!assertionFailed, 'all assertions were passed');

    ok(!errorRaisedInIFrame, 'there are no errors in iframe');
    ok(!possibleFailCauseInIFrame, 'there are no possible fail causes in iframe');
    ok(!assertionFailedInIFrame, 'all assertions were passed in iframe');
}

module('mouse moves - select');

asyncTest('actions start in document (iframe scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            function () {
                ActionsAPI.click($input);
            },
            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindHandlerForSelectionCheck($('#inputWithScroll'), true);

                act.select($('#inputWithScroll')[0], 1, 13);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $input = $('#inputWithScroll');

                eq($input[0].selectionStart, 1, 'select start correct');
                eq($input[0].selectionEnd, 13, 'select end correct');

                if (!(Util.isMozilla || Util.isIE))
                    ok(Util.getElementScroll($input).left > 0);
            }),
            function () {
                ok(selectRaised);
                ok(!selectionFailed);

                selectRaised = false;

                ActionsAPI.click($input);
            },
            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                unbindHandlerForSelectionCheck($('#inputWithScroll'));

                bindHandlerForSelectionCheck($('#textareaWithScroll'), true);

                act.select($('#textareaWithScroll'), 3, 39);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $textarea = $('#textareaWithScroll');

                eq($textarea[0].selectionStart, 3, 'select start correct');
                eq($textarea[0].selectionEnd, 39, 'select end correct');

                ok(Util.getElementScroll($textarea).top > 0);
            }),
            function () {
                ok(selectRaised);
                ok(!selectionFailed);
            }
        ];

    createIFrame(1000);
    $iframe.css('padding', '20px');

    var $input = createInput(350, 400);

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        $input.remove();
        start();
    });


    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('actions start in iframe (iframe scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindHandlerForSelectionCheck($('#inputWithScroll'), true);

                act.select($('#inputWithScroll')[0], 1, 13);
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $input = $('#inputWithScroll');

                eq($input[0].selectionStart, 1, 'select start correct');
                eq($input[0].selectionEnd, 13, 'select end correct');

                if (!(Util.isMozilla || Util.isIE))
                    ok(Util.getElementScroll($input).left > 0);
            }),

            function () {
                ok(selectRaised);
                ok(!selectionFailed);

                selectRaised = false;

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                unbindHandlerForSelectionCheck($('#inputWithScroll'));

                bindHandlerForSelectionCheck($('#textareaWithScroll'), true);

                act.select($('#textareaWithScroll'), 3, 39);
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $textarea = $('#textareaWithScroll');

                eq($textarea[0].selectionStart, 3, 'select start correct');
                eq($textarea[0].selectionEnd, 39, 'select end correct');

                ok(Util.getElementScroll($textarea).top > 0);
            }),

            function () {
                ok(selectRaised);
                ok(!selectionFailed);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            }
        ];

    createIFrame(1000);
    $iframe.css('padding', '20px');

    var $input = createInput(400, 600);

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        $input.remove();
        start();
    });


    testRunner.act._start(stepNames, steps, 0);
});


asyncTest('actions start in document (both scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            function () {
                ActionsAPI.click($input);
            },
            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindHandlerForSelectionCheck($('#input'), true);

                act.select($('#input'), 1, 3);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                eq($('#input')[0].selectionStart, 1, 'select start correct');
                eq($('#input')[0].selectionEnd, 3, 'select end correct');
            }),
            function () {
                ok(selectRaised);
                ok(!selectionFailed);

                selectRaised = false;

                ActionsAPI.click($input);
            },
            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $input = $('#input');

                unbindHandlerForSelectionCheck($input);
                bindHandlerForSelectionCheck($input, true);

                act.select($input, 0, 2);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                eq($('#input')[0].selectionStart, 0, 'select start correct');
                eq($('#input')[0].selectionEnd, 2, 'select end correct');
            }),
            function () {
                ok(selectRaised);
                ok(!selectionFailed);
            }
        ];

    createIFrame(1000);
    $iframe.css('padding', '20px');
    var $input = createInput();

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        $input.remove();
        start();
    });


    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('actions start in iframe (both scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindHandlerForSelectionCheck($('#textarea'), true);

                act.select($('#textarea'), 1, 7);
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                eq($('#textarea')[0].selectionStart, 1, 'select start correct');
                eq($('#textarea')[0].selectionEnd, 7, 'select end correct');
            }),

            function () {
                ok(selectRaised);
                ok(!selectionFailed);

                selectRaised = false;

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $textarea = $('#textarea');

                unbindHandlerForSelectionCheck($textarea);
                bindHandlerForSelectionCheck($textarea, true);

                act.select($('#textarea'), 3, 5);
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                eq($('#textarea')[0].selectionStart, 3, 'select start correct');
                eq($('#textarea')[0].selectionEnd, 5, 'select end correct');
            }),

            function () {
                ok(selectRaised);
                ok(!selectionFailed);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            }
        ];

    createIFrame(50, 400, 200, 300);
    $iframe.css('padding', '20px');

    var $input = createInput(1100, 300);

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        $input.remove();
        start();
    });


    testRunner.act._start(stepNames, steps, 0);
});*/
