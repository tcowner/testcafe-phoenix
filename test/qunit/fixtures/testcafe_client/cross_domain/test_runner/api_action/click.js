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

module('mouse actions');

asyncTest('rclick without scroll', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                act.rclick($('#forRClick'))
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameScroll(0, 0));
            })
        ];

    createIFrame(100);

    testRunner._onIFrameStepExecuted = function () {
        ok(rclickRaised);
        checkDocumentScroll(0, 0);
        checkCursorPosition(308, 200);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('click with iframe scroll', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                act.click($('#forClick'))
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameScroll(0, 457));
            })
        ];

    createIFrame(100);

    testRunner._onIFrameStepExecuted = function () {
        storedIFrameStepExecuted.call(testRunner);

        ok(clickRaised);
        checkCursorPosition(198, 203);
        checkDocumentScroll(0, 0);

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('rclick with document scroll', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                act.rclick($('#forRClick'))
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameScroll(0, 0));
            })
        ];

    createIFrame(1000);

    testRunner._onIFrameStepExecuted = function () {
        storedIFrameStepExecuted.call(testRunner);

        ok(rclickRaised);
        checkCursorPosition(308, 1100);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };

    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('click with both iframe and document scroll', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                act.click($('#forClick'))
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameScroll(0, 457));
            })
        ];

    createIFrame(1000);

    testRunner._onIFrameStepExecuted = function () {
        storedIFrameStepExecuted.call(testRunner);

        ok(clickRaised);
        checkCursorPosition(198, 1103);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };


    testRunner.act._start(stepNames, steps, 0);
});

asyncTest('dblclick with offsets (with both iframe and document scroll)', function () {
    var stepNames = ['1', '2'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                act.dblclick($('#forDblClick'), {
                    offsetX: 20,
                    offsetY: 15
                })
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameScroll(317, 557));
            })
        ];

    createIFrame(1000);

    testRunner._onIFrameStepExecuted = function () {
        storedIFrameStepExecuted.call(testRunner);

        ok(dblclickRaised);
        checkCursorPosition(251, 1098);
        checkDocumentScrolledTop();

        iFrameStepExecutedFinalize();
    };


    testRunner.act._start(stepNames, steps, 0);
});

module('mouse action sequences');

asyncTest('two actions dblclick + rclick with scroll', function () {
    var documentScroll = null,

        stepNames = ['1', '2', '3'],
        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                act.dblclick($('#forDblClick'))
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameScroll(317, 557));
                act.rclick($('#forRClick'))
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameScroll(200, 0));
            })
        ];

    createIFrame();


    testRunner._onIFrameStepExecuted = function () {
        if (stepCount === 0) {
            ok(dblclickRaised);

            checkCursorPosition(281, 1103);

            documentScroll = Util.getElementScroll($(document));
            checkDocumentScrolledTop();
        }
        else {
            ok(dblclickRaised);
            ok(rclickRaised);

            checkCursorPosition(108, 1100);
            checkDocumentScroll(documentScroll.left, documentScroll.top);
        }

        stepCount++;
        storedIFrameStepExecuted.call(testRunner);
    };


    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();

        ok(dblclickRaised);
        ok(rclickRaised);

        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        start();
    });

    testRunner.act._start(stepNames, steps, 0);
});


module('mouse moves - clicks');

asyncTest('actions start in document (without scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            function () {
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
                bindEventHandlers($div);

                act.click($div);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),
            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(true, true, true, true, Util.isIE);
                checkCursorPosition(440, 240);
                ActionsAPI.click($('input'));
            },
            function () {
                checkTopWindowEventFlags(true, false, true, true, true);
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, true, true));

                var $div = $('#target');
                unbindEventHandlers($('#drag'));
                bindEventHandlers($div);
                act.click($div);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),
            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(true, true, true, true, Util.isIE);
                checkCursorPosition(600, 400);
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
                act.click($('#drag'));
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindEventHandlers($('#drag'));
            }),

            function () {
                checkCursorPosition(440, 240);
                bindEventHandlers($input);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, true, true);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, true, true));

                var $div = $('#target');
                unbindEventHandlers($('#drag'));
                bindEventHandlers($div);

                act.click($div);
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),

            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(true, true, true, true, Util.isIE);
                checkCursorPosition(600, 400);
                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, true, true);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, true, true));
            })
        ];

    createIFrame(100, 500, 350, 300);
    var $input = createInput(50, 400);

    testRunner.on(testRunner.TEST_COMPLETED_EVENT, function () {
        checkErrors();
        testRunner._destroyIFrameBehavior();
        $iframe.remove();
        $input.remove();
        start();
    });


    testRunner.act._start(stepNames, steps, 0);
});


asyncTest('actions start in document (document scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            function () {
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
                bindEventHandlers($div);

                act.click($div);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),
            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(440, 1140);

                ActionsAPI.click($input);
            },
            function () {
                checkTopWindowEventFlags(true, false, true, false, false);
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false));

                var $div = $('#target');
                unbindEventHandlers($('#drag'));
                bindEventHandlers($div);
                act.click($div);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),
            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(600, 1300);
            }
        ];

    createIFrame(1000, 500, 350, 300);
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

asyncTest('actions start in iframe (document scroll)', function () {
    var stepNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],

        steps = [
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                act.click($('#drag'));
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindEventHandlers($('#drag'));
            }),

            function () {
                checkCursorPosition(440, 1140);
                bindEventHandlers($input);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, false, false);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false));

                var $div = $('#target');
                unbindEventHandlers($('#drag'));
                bindEventHandlers($div);

                act.click($div);
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),

            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(600, 1300);
                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, false, false);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false));
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
                ActionsAPI.click($input);
            },
            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                bindEventHandlers($input);
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                var $div = $('#target');
                bindEventHandlers($div);

                act.click($div);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
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
                ok(checkIFrameEventFlags(true, true, true));

                var $div = $('#dragWithScroll');
                unbindEventHandlers($('#target'));
                bindEventHandlers($div);
                act.click($div);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),
            function () {
                checkTopWindowEventFlags(true, true, true, true, false);
                checkCursorPosition(623, 173);
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
                act.click($('#target'));
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindEventHandlers($('#target'));
            }),

            function () {
                checkCursorPosition(600, 213);
                bindEventHandlers($input);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, true, true);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, true, true));

                var $div = $('#dragWithScroll');
                unbindEventHandlers($('#target'));
                bindEventHandlers($div);

                act.click($div);
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),

            function () {
                checkTopWindowEventFlags(true, true, true, true, false);
                checkCursorPosition(623, 223);
                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, true, true);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, true, true));
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
                bindEventHandlers($div);

                act.click($div);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),
            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(440, 1140);

                ActionsAPI.click($input);
            },
            function () {
                checkTopWindowEventFlags(true, false, true, false, false);
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
            },
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false));

                var $div = $('#target');
                unbindEventHandlers($('#drag'));
                bindEventHandlers($div);
                act.click($div);
            }),
            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),
            function () {
                //NOTE: sometimes in IE getElementFromPoint method returns elements cross domain iframe
                checkTopWindowEventFlags(false, false, true, true, Util.isIE);
                checkCursorPosition(600, 1113);
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
                act.click($('#drag'));
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                bindEventHandlers($('#drag'));
            }),

            function () {
                checkCursorPosition(440, 190);
                bindEventHandlers($input);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, false, false);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false));

                var $div = $('#target');
                unbindEventHandlers($('#drag'));
                bindEventHandlers($div);

                act.click($div);
            }),

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(true, false, true));
            }),

            function () {
                checkTopWindowEventFlags(false, false, true, true, false);
                checkCursorPosition(600, 163);

                ActionsAPI.click($input);
            },

            function () {
                eq(CursorWidget.getAbsolutePosition(), Util.findCenter($input[0]), 'check cursor position');
                checkTopWindowEventFlags(true, false, true, false, false);
            },

            inIFrame(function () {
                return $iframe[0];
            }, function () {
                ok(checkIFrameEventFlags(false, false, false));
            })
        ];

    createIFrame(50, 400, 200, 300);

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
