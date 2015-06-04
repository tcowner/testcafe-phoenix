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

//Const
var SELECTION_COORDINATE_INDENT = 10;


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


function iFrameStepExecutedFinalize(endStepNumber) {
    if (stepCount === endStepNumber || (typeof endStepNumber === 'undefined' && stepCount !== 0)) {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        start();
    }

    stepCount++;
    storedIFrameStepExecuted.call(testRunner);
}

function checkDocumentScroll(left, top, checkOldValue) {
    var documentScroll = Util.getElementScroll($(document));

    deepEqual(documentScroll, {
        left: left,
        top: top
    }, 'document scrolled correctly');

    if (checkOldValue)
        deepEqual(documentScroll, oldDocumentScroll, 'document scroll did not change during dragging');
}

function checkDocumentScrolledTop(checkOldValue) {
    var documentScroll = Util.getElementScroll($(document));
    ok(documentScroll.left === 0, 'document scrolled left correctly');
    ok(documentScroll.top > 0, 'document scrolled top correctly');

    if (checkOldValue)
        deepEqual(documentScroll, oldDocumentScroll, 'document scroll did not change during dragging');
}

function checkCursorPositionWithIndent(x, y) {
    //NOTE: we use indent because selection has different ranges in all browsers
    var cursorPosition = CursorWidget.getAbsolutePosition();

    if (cursorPosition) {
        ok(cursorPosition.x > x - SELECTION_COORDINATE_INDENT && cursorPosition.x < x + SELECTION_COORDINATE_INDENT, 'cursor coordinate X correct');
        ok(cursorPosition.y > y - SELECTION_COORDINATE_INDENT && cursorPosition.y < y + SELECTION_COORDINATE_INDENT, 'cursor coordinate Y correct');
    }
}

function checkErrors() {
    ok(!errorRaised, 'there are no errors');
    ok(!possibleFailCause, 'there are no possible fail causes');
    ok(!assertionFailed, 'all assertions were passed');

    ok(!errorRaisedInIFrame, 'there are no errors in iframe');
    ok(!possibleFailCauseInIFrame, 'there are no possible fail causes in iframe');
    ok(!assertionFailedInIFrame, 'all assertions were passed in iframe');
}

module('select actions');

asyncTest('in input without scroll', function () {
    var stepNames = ['1', '2'],
        steps = [
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
                ok(checkIFrameScroll(0, 0));
            })
        ];

    createIFrame(100, 300, 250);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkDocumentScroll(0, 0);
        checkCursorPositionWithIndent(116, 355);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('in input with iframe scroll', function () {
    var stepNames = ['1', '2'],
        steps = [
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
                ok(checkIFrameScroll(0, 147));
            })
        ];

    createIFrame(100);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkDocumentScroll(0, 0);
        checkCursorPositionWithIndent(116, 208);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('in input with document scroll', function () {
    var stepNames = ['1', '2'],
        steps = [
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
                ok(checkIFrameScroll(0, 0));
            })
        ];

    createIFrame(1000, 300, 250);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkCursorPositionWithIndent(116, 1255);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('in input with both iframe and document scroll', function () {
    var stepNames = ['1', '2'],
        steps = [
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
                ok(checkIFrameScroll(0, 147));
            })
        ];

    createIFrame(1000);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkCursorPositionWithIndent(116, 1108);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});


asyncTest('in textarea without scroll', function () {
    var stepNames = ['1', '2'],
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
                ok(checkIFrameScroll(0, 0));
            })
        ];

    createIFrame(100, 350, 400);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkDocumentScroll(0, 0);
        checkCursorPositionWithIndent(154, 406);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('in textarea with iframe scroll', function () {
    var stepNames = ['1', '2'],
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
                ok(checkIFrameScroll(0, 217));
            })
        ];

    createIFrame(100, 350);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkDocumentScroll(0, 0);
        checkCursorPositionWithIndent(154, 189);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('in textarea with document scroll', function () {
    var stepNames = ['1', '2'],
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
                ok(checkIFrameScroll(0, 0));
            })
        ];

    createIFrame(1000, 350, 400);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkCursorPositionWithIndent(154, 1306);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('in textarea with both iframe and document scroll', function () {
    var stepNames = ['1', '2'],
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
                ok(checkIFrameScroll(0, 217));
            })
        ];

    createIFrame(1000, 350);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkCursorPositionWithIndent(154, 1089);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});


asyncTest('in input with scroll during selection (with both iframe and document scroll)', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindHandlerForSelectionCheck($('#inputWithScroll'), true);

                act.select($('#inputWithScroll'), 1, 13);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $input = $('#inputWithScroll');

                eq($input[0].selectionStart, 1, 'select start correct');
                eq($input[0].selectionEnd, 13, 'select end correct');

                if (!(Util.isMozilla || Util.isIE))
                    ok(Util.getElementScroll($input).left > 0);

                ok(checkIFrameScroll(0, 587));
            })
        ];

    createIFrame(1000);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkCursorPositionWithIndent(138, 1118);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('in textarea with scroll during selection (with both iframe and document scroll)', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
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

                ok(checkIFrameScroll(0, 667));
            })
        ];

    createIFrame(1000);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkCursorPositionWithIndent(178, 1123);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('select in contentditable element with both scroll', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindHandlerForSelectionCheck($('#contentedit'), true);

                act.select($('#contentedit'), 8, 50);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var element = $('#contentedit')[0],
                    startNode = element.childNodes[0],
                    endNode = element.childNodes[2];

                ok(checkSelection(element, startNode, 8, endNode, 13));
                ok(checkIFrameScroll(0, 717));
            })
        ];

    createIFrame(1000, 300, 250);

    testRunner._onIFrameStepExecuted = function () {
        ok(selectRaised);
        ok(!selectionFailed);

        checkDocumentScrolledTop();
        checkCursorPositionWithIndent(162, 1214);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});*/
