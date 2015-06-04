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
var RECOGNITION_INCREMENT = Util.isIE ? 1 : 0;


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

function checkCursorPosition(x, y, skipRecognitionInc) {
    deepEqual(CursorWidget.getAbsolutePosition(), {
        x: x + (skipRecognitionInc ? 0 : RECOGNITION_INCREMENT),
        y: y + (skipRecognitionInc ? 0 : RECOGNITION_INCREMENT)
    }, 'check cursor position');
}

function checkErrors() {
    ok(!errorRaised, 'there are no errors');
    ok(!possibleFailCause, 'there are no possible fail causes');
    ok(!assertionFailed, 'all assertions were passed');

    ok(!errorRaisedInIFrame, 'there are no errors in iframe');
    ok(!possibleFailCauseInIFrame, 'there are no possible fail causes in iframe');
    ok(!assertionFailedInIFrame, 'all assertions were passed in iframe');
}

function getCurrentPoint(e) {
    return Util.hasTouchEvents ? {
        x: e.originalEvent.targetTouches[0].pageX || e.originalEvent.touches[0].pageX,
        y: e.originalEvent.targetTouches[0].pageY || e.originalEvent.touches[0].pageY
    } : {
        x: e.pageX,
        y: e.pageY };
}


module('drag without scrolling during dragging');

asyncTest('drag to target, without scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#drag').bind(Util.hasTouchEvents ? 'touchstart' : '', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 100, ' X coordinate correct');
                    eq(point.y, 100, ' X coordinate correct');
                });

                act.drag($('#drag'), $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(0, 0, true));
            })
        ];

    createIFrame(50, 400, 400);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(308, 350);
        checkDocumentScroll(0, 0, true);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag to target, with iframe scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#dragWithScroll').bind(Util.hasTouchEvents ? 'touchstart' : '', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 350, ' X coordinate correct');
                    eq(point.y, 450, ' X coordinate correct');
                });

                act.drag($('#dragWithScroll'), $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(67, 167, true));
            })
        ];

    createIFrame(50, 400, 400);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(241, 183);
        checkDocumentScroll(0, 0, true);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag to target, with document scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#drag').bind(Util.hasTouchEvents ? 'touchstart' : '', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 100, ' X coordinate correct');
                    eq(point.y, 100, ' X coordinate correct');
                });

                act.drag($('#drag'), $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(0, 0, true));
            })
        ];

    createIFrame(1000, 400, 400);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(308, 1300);
        checkDocumentScrolledTop(true);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag to target, with both iframe and document scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#dragWithScroll').bind(Util.hasTouchEvents ? 'touchstart' : '', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 370, ' X coordinate correct');
                    eq(point.y, 415, ' X coordinate correct');
                });

                act.drag($('#dragWithScroll'), $('#target'), {
                    offsetX: 70,
                    offsetY: 15
                });
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(67, 167, true));
            })
        ];

    createIFrame(1000, 400, 400);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(241, 1133);
        checkDocumentScrolledTop(true);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag with dragOffsets, without scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#drag').bind(Util.hasTouchEvents ? 'touchstart' : '', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 100, ' X coordinate correct');
                    eq(point.y, 100, ' X coordinate correct');
                });

                act.drag($('#drag'), 160, 160);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(0, 0, true));
            })
        ];

    createIFrame(50, 400, 400);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(308, 350);
        checkDocumentScroll(0, 0, true);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag with dragOffsets, with iframe scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#dragWithScroll').bind(Util.hasTouchEvents ? 'touchstart' : '', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 350, ' X coordinate correct');
                    eq(point.y, 450, ' X coordinate correct');
                });

                act.drag($('#dragWithScroll'), -90, -190);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(67, 167, true));
            })
        ];

    createIFrame(50, 400, 400);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(241, 183);
        checkDocumentScroll(0, 0, true);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag with dragOffsets, with document scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#drag').bind(Util.hasTouchEvents ? 'touchstart' : '', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 80, ' X coordinate correct');
                    eq(point.y, 90, ' X coordinate correct');
                });

                act.drag($('#drag'), 180, 170, {
                    offsetX: 30,
                    offsetY: 40
                });
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(0, 0, true));
            })
        ];

    createIFrame(1000, 400, 400);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(308, 1300);
        checkDocumentScrolledTop(true);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag with dragOffsets, with both iframe and document scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#dragWithScroll').bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 390, 'mousedown X coordinate correct');
                    eq(point.y, 480, 'mousedown X coordinate correct');
                });

                act.drag($('#dragWithScroll'), -130, -220, {
                    offsetX: 90,
                    offsetY: 80
                });
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(67, 167, true));
            })
        ];

    createIFrame(1000, 400, 400);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(241, 1133);
        checkDocumentScrolledTop(true);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});


module('drag with scrolling during dragging');

asyncTest('drag to target, without scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#drag').bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 100, 'mousedown X coordinate correct');
                    eq(point.y, 100, 'mousedown X coordinate correct');
                });

                act.drag($('#drag'), $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(87, 87));
                var iFrameScroll = Util.getElementScroll($(document));
                ok(iFrameScroll.left > oldIFrameScroll.left && iFrameScroll.top > oldIFrameScroll.top, 'iframe scroll changed during dragging');
            })
        ];

    createIFrame(50, 300, 300);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(221, 263);
        checkDocumentScroll(0, 0);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag to target, with iframe scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#dragWithScroll').bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 350, 'mousedown X coordinate correct');
                    eq(point.y, 450, 'mousedown X coordinate correct');
                });

                act.drag($('#dragWithScroll'), $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(150, 150));
                var iFrameScroll = Util.getElementScroll($(document));
                ok(iFrameScroll.left < oldIFrameScroll.left && iFrameScroll.top < oldIFrameScroll.top, 'iframe scroll changed during dragging');
            })
        ];

    createIFrame(50, 250, 250);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(158, 200);
        checkDocumentScroll(0, 0);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag to target, with document scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#drag').bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 55, 'mousedown X coordinate correct');
                    eq(point.y, 145, 'mousedown X coordinate correct');
                });

                act.drag($('#drag'), $('#target'), {
                    offsetX: 5,
                    offsetY: 95
                });
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(87, 87));

                var iFrameScroll = Util.getElementScroll($(document));
                ok(iFrameScroll.left > oldIFrameScroll.left && iFrameScroll.top > oldIFrameScroll.top, 'iframe scroll changed during dragging');
            })
        ];

    createIFrame(1000, 300, 300);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(221, 1213);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag to target, with both iframe and document scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#dragWithScroll').bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 315, 'mousedown X coordinate correct');
                    eq(point.y, 470, 'mousedown X coordinate correct');
                });

                act.drag($('#dragWithScroll'), $('#target'), {
                    offsetX: 15,
                    offsetY: 70
                });
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(150, 150));

                var iFrameScroll = Util.getElementScroll($(document));
                ok(iFrameScroll.left < oldIFrameScroll.left && iFrameScroll.top < oldIFrameScroll.top, 'iframe scroll changed during dragging');
            })
        ];

    createIFrame(1000, 250, 250);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(158, 1150);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});


asyncTest('drag with dragOffsets, without scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#drag').bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 100, 'mousedown X coordinate correct');
                    eq(point.y, 100, 'mousedown X coordinate correct');
                });

                act.drag($('#drag'), 160, 160);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(77, 77));
                var iFrameScroll = Util.getElementScroll($(document));
                ok(iFrameScroll.left > oldIFrameScroll.left && iFrameScroll.top > oldIFrameScroll.top, 'iframe scroll changed during dragging');
            })
        ];

    createIFrame(50, 250, 250);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(231, 273);
        checkDocumentScroll(0, 0);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag with dragOffsets, with iframe scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#dragWithScroll').bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 350, 'mousedown X coordinate correct');
                    eq(point.y, 450, 'mousedown X coordinate correct');
                });

                act.drag($('#dragWithScroll'), -90, -190);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(210, 210));
                var iFrameScroll = Util.getElementScroll($(document));
                ok(iFrameScroll.left < oldIFrameScroll.left && iFrameScroll.top < oldIFrameScroll.top, 'iframe scroll changed during dragging');
            })
        ];

    createIFrame(50, 200, 200);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(98, 140);
        checkDocumentScroll(0, 0);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag with dragOffsets, with document scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#drag').bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 80, 'mousedown X coordinate correct');
                    eq(point.y, 90, 'mousedown X coordinate correct');
                });

                act.drag($('#drag'), 180, 170, {
                    offsetX: 30,
                    offsetY: 40
                });
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(77, 77));
                var iFrameScroll = Util.getElementScroll($(document));
                ok(iFrameScroll.left > oldIFrameScroll.left && iFrameScroll.top > oldIFrameScroll.top, 'iframe scroll changed during dragging');
            })
        ];

    createIFrame(1000, 250, 250);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(231, 1223);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag with dragOffsets, with both iframe and document scroll to element', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                $('#dragWithScroll').bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
                    var point = getCurrentPoint(e);
                    eq(point.x, 390, 'mousedown X coordinate correct');
                    eq(point.y, 480, 'mousedown X coordinate correct');
                });

                act.drag($('#dragWithScroll'), -130, -220, {
                    offsetX: 90,
                    offsetY: 80
                });
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameScroll(210, 210));
                var iFrameScroll = Util.getElementScroll($(document));
                ok(iFrameScroll.left < oldIFrameScroll.left && iFrameScroll.top < oldIFrameScroll.top, 'iframe scroll changed during dragging');
            })
        ];

    createIFrame(1000, 200, 200);

    testRunner._onIFrameStepExecuted = function () {
        checkCursorPosition(98, 1090);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});*/
