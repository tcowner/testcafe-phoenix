var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    CursorWidget = TestCafeClient.get('UI.Cursor'),
    Automation = TestCafeClient.get('Automation'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Settings = TestCafeClient.get('Settings'),
    Util = Hammerhead.Util;

Hammerhead.init();
ActionBarrier.init();
Automation.init();
CursorWidget.init();

var testIterator = new TestIterator();
ActionsAPI.init(testIterator);

var correctTestWaitingTime = function (time) {
    if (Util.isTouchDevice && Util.isMozilla)
        return time * 2;

    return time;
};

ActionsAPI.ELEMENT_AVAILABILITY_WAITING_TIMEOUT = 400;

var TEST_COMPLETE_WAITING_TIMEOUT = 2000,
    ERROR_WAITING_TIMEOUT = ActionsAPI.ELEMENT_AVAILABILITY_WAITING_TIMEOUT + 50;

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
        currentActionSourceIndex = err.__sourceIndex;

        if (err.element)
            currentErrorElement = err.element;
    });

    var $el = null,
        currentErrorCode = null,
        currentErrorElement = null,
        currentActionSourceIndex = null,
    //constants
        TEST_ELEMENT_CLASS = 'testElement',
        TEST_DIV_CONTAINER_CLASS = 'testContainer',

    //utils
        asyncActionCallback,

        addInputElement = function (type, id, x, y) {
            var elementString = ['<input type="', type, '" id="', id, '" value="', id, '" />'].join('');
            return $(elementString)
                .css({
                    position: 'absolute',
                    marginLeft: x + 'px',
                    marginTop: y + 'px'
                })
                .addClass(type)
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo('body');
        },

        createDiv = function () {
            return $('<div />');
        },

        addDiv = function (x, y) {
            return createDiv()
                .css({
                    position: 'absolute',
                    left: x,
                    top: y,
                    border: '1px solid black'
                })
                .width(150)
                .height(150)
                .addClass(TEST_ELEMENT_CLASS)
                .appendTo('body');
        },

        addContainer = function (width, height, outerElement) {
            return createDiv()
                .css({
                    border: '1px solid black',
                    padding: '5px',
                    overflow: 'auto'
                })
                .width(width)
                .height(height)
                .addClass(TEST_ELEMENT_CLASS)
                .addClass(TEST_DIV_CONTAINER_CLASS)
                .appendTo(outerElement);
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

    //tests
    QUnit.testStart = function () {
        $el = addInputElement('button', 'button1', Math.floor(Math.random() * 100),
            Math.floor(Math.random() * 100));
        asyncActionCallback = function () {
        };

        actionTargetWaitingCounter = 0;
        actionRunCounter = 0;
    };

    QUnit.testDone = function () {
        if (!$.browser.msie)
            removeTestElements();

        Settings.ENABLE_SOURCE_INDEX = false;
        currentErrorCode = null;
        currentErrorElement = null;
        currentActionSourceIndex = null;
    };

    module('different arguments tests');
    asyncTest('dom element as a parameter', function () {
        var clicked = false;
        runAsyncTest(
            function () {
                $el.click(function () {
                    clicked = true;
                });
                $el.bind('mousedown', function () {
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter($el[0]), 'check cursor position');
                });
                ActionsAPI.click($el[0]);
            },
            function () {
                ok(clicked, 'click raised');
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
                expect(4);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('jQuery object as a parameter', function () {
        var clicked = false;
        runAsyncTest(
            function () {
                $el.click(function () {
                    clicked = true;
                });
                $el.bind('mousedown', function () {
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter($el[0]), 'check cursor position');
                });
                ActionsAPI.click($el);
            },
            function () {
                ok(clicked, 'click raised');
                expect(2);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('jQuery object with two elements as a parameter', function () {
        var clicksCount = 0;
        runAsyncTest(
            function () {
                addInputElement('button', 'button2', 150, 150);
                var $elements = $('.button')
                    .click(function () {
                        clicksCount++;
                    })
                    .bind('mousedown', function () {
                        deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                    });
                ActionsAPI.click($elements);
            },
            function () {
                equal(clicksCount, 2, 'both elements click events were raised');
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('dom elements array as a parameter', function () {
        var firstElementClickRaised = false,
            secondElementClickRaised = false;
        runAsyncTest(
            function () {
                $el.css({
                    marginLeft: '120px',
                    marginTop: '120px'
                });
                var $el2 = addInputElement('button', 'button2', 150, 150);
                $el.click(function (e) {
                    firstElementClickRaised = true
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                });
                $el2.click(function (e) {
                    secondElementClickRaised = true
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                });
                ActionsAPI.click([$el[0], $el2[0]]);
            },
            function () {
                ok(firstElementClickRaised && secondElementClickRaised, 'both elements click events were raised');
                equal(actionTargetWaitingCounter, 1);
                equal(actionRunCounter, 1);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('jQuery objects array as a parameter', function () {
        var clicksCount = 0;
        runAsyncTest(
            function () {
                $el.css({
                    marginLeft: '130px',
                    marginTop: '130px'
                });
                addInputElement('button', 'button2', 150, 150);
                var $el3 = addInputElement('input', 'input1', 170, 170);
                $('.' + TEST_ELEMENT_CLASS)
                    .click(function () {
                        clicksCount++;
                    })
                    .bind('mousedown', function () {
                        deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                    });
                ActionsAPI.click([$('.button'), $el3]);
            },
            function () {
                equal(clicksCount++, 3, 'three elements click events were raised');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('empty first argument raises error', function () {
        Settings.ENABLE_SOURCE_INDEX = true;
        ActionsAPI.click($('#nonExistentElement'), '#24');
        setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_EMPTY_FIRST_ARGUMENT);
            equal(currentActionSourceIndex, 24);
            startNext();
        }, ERROR_WAITING_TIMEOUT);
    });

    asyncTest('invisible first argument raises error', function () {
        Settings.ENABLE_SOURCE_INDEX = true;
        $el.css('visibility', 'hidden');
        ActionsAPI.click($el, '#32');
        setTimeout(function () {
            $el.css('visibility', '');
            equal(currentErrorCode, SharedErrors.API_INVISIBLE_ACTION_ELEMENT);
            equal(currentErrorElement, Util.getElementDescription($el[0]));
            equal(currentActionSourceIndex, 32);

            startNext();
        }, correctTestWaitingTime(ERROR_WAITING_TIMEOUT));
    });

    asyncTest('some elements created after click on the first one', function () {
        var secondElementClicked = false,
            thirdElementClicked = false,
            newTestClass = 'newTestClass';

        $('#button1').click(function () {
            deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
        });

        $el.click(function () {
            addInputElement('button', 'button2', 150, 150).addClass(newTestClass).click(function () {
                secondElementClicked = true;
                deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
            });

            addInputElement('button', 'button3', 200, 200)
                .addClass(newTestClass)
                .bind('mousedown', function () {
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                })
                .bind('click', function () {
                    thirdElementClicked = true;
                });
        });

        runAsyncTest(function () {
                ActionsAPI.click(['.' + TEST_ELEMENT_CLASS, '.' + newTestClass]);
            },
            function () {
                ok(secondElementClicked, 'second element clicked');
                ok(thirdElementClicked, 'third element clicked');
                expect(5);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT));
    });

    asyncTest('expected element are not created after first click error', function () {
        Settings.ENABLE_SOURCE_INDEX = true;

        asyncActionCallback = function () {
        };

        ActionsAPI.click([$el, '#nonExistentElementId'], '#271');

        setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_EMPTY_FIRST_ARGUMENT);
            equal(currentActionSourceIndex, 271);

            startNext();
        }, correctTestWaitingTime(ERROR_WAITING_TIMEOUT * 2));
    });

    asyncTest('function as a first argument', function () {
        var secondElementClicked = false,
            thirdElementClicked = false,
            newTestClass = 'newTestClass';

        $el.click(function () {
            addInputElement('button', 'button2', 150, 150).addClass(newTestClass).click(function () {
                secondElementClicked = true;
                deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
            });
            addInputElement('button', 'button3', 200, 200).addClass(newTestClass).click(function () {
                thirdElementClicked = true;
                deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
            });
        });
        runAsyncTest(function () {
                var getArguments = function () {
                    return ['.' + TEST_ELEMENT_CLASS, '.' + newTestClass];
                };
                ActionsAPI.click(getArguments);
            },
            function () {
                ok(secondElementClicked, 'second element clicked');
                ok(thirdElementClicked, 'third element clicked');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT));
    });

    module('dom events tests');

    asyncTest('mouse events raised', function () {
        var mousedownRaised = false,
            mouseupRaised = false,
            clickRaised = false;
        runAsyncTest(
            function () {
                $el.mousedown(function (e) {
                    mousedownRaised = true;
                    ok(!mouseupRaised && !clickRaised, 'mousedown event was raised first');
                });
                $el.mouseup(function () {
                    mouseupRaised = true;
                    ok(mousedownRaised && !clickRaised, 'mouseup event was raised second');
                });
                $el.click(function () {
                    clickRaised = true;
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                    ok(mousedownRaised && mouseupRaised, 'click event was raised third ');
                });
                ActionsAPI.click($el[0]);
            },
            function () {
                ok(mousedownRaised && mousedownRaised && clickRaised, 'mouse events were raised');
                expect(5);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    if (!Util.hasTouchEvents) {
        asyncTest('over and move events on elements during moving', function () {
            var overed = false,
                entered = false,
                moved = false;

            runAsyncTest(
                function () {
                    $el.css({
                        marginTop: '100px',
                        marginLeft: '100px',
                        zIndex: 2
                    });
                    $el.mouseover(function () {
                        overed = true;
                    });
                    $el.mouseenter(function () {
                        //B234358
                        entered = true;
                    });
                    $el.mousemove(function () {
                        moved = true;
                    });
                    ActionsAPI.click($el[0]);
                },
                function () {
                    ok(overed && moved && entered, 'mouse moving events were raised');
                },
                correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
            );
        });
    }

    module('click on scrollable element in some scrolled containers');

    asyncTest('scroll down and click with offset', function () {
        var clicked = false;
        removeTestElements();
        runAsyncTest(
            function () {
                var $div1 = addContainer(500, 200, 'body'),
                    $div2 = addContainer(450, 510, $div1),
                    $div3 = addContainer(400, 620, $div2),
                    $div4 = addContainer(350, 1230, $div3),
                    offsetY = 2350,
                    containerBorders = Util.getBordersWidth($div4),
                    containerPadding = Util.getElementPadding($div4);

                createDiv().addClass(TEST_ELEMENT_CLASS)
                    .css({
                        marginTop: offsetY - containerPadding.top - containerBorders.top + 'px',
                        width: '100%',
                        height: '1px',
                        backgroundColor: '#ff0000'
                    })
                    .bind('mousedown', function () {
                        clicked = true;
                    })
                    .appendTo($div4);

                createDiv().addClass(TEST_ELEMENT_CLASS)
                    .css({
                        height: '20px',
                        width: '20px',
                        marginTop: 50 + 'px',
                        backgroundColor: '#ffff00'
                    })
                    .appendTo($div4);

                ActionsAPI.click($div4[0], {offsetX: 100, offsetY: offsetY});
            },
            function () {
                ok(clicked, 'click was raised');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT * 2)
        );
    });

    asyncTest('scroll up and click with offset', function () {
        var clicked = false;
        removeTestElements();
        runAsyncTest(
            function () {
                var $div1 = addContainer(500, 200, 'body'),
                    $div2 = addContainer(450, 510, $div1),
                    $div3 = addContainer(400, 620, $div2),
                    $div4 = addContainer(350, 1230, $div3),
                    offsetY = 50,
                    containerBorders = Util.getBordersWidth($div4),
                    containerPadding = Util.getElementPadding($div4);

                createDiv().addClass(TEST_ELEMENT_CLASS)
                    .css({
                        marginTop: offsetY - containerPadding.top - containerBorders.top + 'px',
                        width: '100%',
                        height: '1px',
                        backgroundColor: '#ff0000'
                    })
                    .bind('mousedown', function (e) {
                        clicked = true;
                    })
                    .appendTo($div4);

                createDiv().addClass(TEST_ELEMENT_CLASS)
                    .css({
                        height: '20px',
                        width: '20px',
                        marginTop: 2350 + 'px',
                        backgroundColor: '#ffff00'
                    })
                    .appendTo($div4);
                $div1.scrollTop(322);
                $div2.scrollTop(322);
                $div3.scrollTop(322);
                $div4.scrollTop(1186);

                ActionsAPI.click($div4[0], {offsetX: 100, offsetY: offsetY});
            },
            function () {
                ok(clicked, 'click was raised');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT * 2)
        );
    });

    module('other functional tests');

    asyncTest('click on element in scrolled container', function () {
        var clicked = false;
        runAsyncTest(
            function () {
                var $div = addDiv(200, 200)
                    .width(150)
                    .height(150)
                    .css({
                        overflow: 'scroll'
                    });

                var $button = $('<input type="button">')
                    .addClass(TEST_ELEMENT_CLASS)
                    .css({marginTop: '400px', marginLeft: '80px'})
                    .bind('mousedown', function () {
                        clicked = true;
                        deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                    })
                    .appendTo($div);
                ActionsAPI.click($button[0]);
            },
            function () {
                ok(clicked, 'click was raised');
                expect(2);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('click after scrolling', function () {
        var clicked = false;
        runAsyncTest(
            function () {
                $el.css({'marginTop': '1000px'})
                    .click(function () {
                        clicked = true;
                    })
                    .bind('mousedown', function () {
                        deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                    });
                //moving scroll to start position for a next test
                ActionsAPI.click([$el[0], addDiv(200, 500)]);
            },
            function () {
                ok(clicked, 'click after scrolling was raised');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT * 3)
        );
    });

    asyncTest('focusing on click', function () {
        var focused = false;

        runAsyncTest(
            function () {
                $el.css({display: 'none'});
                var $input = addInputElement('text', 'input', 150, 150);
                $input.focus(function () {
                    focused = true;
                });
                ActionsAPI.click($input[0]);
            },
            function () {
                ok(focused, 'clicked element focused');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('double click in the same position', function () {
        var clicksCount = 0,
            el = $el[0];
        $el.click(function () {
            clicksCount++;
            deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
        });
        asyncActionCallback = function () {
            asyncActionCallback = function () {
            };
            ActionsAPI.click(el);
        };
        ActionsAPI.click(el);
        setTimeout(function () {
            equal(clicksCount, 2, 'click event was raised twice');
            equal(actionTargetWaitingCounter, 2);
            equal(actionRunCounter, 2);
            startNext();
        }, correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT));
    });

    asyncTest('click with options keys', function () {
        var focused = false,
            alt = false,
            shift = false,
            ctrl = false,
            meta = false;

        runAsyncTest(
            function () {
                $el.css({display: 'none'});
                var $input = addInputElement('text', 'input', 150, 150);
                $input.focus(function () {
                    focused = true;
                });
                $input.click(function (e) {
                    alt = e.altKey;
                    ctrl = e.ctrlKey;
                    shift = e.shiftKey;
                    meta = e.metaKey;
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                });
                ActionsAPI.click($input[0], {
                    alt: true,
                    ctrl: true,
                    shift: true,
                    meta: true
                });
            },
            function () {
                ok(focused, 'clicked element focused');
                ok(alt, 'alt key is pressed');
                ok(shift, 'shift key is pressed');
                ok(ctrl, 'ctrl key is pressed');
                ok(meta, 'meta key is pressed');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('cancel bubble', function () {
        var divClicked = false,
            btnClicked = false;

        runAsyncTest(
            function () {
                $el.css({marginTop: '100px', marginLeft: '100px'});
                $el[0].onclick = function (e) {
                    e = e || window.event;
                    e.cancelBubble = true;
                    btnClicked = true;
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                };
                var $div = addDiv(100, 100)
                    .width(150)
                    .height(150)
                    .click(function () {
                        divClicked = true;
                    });
                $el.appendTo($div);
                ActionsAPI.click($el[0]);
            },
            function () {
                equal(btnClicked, true, 'button clicked');
                equal(divClicked, false, 'bubble canceled');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('click on outer element raises event for inner element', function () {
        var divClicked = false,
            btnClicked = false;

        runAsyncTest(
            function () {
                var $div = addDiv(400, 400)
                    .width(70)
                    .height(30)
                    .click(function () {
                        divClicked = true;
                    });
                $el.css({
                    marginTop: '10px',
                    marginLeft: '10px',
                    position: 'relative'
                })
                    .click(function () {
                        btnClicked = true;
                    })
                    .appendTo($div);
                ActionsAPI.click($div[0]);
            },
            function () {
                equal(btnClicked, true, 'button clicked');
                equal(divClicked, true, 'div clicked');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('regression');
    asyncTest('Q558721 - Test running hangs if element is hidden in non-scrollable container', function () {
        var clickRaised = false,
            $container = $('<div></div>')
                .addClass(TEST_ELEMENT_CLASS)
                .css({
                    width: 100,
                    height: 100,
                    overflow: 'hidden'
                })
                .appendTo('body'),

            $button = $('<button>Button</button>')
                .css({
                    position: 'relative',
                    left: -5200
                })
                .click(function () {
                    clickRaised = true;
                }).appendTo($container);


        runAsyncTest(
            function () {
                ActionsAPI.click($button);
            },
            function () {
                equal(clickRaised, true, 'button clicked');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('B253520 - Blur event is not raised during click playback if previous active element becomes invisible via css on mousedown handler in IE9', function () {
        var $input = $('<input type="text"/>').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            $button = $('<input type="button"/>').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            inputBlurHandled = false,
            waitUntilCssApply = function () {
                if ($input[0].getBoundingClientRect().width > 0) {
                    var timeout = 2,
                        startSeconds = (new Date()).getSeconds(),
                        endSeconds = (startSeconds + timeout) % 60;

                    while ($input[0].getBoundingClientRect().width > 0)
                        if ((new Date()).getSeconds() > endSeconds)
                            break;
                }
            };

        $input.blur(function () {
            inputBlurHandled = true;
        });
        $button.mousedown(function () {
            $input.css('display', 'none');
            //sometimes (in IE9 for example) element becomes invisible not immediately after css set, we should stop our code and wait
            waitUntilCssApply();
        });

        runAsyncTest(
            function () {
                $input[0].focus();
                ActionsAPI.click($button);
            },
            function () {
                ok(inputBlurHandled, 'check that input blur event was handled');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('mouseup should be called asynchronously after mousedown', function () {
        var timeoutCalled = false,
            mouseupCalled = false;

        runAsyncTest(
            function () {
                $el.bind('mousedown', function () {
                    window.setTimeout(function () {
                        timeoutCalled = true;
                    }, 0);
                });

                $el.bind('mouseup', function () {
                    mouseupCalled = true;
                    ok(timeoutCalled, 'check timeout setted in mousedown handler was called before mouseup');
                });

                ActionsAPI.click($el);
            },
            function () {
                ok(mouseupCalled, 'check mouseup was called');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('T163678 - A Click action on a link with a line break does not work', function () {
        var $box = $('<div></div>').css('width', '128px').appendTo($('body')),
            $link = $('<a href="javascript:void(0);">why do I have to break</a>').appendTo($box),
            clicked = false;

        runAsyncTest(
            function () {
                $box.addClass(TEST_ELEMENT_CLASS);
                $link.click(function () {
                    clicked = true;
                });

                ActionsAPI.click($link);
            },
            function () {
                ok(clicked, 'check mouseup was called');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('T224332 - TestCafe problem with click on links in popup menu (click on link with span inside without offset)', function () {
        var $box = $('<div></div>').css('width', '128px').appendTo($('body')),
            $link = $('<a href="javascript:void(0);"></a>').appendTo($box),
            $span = $('<span>why do I have to break</span>').appendTo($link),
            clicked = false;

        runAsyncTest(
            function () {
                $('input').remove();
                $box.addClass(TEST_ELEMENT_CLASS);
                $link.click(function () {
                    clicked = true;
                });

                ActionsAPI.click($link);
            },
            function () {
                ok(clicked, 'check mouseup was called');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('T224332 - TestCafe problem with click on links in popup menu (click on span inside the link without offset)', function () {
        var $box = $('<div></div>').css('width', '128px').appendTo($('body')),
            $link = $('<a href="javascript:void(0);"></a>').appendTo($box),
            $span = $('<span>why do I have to break</span>').appendTo($link),
            clicked = false;

        runAsyncTest(
            function () {
                $box.addClass(TEST_ELEMENT_CLASS);
                $link.click(function () {
                    clicked = true;
                });

                ActionsAPI.click($span);
            },
            function () {
                ok(clicked, 'check mouseup was called');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('T191183 - pointer event properties are fixed', function () {
        var mousedownRaised = false,
            mouseupRaised = false,
            clickRaised = false;
        runAsyncTest(
            function () {
                $el.mousedown(function (e) {
                    mousedownRaised = true;

                    equal(e.button, 0);
                    if (Util.isIE || Util.isMozilla)
                        equal(e.buttons, 1);

                    ok(!mouseupRaised && !clickRaised, 'mousedown event was raised first');
                });
                $el.mouseup(function (e) {
                    mouseupRaised = true;

                    equal(e.button, 0);
                    if (Util.isIE || Util.isMozilla)
                        equal(e.buttons, 1);

                    ok(mousedownRaised && !clickRaised, 'mouseup event was raised second');
                });
                $el.click(function (e) {
                    clickRaised = true;

                    equal(e.button, 0);
                    if (Util.isIE || Util.isMozilla)
                        equal(e.buttons, 1);

                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter(this), 'check cursor position');
                    ok(mousedownRaised && mouseupRaised, 'click event was raised third ');
                });

                $el[0].onmspointerdown = function (e) {
                    equal(e.pointerType, Util.isIE11 ? 'mouse' : 4);
                    equal(e.button, 0);
                    equal(e.buttons, 1);
                };

                $el[0].onmspointerup = function (e) {
                    equal(e.pointerType, Util.isIE11 ? 'mouse' : 4);
                    equal(e.button, 0);
                    equal(e.buttons, 1);
                };

                ActionsAPI.click($el[0]);
            },
            function () {
                ok(mousedownRaised && mousedownRaised && clickRaised, 'mouse events were raised');
                if (Util.isMozilla || (Util.isIE && Util.browserVersion === 9))
                    expect(11);
                else if (Util.isIE)
                    expect(17);
                else
                    expect(8);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('touch devices test');
    //for touch devices
    if (Util.hasTouchEvents) {
        asyncTest('touch event on click', function () {
            var events = {
                ontouchstart: false,
                ontouchend: false,
                onmousedown: false,
                onmouseup: false,
                onclick: false
            };

            runAsyncTest(
                function () {
                    var bind = function (eventName) {
                        $el[0][eventName] = function (e) {
                            events[eventName] = true;
                        };
                    };
                    for (var event in events)
                        bind(event);
                    ActionsAPI.click($el[0]);
                },
                function () {
                    for (var event in events)
                        ok(events[event], event + ' raised');
                },
                correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
            );
        });

        asyncTest('event touch lists length (T170088)', function () {
            var raisedEvents = [];

            runAsyncTest(
                function () {
                    var touchEventHandler = function (ev) {
                        raisedEvents.push(ev.type);
                        equal(ev.touches.length, ev.type === 'touchend' ? 0 : 1);
                        equal(ev.targetTouches.length, ev.type === 'touchend' ? 0 : 1);
                        equal(ev.changedTouches.length, 1);
                    };

                    $el[0].ontouchstart = $el[0].ontouchmove = $el[0].ontouchend = touchEventHandler;

                    ActionsAPI.click($el[0]);
                },
                function () {
                    ok(raisedEvents.indexOf('touchstart') >= 0);
                    ok(raisedEvents.indexOf('touchend') >= 0);
                },
                correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
            );
        });
    }
});
