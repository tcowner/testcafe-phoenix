var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    TextSelection = Hammerhead.TextSelection,
    Util = Hammerhead.Util,

    Automation = TestCafeClient.get('Automation'),
    ClickPlaybackAutomation = TestCafeClient.get('Automation.Click.Playback'),
    RClickPlaybackAutomation = TestCafeClient.get('Automation.RClick.Playback'),
    DblClickPlaybackAutomation = TestCafeClient.get('Automation.DblClick.Playback'),
    DragPlaybackAutomation = TestCafeClient.get('Automation.Drag.Playback'),
    TypePlaybackAutomation = TestCafeClient.get('Automation.Type.Playback'),
    CursorWidget = TestCafeClient.get('UI.Cursor');

Hammerhead.init();
Automation.init();
CursorWidget.init();

$(document).ready(function () {
    //consts
    var TEST_ELEMENT_CLASS = 'testElement';

    //utils
    var createTextInput = function () {
        return $('<input type="text">').attr('id', 'input').addClass(TEST_ELEMENT_CLASS).appendTo('body');
    };

    $('body').css('height', 1500);

    var createDiv = function (x, y, width, height, color) {
        return $('<div></div>')
            .addClass(TEST_ELEMENT_CLASS)
            .css({
                width: width + 'px',
                height: height + 'px',
                position: 'absolute',
                backgroundColor: color ? color : 'grey',
                left: x ? x + 'px' : '100px',
                top: y ? y + 'px' : '850px'
            })
            .appendTo($('body'));
    };

    var DRAGGABLE_BIND_FLAG = 'tc-dbf-c56a4d91',
        CURSOR_POSITION_PROPERTY = 'tc-cpp-ac4a65d4',
        SCROLL_POSITION_PROPERTY = 'tc-spp-ac4a65d4',
        DRAGGABLE_CLASS = 'draggable',
        DRAG_STARTED_PROPERTY = 'dragStarted';

    var initDraggable = function (win, doc, $el) {
        var $doc = $(doc),
            $win = $(win);
        if (!$doc.data(DRAGGABLE_BIND_FLAG)) {
            $doc.data(DRAGGABLE_BIND_FLAG, true);
            $doc.data(CURSOR_POSITION_PROPERTY, null);

            $doc.bind(Util.hasTouchEvents ? 'touchmove' : 'mousemove', function (e) {
                var curMousePos = Util.hasTouchEvents ? {
                    x: e.originalEvent.targetTouches[0].pageX || e.originalEvent.touches[0].pageX,
                    y: e.originalEvent.targetTouches[0].pageY || e.originalEvent.touches[0].pageY
                } : {
                    x: e.clientX,
                    y: e.clientY };

                $.each($doc.find('.' + DRAGGABLE_CLASS), function () {
                    var $this = $(this);

                    if ($(this).data(DRAG_STARTED_PROPERTY)) {
                        $this.css({
                            left: Math.round($this.position().left) + curMousePos.x - $doc.data(CURSOR_POSITION_PROPERTY).x,
                            top: Math.round($this.position().top) + curMousePos.y - $doc.data(CURSOR_POSITION_PROPERTY).y
                        });
                        return false;
                    }
                });

                $doc.data(CURSOR_POSITION_PROPERTY, curMousePos);
            });
        }

        if (!$win.data(DRAGGABLE_BIND_FLAG)) {
            $win.data(DRAGGABLE_BIND_FLAG, true);
            $win.data(SCROLL_POSITION_PROPERTY, {
                x: 0,
                y: 0
            });

            $win.scroll(function () {
                var curScrollTop = $win.scrollTop(),
                    x = $win.scrollLeft() - $win.data(SCROLL_POSITION_PROPERTY).x,
                    y = $win.scrollTop() - $win.data(SCROLL_POSITION_PROPERTY).y;

                $win.data(SCROLL_POSITION_PROPERTY).x = $win.scrollLeft();
                $win.data(SCROLL_POSITION_PROPERTY).y = $win.scrollTop();

                $.each($doc.find('.' + DRAGGABLE_CLASS), function () {
                    var $this = $(this);

                    if ($(this).data(DRAG_STARTED_PROPERTY)) {
                        $this.css({
                            left: $this.position().left + x,
                            top: $this.position().top + y
                        });
                        return false;
                    }
                });
            });
        }

        $el.addClass(DRAGGABLE_CLASS);

        $el.bind(Util.hasTouchEvents ? 'touchstart' : 'mousedown', function (e) {
            doc[CURSOR_POSITION_PROPERTY] = Util.hasTouchEvents ? {
                x: e.originalEvent.targetTouches[0].pageX || e.originalEvent.touches[0].pageX,
                y: e.originalEvent.targetTouches[0].pageY || e.originalEvent.touches[0].pageY
            } : {
                x: e.clientX,
                y: e.clientY
            };

            $doc.data(CURSOR_POSITION_PROPERTY, doc[CURSOR_POSITION_PROPERTY]);

            $(this).data(DRAG_STARTED_PROPERTY, true);
        });

        $el.bind(Util.hasTouchEvents ? 'touchend' : 'mouseup', function () {
            doc[CURSOR_POSITION_PROPERTY] = null;
            $(this).data(DRAG_STARTED_PROPERTY, false);
        });
    };

    var createDraggable = function (currentWindow, currentDocument, x, y) {
        var curDocument = currentDocument || document,
            currentWindow = currentWindow || window,
            lastCursorPosition = null,
            $draggable = $('<div></div>')
                .attr('id', 'draggable')
                .addClass(TEST_ELEMENT_CLASS)
                .css({
                    width: '60px',
                    height: '60px',
                    position: 'absolute',
                    backgroundColor: 'grey',
                    left: x ? x + 'px' : '100px',
                    top: y ? y + 'px' : '850px',
                    zIndex: 5
                })
                .appendTo($(curDocument).find('body'));

        initDraggable(currentWindow, curDocument, $draggable);

        return $draggable;
    };

    var startNext = function () {
        if (Util.isIE) {
            removeTestElements();
            window.setTimeout(start, 30);
        }
        else
            start();
    };

    var removeTestElements = function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
    };

    QUnit.testDone = function () {
        if (!Util.isIE)
            removeTestElements();
    };

    //tests
    module('actions with out of element\'s bounds offsets');

    asyncTest('Click playback', function () {

        var $smallDiv = createDiv(200, 200, 50, 50, 'red'),
            $bigDiv = createDiv(150, 150, 150, 150, 'grey'),
            clickSmallCount = 0,
            clickBigCount = 0,
            offsetX = $smallDiv.width() + 10,
            offsetY = $smallDiv.height() + 10,
            clickOffsets = {
                offsetX: offsetX,
                offsetY: offsetY
            };

        $smallDiv.css('zIndex', '5');

        $smallDiv.click(function () {
            clickSmallCount++;
        });

        $bigDiv.bind('mousedown', function (e) {
            var smallDivPos = Util.getOffsetPosition($smallDiv[0]),
                smallDivPosClient = Util.offsetToClientCoords({x: smallDivPos.left + offsetX, y: smallDivPos.top + offsetY});
            equal(e.clientX, smallDivPosClient.x);
            equal(e.clientY, smallDivPosClient.y);
        });

        $bigDiv.click(function () {
            clickBigCount++;
        });

        ClickPlaybackAutomation.run($smallDiv[0], clickOffsets, function () {
                equal(clickSmallCount, 0);
                equal(clickBigCount, 1);
                expect(4);
                startNext();
            }
        );
    });

    asyncTest('RClick playback', function () {

        var $smallDiv = createDiv(200, 200, 50, 50, 'red'),
            $bigDiv = createDiv(150, 150, 150, 150, 'grey'),
            clickSmallCount = 0,
            clickBigCount = 0,
            offsetX = $smallDiv.width() + 10,
            offsetY = $smallDiv.height() + 10,
            rclickOffsets = {
                offsetX: offsetX,
                offsetY: offsetY
            };

        $smallDiv.css('zIndex', '5');

        $smallDiv.contextmenu(function () {
            clickSmallCount++;
        });

        $bigDiv.bind('mousedown', function (e) {
            var smallDivPos = Util.getOffsetPosition($smallDiv[0]),
                smallDivPosClient = Util.offsetToClientCoords({x: smallDivPos.left + offsetX, y: smallDivPos.top + offsetY});
            equal(e.clientX, smallDivPosClient.x);
            equal(e.clientY, smallDivPosClient.y);
        });

        $bigDiv.contextmenu(function () {
            clickBigCount++;
        });

        RClickPlaybackAutomation.run($smallDiv[0], rclickOffsets, function () {
            equal(clickSmallCount, 0);
            equal(clickBigCount, 1);
            expect(4);
            startNext();
        });
    });

    asyncTest('DblClick playback', function () {
        var $smallDiv = createDiv(200, 200, 50, 50, 'red'),
            $bigDiv = createDiv(150, 150, 150, 150, 'grey'),
            clickSmallCount = 0,
            clickBigCount = 0,
            offsetX = $smallDiv.width() + 10,
            offsetY = $smallDiv.height() + 10,
            dblClickOffsets = {
                offsetX: offsetX,
                offsetY: offsetY
            };

        var mousedownHandler = function (e) {
            var smallDivPos = Util.getOffsetPosition($smallDiv[0]),
                smallDivPosClient = Util.offsetToClientCoords({x: smallDivPos.left + offsetX, y: smallDivPos.top + offsetY});
            equal(e.clientX, smallDivPosClient.x);
            equal(e.clientY, smallDivPosClient.y);
        };

        $smallDiv.css('zIndex', '5');

        $smallDiv.dblclick(function () {
            clickSmallCount++;
        });

        $bigDiv.bind('mousedown', mousedownHandler);

        $bigDiv.dblclick(function () {
            clickBigCount++;
        });

        DblClickPlaybackAutomation.run($smallDiv[0], dblClickOffsets, function () {
            equal(clickSmallCount, 0);
            equal(clickBigCount, 1);
            expect(6);
            startNext();
        });
    });

    asyncTest('Type playback', function () {
        var inputText = 'input with text',
            typpingText = 'testtext',
            newInputText = '',
            startCursorPos = 0,
            $input = createTextInput()
                .attr('value', inputText),
            inputOffset = Util.getOffsetPosition($input[0]),
            inputCursorPosition = 5,
            offsetX = $input.width() + 50,
            offsetY = $input.height() + 50,
            typeOptions = {
                offsetX: offsetX,
                offsetY: offsetY,
                caretPos: inputCursorPosition
            },
            $div = createDiv(inputOffset.left, inputOffset.top + $input.height(), $input.width() + 100, 100, 'red');

        $div.click(function () {
            $input.focus();
            startCursorPos = TextSelection.getSelectionStart($input[0]);
            newInputText = inputText.substring(0, startCursorPos) + typpingText + inputText.substring(startCursorPos);
        });

        TypePlaybackAutomation.run($input[0], typpingText, typeOptions, function () {
            equal($input[0].value, newInputText);
            equal(TextSelection.getSelectionStart($input[0]), startCursorPos + typpingText.length);
            startNext();
        });
    });

    asyncTest('Type playback with too large offset', function () {
        var inputText = 'input with text',
            typpingText = 'testtext',
            $input = createTextInput().attr('value', inputText),
            startCursorPos = TextSelection.getSelectionStart($input[0]),
            inputCursorPosition = 5,
            offsetX = $input.width() + 50,
            offsetY = $input.height() + 50,
            typeOptions = {
                offsetX: offsetX,
                offsetY: offsetY,
                caretPos: inputCursorPosition
            };

        TypePlaybackAutomation.run($input[0], typpingText, typeOptions, function () {
            equal($input[0].value, inputText);
            equal(TextSelection.getSelectionStart($input[0]), startCursorPos);
            startNext();
        });
    });

    asyncTest('Drag playback', function () {
        var $smallDraggable = createDraggable(window, document, 200, 200),
            smallDraggableOffset = Util.getOffsetPosition($smallDraggable[0]),

            $bigDraggable = createDraggable(window, document, 150, 150),
            bigDraggableOffset = Util.getOffsetPosition($bigDraggable[0]),

            dragOffsetX = 10,
            dragOffsetY = -100,
            offsetX = $smallDraggable.width() + 10,
            offsetY = $smallDraggable.height() + 10,
            dragOffsets = {
                dragOffsetX: dragOffsetX,
                dragOffsetY: dragOffsetY
            },
            dragOptions = {
                offsetX: offsetX,
                offsetY: offsetY
            };

        var handler = function (e) {
            var smallDraggablePos = Util.getOffsetPosition($smallDraggable[0]),
                smallDraggablePosClient = Util.offsetToClientCoords({x: smallDraggablePos.left + offsetX, y: smallDraggablePos.top + offsetY});
            equal(e.clientX, smallDraggablePosClient.x + dragOffsetX, 'mousedown clientX correct');
            equal(e.clientY, smallDraggablePosClient.y + dragOffsetY, 'mousedown clientY correct');
        };

        if (!Util.hasTouchEvents) {
            $bigDraggable.bind('mousedown', function (e) {
                var smallDraggablePos = Util.getOffsetPosition($smallDraggable[0]),
                    smallDraggablePosClient = Util.offsetToClientCoords({x: smallDraggablePos.left + offsetX, y: smallDraggablePos.top + offsetY});
                equal(e.clientX, smallDraggablePosClient.x, 'mousedown clientX correct');
                equal(e.clientY, smallDraggablePosClient.y, 'mousedown clientY correct');
            });
            $bigDraggable.bind('mouseup', handler);
            $bigDraggable.bind('click', handler);
        }

        $bigDraggable.css({
            width: 150 + 'px',
            height: 150 + 'px'
        });

        $smallDraggable.css({
            width: 50 + 'px',
            height: 50 + 'px',
            zIndex: 15,
            backgroundColor: 'red'
        });

        DragPlaybackAutomation.run($smallDraggable[0], dragOffsets, dragOptions, function () {
            deepEqual(Util.getOffsetPosition($smallDraggable[0]), smallDraggableOffset);
            equal(Util.getOffsetPosition($bigDraggable[0]).left, bigDraggableOffset.left + dragOffsetX);
            equal(Util.getOffsetPosition($bigDraggable[0]).top, bigDraggableOffset.top + dragOffsetY);

            expect(Util.hasTouchEvents ? 3 : 9);

            startNext();

        });
    });
});
