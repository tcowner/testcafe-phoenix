var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    TextSelection = Hammerhead.TextSelection,
    Transport = TestCafeClient.get('Base.Transport'),
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    CursorWidget = TestCafeClient.get('UI.Cursor'),
    Automation = TestCafeClient.get('Automation'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Util = Hammerhead.Util,
    JSProcessor = Hammerhead.JSProcessor;

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

var TEST_COMPLETE_WAITING_TIMEOUT = 3500,
    ERROR_WAITING_TIMEOUT = ActionsAPI.ELEMENT_AVAILABILITY_WAITING_TIMEOUT + 50;

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
        currentErrorCode = err.code;

        if (err.element)
            currentErrorElement = err.element;
    });

    var $el = null,
        $parent = null,

        firstElementInnerHTML = null,
        secondElementInnerHTML = null,
        thirdElementInnerHTML = null,
        fourthElementInnerHTML = null,
        fifthElementInnerHTML = null,
        sixthElementInnerHTML = null,
        seventhElementInnerHTML = null,

        currentErrorCode = null,
        currentErrorElement = null,
    //constants
        TEST_ELEMENT_CLASS = 'testElement',

    //utils
        asyncActionCallback,

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
        },

        firstNotWhiteSpaceSymbolIndex = function (value) {
            var start = 0;
            for (var i = 0; i < value.length; i++) {
                if (value.charCodeAt(i) === 10 || value.charCodeAt(i) === 32) start++; else break;
            }
            return start;
        },

        checkSelection = function ($el, startNode, startOffset, endNode, endOffset) {
            var curDocument = Util.findDocument($el[0]),
                selection = curDocument.getSelection();
            equal(Util.getActiveElement(), $el[0]);
            ok(Util.isTheSameNode(startNode, selection.anchorNode), 'startNode correct');
            equal(selection.anchorOffset, startOffset, 'startOffset correct');
            ok(Util.isTheSameNode(endNode, selection.focusNode), 'endNode correct');
            equal(selection.focusOffset, endOffset, 'endOffset correct');
        },

        setInnerHTML = function ($el, innerHTML) {
            window[JSProcessor.SET_PROPERTY_METH_NAME]($el[0], 'innerHTML', innerHTML);
        },

        stateHelper = {
            isStateSaved: function () {
                return firstElementInnerHTML;
            },
            saveState: function () {
                firstElementInnerHTML = $('#1')[0].innerHTML;
                secondElementInnerHTML = $('#2')[0].innerHTML;
                thirdElementInnerHTML = $('#3')[0].innerHTML;
                fourthElementInnerHTML = $('#4')[0].innerHTML;
                fifthElementInnerHTML = $('#5')[0].innerHTML;
                sixthElementInnerHTML = $('#6')[0].innerHTML;
                seventhElementInnerHTML = $('#7')[0].innerHTML;
            },
            restoreState: function () {
                var curActiveElement = Util.getActiveElement(),
                    curDocument = Util.findDocument(curActiveElement),
                    selection = curDocument.getSelection();
                if (firstElementInnerHTML) {
                    setInnerHTML($('#1'), firstElementInnerHTML);
                    setInnerHTML($('#2'), secondElementInnerHTML);
                    setInnerHTML($('#3'), thirdElementInnerHTML);
                    setInnerHTML($('#4'), fourthElementInnerHTML);
                    setInnerHTML($('#5'), fifthElementInnerHTML);
                    setInnerHTML($('#6'), sixthElementInnerHTML);
                    setInnerHTML($('#7'), seventhElementInnerHTML);
                }
                if (curActiveElement !== $(curDocument).find('body')) {
                    $(curDocument).find('body').focus();
                    $(curActiveElement).blur();
                    selection.removeAllRanges();
                }
            }
        };

    $('<div></div>').css({width: 1, height: 1500, position: 'absolute'}).appendTo('body');
    $('body').css('height', '1500px');

    //tests
    QUnit.testStart = function () {
        //before first test save page state
        if (!stateHelper.isStateSaved())
            stateHelper.saveState();
        asyncActionCallback = function () {
        };
    };

    QUnit.testDone = function () {
        if ($el) {
            $el[0].onmousedown = function () {
            };
            $el[0].onclick = function () {
            };
        }
        $el = null;
        $parent = null;
        stateHelper.restoreState();
        if (!$.browser.msie)
            removeTestElements();
        currentErrorCode = null;
        currentErrorElement = null;
    };

    module('act.click');

    asyncTest('simple click', function () {
        var clicked = false;

        $parent = $('#1');
        $el = $parent.find("p");

        runAsyncTest(
            function () {
                $el[0].onclick = function () {
                    clicked = true;
                };
                $el[0].onmousedown = function () {
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter($el[0]), 'check cursor position');
                };
                ok(!clicked);
                ActionsAPI.click($el[0], {
                    caretPos: 10
                });
            },
            function () {
                ok(clicked, 'click raised');
                checkSelection($parent, $el[0].childNodes[0], 10, $el[0].childNodes[0], 10);
                expect(8);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('click on deep child', function () {
        var clicked = false;

        $parent = $('#4');
        $el = $parent.find(" > p:nth(1) > i:nth(1)");

        runAsyncTest(
            function () {
                $el[0].onclick = function () {
                    clicked = true;
                };
                $el[0].onmousedown = function () {
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter($el[0]), 'check cursor position');
                };
                ok(!clicked);
                ActionsAPI.click($el[0], {
                    caretPos: 1
                });
            },
            function () {
                ok(clicked, 'click raised');
                checkSelection($parent, $parent[0].childNodes[5].childNodes[3].childNodes[0], 1, $parent[0].childNodes[5].childNodes[3].childNodes[0], 1);
                expect(8);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('click on element with selection', function () {
        var clicked = false;

        $parent = $('#5');
        $el = $parent.find(" > i:nth(0) > b:nth(0)");

        runAsyncTest(
            function () {
                $el[0].onclick = function () {
                    clicked = true;
                };
                $el[0].onmousedown = function () {
                    deepEqual(CursorWidget.getAbsolutePosition(), Util.findCenter($el[0]), 'check cursor position');
                };
                ok(!clicked);
                TextSelection.selectByNodesAndOffsets($parent[0].childNodes[0], 3, $parent[0].childNodes[4], 7, true);
                ActionsAPI.click($el[0], {
                    caretPos: 6
                });
            },
            function () {
                ok(clicked, 'click raised');
                checkSelection($parent, $el[0].childNodes[0], 6, $el[0].childNodes[0], 6);
                expect(8);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('act.rclick');

    asyncTest('rclick (sets the correct position relative to the parent, not the item under the cursor)', function () {
        var clicked = false;

        $el = $('#4');

        runAsyncTest(
            function () {
                $el.bind('contextmenu', function () {
                    clicked = true;
                });
                ok(!clicked);
                ActionsAPI.rclick($el[0], {
                    caretPos: 104
                });
            },
            function () {
                var selectedEl = $el.find('>p:first>i')[0];
                ok(clicked, 'click raised');
                checkSelection($el, selectedEl.childNodes[0], 1, selectedEl.childNodes[0], 1);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('act.dblclick');

    asyncTest('dblclick (sets the correct position relative to the parent, not the item under the cursor)', function () {
        var dblclicked = false;

        $el = $('#4');

        runAsyncTest(
            function () {
                $el.bind('dblclick', function () {
                    dblclicked = true;
                });
                ok(!dblclicked);
                ActionsAPI.dblclick($el[0], {
                    caretPos: 104
                });
            },
            function () {
                var selectedEl = $el.find('>p:first>i')[0];
                ok(dblclicked, 'click raised');
                checkSelection($el, selectedEl.childNodes[0], 1, selectedEl.childNodes[0], 1);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('act.select');

    asyncTest('simple select', function () {
        $parent = $('#1');
        $el = $parent.find("p");


        runAsyncTest(
            function () {
                ActionsAPI.select($el[0], 5, 30);
            },
            function () {
                checkSelection($parent, $el[0].childNodes[0], 5, $el[0].childNodes[0], 30);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('difficult select', function () {
        $el = $("#4");
        $parent = $el;

        runAsyncTest(
            function () {
                ActionsAPI.select($el[0], 15, 151);
            },
            function () {
                checkSelection($parent, $el[0].childNodes[1].childNodes[0], 10, $el[0].childNodes[5].childNodes[4].childNodes[0], 2);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('simple inverse select', function () {
        $el = $("#2");

        runAsyncTest(
            function () {
                window.i = true;
                ActionsAPI.select($el[0], 21, 4);
            },
            function () {
                if (Util.isIE)
                    checkSelection($el, $el[0].childNodes[0], 4, $el[0].childNodes[2], 6);
                else {
                    checkSelection($el, $el[0].childNodes[2], 6, $el[0].childNodes[0], 4);
                    equal(TextSelection.hasInverseSelection($el[0]), true, 'selection direction correct');
                }
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('difficult inverse select', function () {
        $el = $("#6");

        runAsyncTest(
            function () {
                ActionsAPI.select($el[0], 141, 4);
            },
            function () {
                if (Util.isIE)
                    checkSelection($el, $el[0].childNodes[0], 4, $el[0].childNodes[10], 1);
                else {
                    checkSelection($el, $el[0].childNodes[10], 1, $el[0].childNodes[0], 4);
                    equal(TextSelection.hasInverseSelection($el[0]), true, 'selection direction correct');
                }
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('select in simple nearest common ancestor', function () {
        $parent = $('#6');
        $el = $parent.find('i:first');

        runAsyncTest(
            function () {
                ActionsAPI.select($el[0], 18, 54);
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[5].childNodes[1].childNodes[0], 14, $parent[0].childNodes[5].childNodes[4].childNodes[0], 3);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('act.select api');

    asyncTest('without args', function () {
        $el = $("#2");

        runAsyncTest(
            function () {
                ActionsAPI.select($el[0]);
            },
            function () {
                checkSelection($el, $el[0].childNodes[0], 0, $el[0].childNodes[2], Util.isMozilla || Util.isIE ? 8 : 7);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('positive offset', function () {
        $el = $("#2");

        runAsyncTest(
            function () {
                ActionsAPI.select($el[0], 19);
            },
            function () {
                checkSelection($el, $el[0].childNodes[0], 0, $el[0].childNodes[2], 4);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('negative offset', function () {
        $el = $("#2");

        runAsyncTest(
            function () {
                ActionsAPI.select($el[0], -11);
            },
            function () {
                if (Util.isIE)
                    checkSelection($el, $el[0].childNodes[0], 12, $el[0].childNodes[2], 8);
                else {
                    checkSelection($el, $el[0].childNodes[2], Util.isMozilla ? 8 : 7, $el[0].childNodes[0], 12);
                    equal(TextSelection.hasInverseSelection($el[0]), true, 'selection direction correct');
                }
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('zero offset', function () {
        $el = $("#2");

        runAsyncTest(
            function () {
                ActionsAPI.select($el[0], 0);
            },
            function () {
                checkSelection($el, $el[0].childNodes[0], 0, $el[0].childNodes[0], 0);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    //startPos less than endPos as a parameters ===  simple select
    //startPos more than endPos as a parameters === simple inverse select

    asyncTest('startPos, endPos, startLine and endLine', function () {
        $el = $("#4");

        runAsyncTest(
            function () {
                ActionsAPI.select($el[0], 15, 210, 16, 45);
            },
            function () {
                checkSelection($el, $el[0].childNodes[1].childNodes[0], 10, $el[0].childNodes[10].childNodes[0], 4);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('selection from first to last symbol in element', function () {
        $parent = $("#6");
        $el = $parent.find("div:first");

        runAsyncTest(
            function () {
                ActionsAPI.select($el[0], 0, 1);
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[1].childNodes[0], 0, $parent[0].childNodes[1].childNodes[0], 1);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT + 5000000000)
        );
    });

    asyncTest('startNode and endNode', function () {
        $parent = $("#2");
        var node1 = $parent[0].childNodes[0],
            node2 = $parent[0].childNodes[2];

        runAsyncTest(
            function () {
                ActionsAPI.select(node1, node2);
            },
            function () {
                checkSelection($parent, node1, 0, node2, Util.isIE || Util.isMozilla ? 8 : 7);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('startNode equal endNode', function () {
        $parent = $("#2");
        var node = $parent[0].childNodes[0];

        runAsyncTest(
            function () {
                ActionsAPI.select(node, node);
            },
            function () {
                checkSelection($parent, node, 0, node, node.length);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('startElement and endElement', function () {
        $parent = $("#4");
        var el1 = $parent[0].childNodes[3],
            el2 = $parent[0].childNodes[5];

        runAsyncTest(
            function () {
                ActionsAPI.select(el1, el2);
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[3].childNodes[0], 0, $parent[0].childNodes[5].childNodes[6].childNodes[0], 4);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('startNode and endElement', function () {
        $parent = $("#4");
        var node = $parent[0].childNodes[5].childNodes[0],
            el = $parent[0].childNodes[5].childNodes[4];

        runAsyncTest(
            function () {
                ActionsAPI.select(node, el);
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[5].childNodes[0], 0, $parent[0].childNodes[5].childNodes[4].childNodes[0], 3);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('startElement and endNode', function () {
        $parent = $("#6");
        var el = $parent[0].childNodes[1],
            node = $parent[0].childNodes[8];

        runAsyncTest(
            function () {
                ActionsAPI.select(el, node);
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[1].childNodes[0], 0, $parent[0].childNodes[8], Util.isIE || Util.isMozilla ? 13 : 9);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('inverse startNode and endElement', function () {
        $parent = $("#6");
        var el = $parent[0].childNodes[1],
            node = $parent[0].childNodes[8];

        runAsyncTest(
            function () {
                ActionsAPI.select(node, el);
            },
            function () {
                if (Util.isIE)
                    checkSelection($parent, $parent[0].childNodes[1].childNodes[0], 0, $parent[0].childNodes[8], Util.isIE || Util.isMozilla ? 13 : 9);
                else {
                    checkSelection($parent, $parent[0].childNodes[8], Util.isIE || Util.isMozilla ? 13 : 9, $parent[0].childNodes[1].childNodes[0], 0);
                    equal(TextSelection.hasInverseSelection($parent[0]), true, 'selection direction correct');
                }
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('startNode and $endElement', function () {
        $parent = $("#5");
        var node = $parent[0].childNodes[2],
            $el = $parent.find('i');

        runAsyncTest(
            function () {
                ActionsAPI.select(node, $el);
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[2], 0, $parent[0].childNodes[3].childNodes[1].childNodes[0], 9);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('startElement and $endElement', function () {
        $parent = $("#7");
        var el1 = $parent.find('div')[3],
            $el = $parent.find('div').eq(4);

        runAsyncTest(
            function () {
                ActionsAPI.select(el1, $el);
            },
            function () {
                checkSelection($parent, $parent.find('div')[3].childNodes[0], 0, $parent.find('div')[4].childNodes[0], 3);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('$startElement and $endElement', function () {
        $parent = $("#7");
        var $el1 = $parent.find('del:first'),
            $el2 = $parent.find('a:last');

        runAsyncTest(
            function () {
                ActionsAPI.select($el1, $el2);
            },
            function () {
                checkSelection($parent, $parent.find('del')[0].childNodes[0], Util.isIE || Util.isMozilla ? 0 : 9, $parent.find('a')[1].childNodes[0], 4);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('inverse $startElement and $endElement', function () {
        $parent = $("#7");
        var $el1 = $parent.find('a:last'),
            $el2 = $parent.find('del:first');

        runAsyncTest(
            function () {
                ActionsAPI.select($el1, $el2);
            },
            function () {
                if (Util.isIE)
                    checkSelection($parent, $parent.find('del')[0].childNodes[0], Util.isIE || Util.isMozilla ? 0 : 9, $parent.find('a')[1].childNodes[0], 4);
                else {
                    checkSelection($parent, $parent.find('a')[1].childNodes[0], 4, $parent.find('del')[0].childNodes[0], Util.isIE || Util.isMozilla ? 0 : 9);
                    equal(TextSelection.hasInverseSelection($parent[0]), true, 'selection direction correct');
                }
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('shortcuts');

    asyncTest('select all', function () {
        var oldInnerHTML = null;
        runAsyncTest(
            function () {
                $el = $('#4');
                oldInnerHTML = $el[0].innerHTML;
                $el.focus();
                ActionsAPI.press('ctrl+a');
            },
            function () {
                checkSelection($el, $el[0].childNodes[1].childNodes[0], 9, $el[0].childNodes[10].childNodes[0], 4);
                equal($el[0].innerHTML, oldInnerHTML, 'text isn\'t change');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('select and delete', function () {
        var oldNodeValue = null;
        runAsyncTest(
            function () {
                $el = $('#4');
                oldNodeValue = $el[0].childNodes[1].childNodes[2].nodeValue;
                TextSelection.selectByNodesAndOffsets($el[0].childNodes[1].childNodes[2], 11, $el[0].childNodes[10].childNodes[0], 3, true);
                equal($el[0].childNodes[1].childNodes[2].nodeValue, oldNodeValue, 'nodeValue is correct');
                ActionsAPI.press('delete');
            },
            function () {
                //we can't check selection position because it's different in different browsers
                equal($el[0].childNodes[1].childNodes[2].nodeValue, oldNodeValue.substring(0, 11), 'nodeValue is correct');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('select and backspace', function () {
        var element = null,
            oldElementText = null;
        runAsyncTest(
            function () {
                $parent = $('#6');
                $el = $parent.find('i:first');
                element = $parent[0].childNodes[5].childNodes[1];
                oldElementText = $(element).text();
                TextSelection.selectByNodesAndOffsets($parent[0].childNodes[5].childNodes[1].childNodes[0], 0, $parent[0].childNodes[5].childNodes[1].childNodes[0], 17, true);
                window.setTimeout(function () {
                    equal($(element).text(), oldElementText, 'nodeValue is correct');
                    ActionsAPI.press('backspace');
                }, 1000)
            },
            function () {
                //we can't check selection position because it's different in different browsers
                notEqual($(element).text(), oldElementText, 'oldValue isn\'t the same');
                equal($.trim($(element).text()), 'b el', 'nodeValue is correct');
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('select and left', function () {
        var startNode = null,
            startOffset = null,
            endNode = null,
            endOffset = null;
        runAsyncTest(
            function () {
                $el = $('#4');
                startNode = $el[0].childNodes[1].childNodes[2];
                startOffset = 11;
                endNode = $el[0].childNodes[10].childNodes[0];
                endOffset = 3;
                TextSelection.selectByNodesAndOffsets(startNode, startOffset, endNode, endOffset, true);
                checkSelection($el, startNode, startOffset, endNode, endOffset);
                ActionsAPI.press('left');
            },
            function () {
                checkSelection($el, startNode, startOffset, startNode, startOffset);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('select and right', function () {
        var startNode = null,
            startOffset = null,
            endNode = null,
            endOffset = null;
        runAsyncTest(
            function () {
                $el = $('#4');
                startNode = $el[0].childNodes[1].childNodes[2];
                startOffset = 11;
                endNode = $el[0].childNodes[10].childNodes[0];
                endOffset = 3;
                TextSelection.selectByNodesAndOffsets(startNode, startOffset, endNode, endOffset, true);
                checkSelection($el, startNode, startOffset, endNode, endOffset);
                ActionsAPI.press('right');
            },
            function () {
                checkSelection($el, endNode, endOffset, endNode, endOffset);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('act.type');

    asyncTest('simple type', function () {
        var text = "Test me all!",
            fixedText = "Test" + String.fromCharCode(160) + "me" + String.fromCharCode(160) + "all!";

        $el = $("#2");

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: 19
                });
            },
            function () {
                checkSelection($el, $el[0].childNodes[2], 4 + text.length, $el[0].childNodes[2], 4 + text.length);
                equal($.trim($el[0].childNodes[2].nodeValue), "with" + fixedText + " br");
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('simple type in deep child', function () {
        var text = "ABC";

        $parent = $("#6");
        $el = $parent.find(" > i:nth(0) > b:nth(1)");

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: 2
                });
            },
            function () {
                checkSelection($parent, $el[0].childNodes[0], 2 + text.length, $el[0].childNodes[0], 2 + text.length);
                equal($.trim($el[0].childNodes[0].nodeValue), "boABCld");
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('type in element with simple selection', function () {
        var text = "Test me all!",
            fixedText = "Test" + String.fromCharCode(160) + "me" + String.fromCharCode(160) + "all!";

        $el = $("#2");

        runAsyncTest(
            function () {
                TextSelection.selectByNodesAndOffsets($el[0].childNodes[0], 3, $el[0].childNodes[2], 7);
                ActionsAPI.type($el[0], text, {
                    caretPos: 21
                });
            },
            function () {
                checkSelection($el, $el[0].childNodes[2], 6 + text.length, $el[0].childNodes[2], 6 + text.length);
                equal($.trim($el[0].childNodes[2].nodeValue), "with b" + fixedText + "r");
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('type in element with big selection', function () {
        $parent = $("#4");
        $el = $parent.find("p:nth(1)>i:nth(1)");

        var text = "Test me all!",
            fixedText = "Test" + String.fromCharCode(160) + "me" + String.fromCharCode(160) + "all!",
            olsElementValue = $el[0].childNodes[0].nodeValue;

        runAsyncTest(
            function () {
                TextSelection.selectByNodesAndOffsets($parent[0].childNodes[1].childNodes[4], 11, $parent[0].childNodes[5].childNodes[6].childNodes[0], 2);
                ActionsAPI.type($el[0], text, {
                    caretPos: 2
                });
            },
            function () {
                checkSelection($parent, $el[0].childNodes[0], 2 + text.length, $el[0].childNodes[0], 2 + text.length);
                equal($el[0].childNodes[0].nodeValue, olsElementValue + fixedText);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('type and replace text in simple element', function () {
        var text = "Test me all!",
            fixedText = "Test" + String.fromCharCode(160) + "me" + String.fromCharCode(160) + "all!";

        $el = $("#2");

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    replace: true
                });
            },
            function () {
                checkSelection($el, $el[0].childNodes[0], text.length, $el[0].childNodes[0], text.length);
                equal($.trim($el.text()), fixedText);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('type and replace text in big element', function () {
        var text = "Test me all!",
            fixedText = "Test" + String.fromCharCode(160) + "me" + String.fromCharCode(160) + "all!",
            expectedNode = null;

        $el = $("#4");

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    replace: true
                });
            },
            function () {
                expectedNode = Util.isIE ? $el[0].childNodes[2].childNodes[0] : $el[0].childNodes[1].childNodes[0];
                checkSelection($el, expectedNode, expectedNode.length, expectedNode, expectedNode.length);
                equal($.trim($el.text()), fixedText);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('act.type in elements with invisible symbols');

    asyncTest('typing in invisible node', function () {
        $parent = $('#4');
        $el = $parent.find('p:nth(1)');

        var text = "123",
            node = $el[0].childNodes[5],
            nodeValue = node.nodeValue,
            elementText = $el.text();

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: 28
                });
            },
            function () {
                checkSelection($parent, node, nodeValue.length + text.length, node, nodeValue.length + text.length);
                equal($el[0].childNodes[5].nodeValue, nodeValue + text);
                equal($el.text(), elementText.substring(0, 36) + text + elementText.substring(36));
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('caret position is first visible position (without invisible symbols in the start)', function () {
        $parent = $('#1');
        $el = $parent.find("p");

        var text = "123",
            caretPos = 0,
            nodeValue = $parent[0].childNodes[1].childNodes[0].nodeValue;

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: caretPos
                });
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[1].childNodes[0], caretPos + text.length, $parent[0].childNodes[1].childNodes[0], caretPos + text.length);
                equal($parent[0].childNodes[1].childNodes[0].nodeValue, nodeValue.substring(0, caretPos) + text + nodeValue.substring(caretPos));
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('caret position is less than first visible position (with invisible symbols in the start)', function () {
        $parent = $('#6');
        $el = $parent.find('i>code');

        var text = "123",
            caretPos = 1,
            nodeValue = $parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue,
            symbolIndex = null;

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: caretPos
                });
            },
            function () {
                symbolIndex = firstNotWhiteSpaceSymbolIndex(nodeValue);
                checkSelection($parent, $parent[0].childNodes[5].childNodes[1].childNodes[0], symbolIndex + text.length, $parent[0].childNodes[5].childNodes[1].childNodes[0], symbolIndex + text.length);
                equal($parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue, nodeValue.substring(0, symbolIndex) + text + nodeValue.substring(symbolIndex));
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('caret position equal 0 (with invisible symbols in the start)', function () {
        $parent = $('#6');
        $el = $parent.find('i>code');

        var text = "123",
            caretPos = 0,
            nodeValue = $parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue;

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: caretPos
                });
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[5].childNodes[1].childNodes[0], caretPos + text.length, $parent[0].childNodes[5].childNodes[1].childNodes[0], caretPos + text.length);
                equal($parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue, nodeValue.substring(0, caretPos) + text + nodeValue.substring(caretPos));
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('caret position is first visible position (with invisible symbols in the start)', function () {
        $parent = $('#6');
        $el = $parent.find('i>code');

        var text = "123",
            caretPos = 9,
            nodeValue = $parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue;

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: caretPos
                });
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[5].childNodes[1].childNodes[0], caretPos + text.length, $parent[0].childNodes[5].childNodes[1].childNodes[0], caretPos + text.length);
                equal($parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue, nodeValue.substring(0, caretPos) + text + nodeValue.substring(caretPos));
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('caret position is last visible position (without invisible symbols in the start)', function () {
        $parent = $('#1');
        $el = $parent.find('p');

        var text = "123",
            caretPos = 31,
            nodeValue = $parent[0].childNodes[1].childNodes[0].nodeValue;

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: caretPos
                });
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[1].childNodes[0], caretPos + text.length, $parent[0].childNodes[1].childNodes[0], caretPos + text.length);
                equal($parent[0].childNodes[1].childNodes[0].nodeValue, nodeValue.substring(0, caretPos) + text + nodeValue.substring(caretPos));
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('caret position is more than last visible position (with invisible symbols in the start)', function () {
        $parent = $('#6');
        $el = $parent.find('i>code');

        var text = "123",
            caretPos = 17,
            nodeValue = $parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue;

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: caretPos
                });
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[5].childNodes[1].childNodes[0], nodeValue.length + text.length, $parent[0].childNodes[5].childNodes[1].childNodes[0], nodeValue.length + text.length);
                equal($parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue, nodeValue + text);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('caret position equal nodeValue length (with invisible symbols in the start)', function () {
        $parent = $('#6');
        $el = $parent.find('i>code');

        var text = "123",
            caretPos = 25,
            nodeValue = $parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue;

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: caretPos
                });
            },
            function () {
                checkSelection($parent, $parent[0].childNodes[5].childNodes[1].childNodes[0], nodeValue.length + text.length, $parent[0].childNodes[5].childNodes[1].childNodes[0], nodeValue.length + text.length);
                equal($parent[0].childNodes[5].childNodes[1].childNodes[0].nodeValue, nodeValue + text);
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    asyncTest('caret position is last visible position (with invisible symbols in the start)', function () {
        $el = $('#6');

        var text = "123",
            caretPos = 8,
            nodeValue = $el[0].childNodes[8].nodeValue;

        runAsyncTest(
            function () {
                ActionsAPI.type($el[0], text, {
                    caretPos: 118
                });
            },
            function () {
                checkSelection($el, $el[0].childNodes[8], caretPos + text.length, $el[0].childNodes[8], caretPos + text.length);
                equal($el[0].childNodes[8].nodeValue, nodeValue.substring(0, caretPos) + text + nodeValue.substring(caretPos));
            },
            correctTestWaitingTime(TEST_COMPLETE_WAITING_TIMEOUT)
        );
    });

    module('errors');

    asyncTest('invisible second element raise error', function () {
        asyncActionCallback = function () {
        };
        var $el1 = $('#4>p').first(),
            $el2 = $('#4>p').last();

        $el2.css('display', 'none');

        ActionsAPI.select($el1[0], $el2[0]);
        window.setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_INCORRECT_SELECT_ACTION_ARGUMENTS, 'correct error code sent');
            start();
        }, correctTestWaitingTime(ERROR_WAITING_TIMEOUT));
    });

    asyncTest('element isn\'t content editable raise error', function () {
        asyncActionCallback = function () {
        };
        var $parent = $('#4'),
            $el1 = $('#4>p').first(),
            $el2 = $('#4>p').last();

        $parent[0].removeAttribute('contenteditable');

        ActionsAPI.select($el1[0], $el2[0]);
        window.setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_INCORRECT_SELECT_ACTION_ARGUMENTS, 'correct error code sent');
            start();
        }, correctTestWaitingTime(ERROR_WAITING_TIMEOUT));
    });

    asyncTest('elements, which don\'t have common ancestor raise error', function () {
        asyncActionCallback = function () {
        };
        var $el1 = $('#1>p'),
            $el2 = $('#4>p').last();

        ActionsAPI.select($el1[0], $el2[0]);
        window.setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_INCORRECT_SELECT_ACTION_ARGUMENTS, 'correct error code sent');
            start();
        }, correctTestWaitingTime(ERROR_WAITING_TIMEOUT));
    });

    asyncTest('for all action except select we cann\'t send text node like the first parameter', function () {
        asyncActionCallback = function () {
        };

        var node = $("#2")[0].childNodes[0],
            text = 'test';

        ActionsAPI.type(node, text, {
            caretPos: 1
        });
        window.setTimeout(function () {
            equal(currentErrorCode, SharedErrors.API_EMPTY_FIRST_ARGUMENT, 'correct error code sent');
            start();
        }, correctTestWaitingTime(ERROR_WAITING_TIMEOUT));
    });
});
