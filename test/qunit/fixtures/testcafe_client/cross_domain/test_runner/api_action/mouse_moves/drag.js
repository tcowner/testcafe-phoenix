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
    elementMouseOver = false,
    elementMouseOut = false,
    bodyMouseOver = false,
    bodyMouseOut = false,
    iFrameMouseOver = false,
    iFrameMouseOut = false,
    iFrameDocumentMouseOver = false,
    iFrameDocumentMouseOut = false,

    offsetX = null,
    offsetY = null,
    eventCoordWrong = false,

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

function createDraggable(left, top) {
    var getValueFromPx = function (px) {
        return parseInt(px.replace('px', ''));
    };

    var startPos,
        startMousePos,
        $draggable = $('<div></div>')
            .attr('id', 'drag')
            .css({
                width: '100px',
                height: '100px',
                position: 'absolute',
                backgroundColor: 'green',
                left: left + 'px',
                top: top + 'px',
                zIndex: 5
            }).bind(Util.isTouchDevice ? 'touchstart' : 'mousedown', function (e) {
                startPos = { x: getValueFromPx($draggable.css('left')),
                    y: getValueFromPx($draggable.css('top')) };

                startMousePos = Util.isTouchDevice ? {
                    x: e.originalEvent.targetTouches[0].pageX || e.originalEvent.touches[0].pageX,
                    y: e.originalEvent.targetTouches[0].pageY || e.originalEvent.touches[0].pageY
                } : {
                    x: e.clientX,
                    y: e.clientY
                };
                $(this).data('dragStarted', true);
            })
            .bind(Util.isTouchDevice ? 'touchend' : 'mouseup', function (e) {
                $(this).data('dragStarted', false);
            })
            .appendTo('body');

    $(document).bind(Util.isTouchDevice ? 'touchmove' : 'mousemove', function (e) {
        var curMousePos = Util.isTouchDevice ? {
            x: e.originalEvent.targetTouches[0].pageX || e.originalEvent.touches[0].pageX,
            y: e.originalEvent.targetTouches[0].pageY || e.originalEvent.touches[0].pageY
        } : {
            x: e.clientX,
            y: e.clientY
        };

        if ($draggable.data('dragStarted')) {
            $draggable.css({
                left: curMousePos.x - 50 + $(window).scrollLeft() + 'px',
                top: curMousePos.y - 50 + $(window).scrollTop() + 'px'
            });
        }
    });
    return $draggable;

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

function mouseOverHandler() {
    elementMouseOver = true;
}

function mouseOutHandler() {
    elementMouseOut = true;
}

function bindEventHandlers($el) {
    $el.bind('mouseover', mouseOverHandler);
    $el.bind('mouseout', mouseOutHandler);

    $body.bind('mouseover', function () {
        bodyMouseOver = true;
    });
    $body.bind('mouseout', function () {
        bodyMouseOut = true;
    });
    $iframe.bind('mouseover', function () {
        iFrameMouseOver = true;
    });
    $iframe.bind('mouseout', function () {
        iFrameMouseOut = true;
    });

    //NOTE: Sometimes in IE actions in top document during move raise for element cross-domain iframe (method getElementFrom Point returns iframe's child)
    if (Util.isIE) {
        try {
            var $iFrameDocumentElement = $($iframe[0].contentWindow.document);

            $iFrameDocumentElement.bind('mouseover', function () {
                iFrameDocumentMouseOver = true;
            });
            $iFrameDocumentElement.bind('mouseout', function () {
                iFrameDocumentMouseOut = true;
            });
        }
        catch (err) {

        }
    }
}

function unbindEventHandlers($el) {
    $el.unbind('mouseover', mouseOverHandler);
    $el.unbind('mouseout', mouseOutHandler);
}

function checkCenterHandler(e) {
    var point = getCurrentPoint(e),
        center = Util.findCenter(e.target);

    eventCoordWrong = ((point.x !== (offsetX !== null ? e.target.offsetLeft + offsetX : center.x)) ||
        (point.y !== (offsetY !== null ? e.target.offsetTop + offsetY : center.y)));
}

function bindCheckCenterHandlers($el) {
    $el.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', checkCenterHandler);
    $el.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', checkCenterHandler);
}

function unbindCheckCenterHandlers($el) {
    $el.unbind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', checkCenterHandler);
    $el.unbind(Util.hasTouchEvents ? 'touchend' : 'mouseup', checkCenterHandler);
}

function clearEventFlags() {
    elementMouseOver = false;
    elementMouseOut = false;
    bodyMouseOver = false;
    bodyMouseOut = false;
    iFrameMouseOver = false;
    iFrameMouseOut = false;
    iFrameDocumentMouseOver = false;
    iFrameDocumentMouseOut = false;
}

function checkTopWindowEventFlags(inputOver, inputOut, bodyOver, iFrameOver, iFrameOut) {
    var result = elementMouseOver === inputOver && elementMouseOut === inputOut && bodyMouseOver === bodyOver;

    if (!Util.isIE)
        result = result && iFrameMouseOver === iFrameOver && iFrameMouseOut === iFrameOut;
    else
    //NOTE: Sometimes in IE actions in top document during move raise for element cross-domain iframe (method getElementFrom Point returns iframe's child)
        result = result && ((iFrameMouseOver === iFrameOver && iFrameMouseOut === iFrameOut) || (iFrameDocumentMouseOver === iFrameOver && iFrameDocumentMouseOut === iFrameOut));

    ok(result, 'mouse events are correct');

    clearEventFlags();
}

module('mouse moves - drag');

asyncTest('actions start in document (without scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            function () {
                bindCheckCenterHandlers($input);

                ActionsAPI.click($input);
            },
            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                bindEventHandlers($input);
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $div = $('#drag'),
                    $target = $('#target');

                bindEventHandlers($div);
                bindCheckCenterHandlers($div);

                act.drag($div, $target);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),
            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(true, true, true, true, Util.isIE);
                checkCursorPosition(600, 400);

                ActionsAPI.click($('input'));
            },
            function () {
                checkTopWindowEventFlags(true, false, true, true, true);
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, true, true, true));

                var $div = $('#drag');
                act.drag($div, -160, -160);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(!eventCoordWrong, 'all events in iframe were generated with correct coordinates');
                eq(getCenter($('#drag')[0]), {x: 100, y: 100}, 'element is in the right position');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),
            function () {
                ok(!eventCoordWrong, 'all events were generated with correct coordinates');
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(true, true, true, true, Util.isIE);
                checkCursorPosition(440, 240);
            }
        ];

    createIFrame(100, 500, 350, 300);
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

asyncTest('actions start in iframe (without scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $drag = $('#drag');
                bindCheckCenterHandlers($drag);

                act.drag($drag, $('#target'));
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                bindEventHandlers($('#drag'));
            }),

            function () {
                checkCursorPosition(600, 400);
                bindEventHandlers($input);
                bindCheckCenterHandlers($input);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, true, true);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, true, true, true));

                offsetX = 20;
                offsetY = 30;

                act.drag($('#drag'), -130, -140, {
                    offsetX: offsetX,
                    offsetY: offsetY
                });
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                eq(getCenter($('#drag')[0]), {x: 100, y: 100}, 'element is in the right position');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),

            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(true, true, true, true, Util.isIE);
                checkCursorPosition(440, 240);
                ActionsAPI.click($input);
            },

            function () {
                ok(!eventCoordWrong, 'all events were generated with correct coordinates');
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, true, true);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(!eventCoordWrong, 'all events in iframe were generated with correct coordinates');
                ok(checkIFrameEventFlags(true, true, true, true));
            })
        ];

    createIFrame(100, 500, 350, 300);
    var $input = createInput(50, 400);

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        $input.remove();
        eventCoordWrong = false;
        start();
    });


    testRunner.act._start(stepNames, steps, 0);
});


asyncTest('actions start in document (document scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            function () {
                bindCheckCenterHandlers($firstInput);
                ActionsAPI.click($firstInput);
            },
            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($firstInput[0]), 'check cursor position');
                bindEventHandlers($firstInput);
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $div = $('#drag');
                bindEventHandlers($div);
                bindCheckCenterHandlers($div);

                act.drag($div, $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),
            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(600, 1300);

                unbindEventHandlers($firstInput);
                bindEventHandlers($secondInput);

                unbindCheckCenterHandlers($firstInput);
                bindCheckCenterHandlers($secondInput);
                ActionsAPI.click($secondInput);
            },
            function () {
                checkTopWindowEventFlags(true, false, true, false, false);
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($secondInput[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false, true));

                var $div = $('#drag');
                act.drag($div, -160, -160);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(!eventCoordWrong, 'all events in iframe were generated with correct coordinates');
                eq(getCenter($('#drag')[0]), {x: 100, y: 100}, 'element is in the right position');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),
            function () {
                ok(!eventCoordWrong, 'all events were generated with correct coordinates');
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(440, 1140);
            }
        ];

    createIFrame(1000, 500, 350, 300);
    var $firstInput = createInput(),
        $secondInput = createInput(50, 500);

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        $firstInput.remove();
        $secondInput.remove();
        start();
    });


    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('actions start in iframe (document scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $drag = $('#drag');
                bindCheckCenterHandlers($drag);

                offsetX = 70;
                offsetY = 15;

                act.drag($drag, $('#target'), {
                    offsetX: offsetX,
                    offsetY: offsetY
                });
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                bindEventHandlers($('#drag'));
            }),

            function () {
                checkCursorPosition(600, 1300);
                bindEventHandlers($input);
                bindCheckCenterHandlers($input);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, false, false);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false, true));

                offsetX = 70;
                offsetY = 15;

                act.drag($('#drag'), -180, -125, {
                    offsetX: offsetX,
                    offsetY: offsetY
                });
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                eq(getCenter($('#drag')[0]), {x: 100, y: 100}, 'element is in the right position');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),

            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(440, 1140);
                ActionsAPI.click($input);
            },

            function () {
                ok(!eventCoordWrong, 'all events were generated with correct coordinates');
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, false, false);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(!eventCoordWrong, 'all events in iframe were generated with correct coordinates');
                ok(checkIFrameEventFlags(false, false, false, true));
            })
        ];

    createIFrame(1000, 500, 350, 300);

    var $input = createInput(50, 800);

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        $input.remove();
        start();
    });


    testRunner.act._start(stepNames, steps, 0);
});


asyncTest('actions start in document (iframe scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            function () {
                bindCheckCenterHandlers($input);
                ActionsAPI.click($input);
            },
            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                bindEventHandlers($input);
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $div = $('#drag');
                bindCheckCenterHandlers($div);
                bindEventHandlers($div);

                act.drag($div, $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),
            function () {
                checkTopWindowEventFlags(true, true, true, true, false);
                checkCursorPosition(600, 163);

                ActionsAPI.click($('input'));
            },
            function () {
                checkTopWindowEventFlags(true, false, true, true, true);
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, true, true, true));

                var $div = $('#dragWithScroll');

                unbindEventHandlers($('#drag'));
                bindEventHandlers($div);

                unbindCheckCenterHandlers($('#drag'));
                bindCheckCenterHandlers($div);

                act.drag($div, $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(!eventCoordWrong, 'all events in iframe were generated with correct coordinates');
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),
            function () {
                ok(!eventCoordWrong, 'all events were generated with correct coordinates');
                checkCursorPosition(533, 200);
                checkTopWindowEventFlags(true, true, true, true, false);
            }
        ];

    createIFrame(50, 400, 200, 300);

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
                var $div = $('#dragWithScroll');
                bindCheckCenterHandlers($div);

                offsetX = 90;
                offsetY = 5;

                act.drag($div, $('#target'), {
                    offsetX: offsetX,
                    offsetY: offsetY
                });
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                bindEventHandlers($('#dragWithScroll'));
            }),

            function () {
                checkCursorPosition(533, 250);
                bindEventHandlers($input);
                bindCheckCenterHandlers($input);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, true, true);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, true, true, true));

                offsetX = 5;
                offsetY = 95;

                act.drag($('#dragWithScroll'), 135, 145, {
                    offsetX: offsetX,
                    offsetY: offsetY
                });
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                eq(getCenter($('#dragWithScroll')[0]), {x: 350, y: 450}, 'element is in the right position');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),

            function () {
                checkTopWindowEventFlags(true, true, true, true, false);
                checkCursorPosition(623, 273);
                ActionsAPI.click($input);
            },

            function () {
                ok(!eventCoordWrong, 'all events were generated with correct coordinates');
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, true, true);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(!eventCoordWrong, 'all events in iframe were generated with correct coordinates');
                ok(checkIFrameEventFlags(true, true, true, true));
            })
        ];

    createIFrame(100, 400, 200, 300);

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
                bindCheckCenterHandlers($input);
                ActionsAPI.click($input);
            },
            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                bindEventHandlers($input);
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $div = $('#drag');
                bindCheckCenterHandlers($div);
                bindEventHandlers($div);

                act.drag($div, $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),
            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(600, 1113);

                ActionsAPI.click($input);
            },
            function () {
                checkTopWindowEventFlags(true, false, true, false, false);
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false, true));

                var $oldDrag = $('#drag'),
                    $div = $('#dragWithScroll');

                unbindEventHandlers($oldDrag);
                bindEventHandlers($div);

                unbindCheckCenterHandlers($oldDrag);
                bindCheckCenterHandlers($div);

                act.drag($div, $('#target'));
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(!eventCoordWrong, 'all events in iframe were generated with correct coordinates');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),
            function () {
                ok(!eventCoordWrong, 'all events were generated with correct coordinates');
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(533, 1150);
            }
        ];

    createIFrame(1000, 400, 200, 300);
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
                var $div = $('#drag');

                offsetX = 40;
                offsetY = 30;

                bindCheckCenterHandlers($div);
                act.drag($('#drag'), 170, 180, {
                    offsetX: offsetX,
                    offsetY: offsetY
                });
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#drag')[0], $('#target')[0]), 'element is in the target');
                bindEventHandlers($('#drag'));
            }),

            function () {
                checkCursorPosition(600, 223);
                bindEventHandlers($firstInput);

                offsetX = 15;
                offsetY = 5;

                ActionsAPI.click($firstInput, {
                    offsetX: offsetX,
                    offsetY: offsetY
                });
            },

            function () {
                //NOTE: in IE over top document's element recognition increment isn't added
                checkCursorPosition(315, 1105, true);
                checkTopWindowEventFlags(true, false, true, false, false);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false, true));

                var $oldDiv = $('#drag'),
                    $div = $('#dragWithScroll');

                offsetX = 60;
                offsetY = 70;

                unbindEventHandlers($oldDiv);
                bindEventHandlers($div);

                unbindCheckCenterHandlers($oldDiv);
                bindCheckCenterHandlers($div);

                act.drag($div, -90, -190, {
                    offsetX: offsetX,
                    offsetY: offsetY
                });
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(isInTarget($('#dragWithScroll')[0], $('#target')[0]), 'element is in the target');
                ok(checkIFrameEventFlags(true, false, true, true));
            }),

            function () {
                checkTopWindowEventFlags(false, false, true, true, false);
                checkCursorPosition(533, 140);

                unbindEventHandlers($firstInput);
                bindEventHandlers($secondInput);

                unbindCheckCenterHandlers($firstInput);
                bindCheckCenterHandlers($secondInput);

                offsetX = 5;
                offsetY = 35;

                ActionsAPI.click($secondInput, {
                    offsetX: offsetX,
                    offsetY: offsetY
                });
            },

            function () {
                ok(!eventCoordWrong, 'all events were generated with correct coordinates');
                //NOTE: in IE over top document's element recognition increment isn't added
                checkCursorPosition(705, 1135, true);
                checkTopWindowEventFlags(true, false, true, false, false);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(!eventCoordWrong, 'all events in iframe were generated with correct coordinates');
                ok(checkIFrameEventFlags(false, false, false, true));
            })
        ];

    createIFrame(50, 400, 200, 300);

    var $firstInput = createInput(1100, 300),
        $secondInput = createInput(1100, 700);


    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        $firstInput.remove();
        $secondInput.remove();
        start();
    });


    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('drag top document\'s child over cross-domain iframe', function () {
    var stepNames = ['1', '2', '3', '4'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindEventHandlers($('#drag'));
            }),
            function () {
                var $drag = $('#drag');

                bindCheckCenterHandlers($drag);

                ActionsAPI.drag($drag, 700, 250);
            },
            function () {
                eq(Util.findCenter($('#drag')[0]), {x: 800, y: 350}, 'element is in the right position');
                checkCursorPosition(800, 350, true);
                ok(!eventCoordWrong);
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                //NOTE: no one action was generated  for cross domain iframe's children, because
                //drag occurred only over top document
                checkIFrameEventFlags(false, false, false);
            })
        ];

    createIFrame(100, 300, 300, 250);
    var $topDraggable = createDraggable(50, 50);

    testRunner._onIFrameStepExecuted = function () {
        checkDocumentScroll(0, 0);

        if (stepCount !== 0)
            $topDraggable.remove();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});
*/
