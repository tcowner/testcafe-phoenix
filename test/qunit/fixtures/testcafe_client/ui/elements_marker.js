var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ElementsMarkerWidget = TestCafeClient.get('UI.RecorderWidgets.ElementsMarker'),
    Util = Hammerhead.Util,
    ShadowUI = Hammerhead.ShadowUI;

Hammerhead.init();

$(document).ready(function () {
    //consts
    var TEST_ELEMENT_CLASS = 'testElement',
        POINTERS_BASE_FRAME_CLASS = 'pointersBaseFrame',
        ELEMENT_FRAME_CLASS = 'elementFrame',
        ELEMENT_FRAME_SHADOW_CLASS = 'elementFrameShadow',
        POINTER_CLASS = 'pointer',
        ELEMENT_FRAME_PADDING = 3,
        DRAWING_TIME_INTERVAL = 17,
        ELEMENT_FRAME_WIDTH = 4,

        testTimeoutIds = [],

        startNext = function () {
            while (testTimeoutIds.length)
                clearTimeout(testTimeoutIds.pop());
            if (Util.isIE) {
                removeTestElements();
                window.setTimeout(start, 30);
            }
            else start();
        },
        runAsyncTest = function (actions, timeout) {
            var testCanceled;
            actions(function () {
                return testCanceled;
            });
            testTimeoutIds.push(
                setTimeout(function () {
                    testCanceled = true;
                    ok(false, 'Timeout is exceeded');
                    startNext();
                }, timeout)
            );
        },
        createDiv = function (left, top, width, height) {
            return $('<div></div>').css({
                left: left + 'px',
                top: top + 'px',
                width: width + 'px',
                height: height + 'px',
                position: 'absolute',
                backgroundColor: 'grey'
            }).addClass(TEST_ELEMENT_CLASS).appendTo('body');
        },
        assertRect = function ($rect, x, y, width, height) {
            ok($rect.length);
            ok($rect.attr('width') === width.toString());
            ok($rect.attr('height') === height.toString());
            ok($rect.attr('x') === x.toString());
            ok($rect.attr('y') === y.toString());
        },
        setTransformCSS = function ($element, value) {
            $element.css('transform', value);
            $element.css('-webkit-transform', value);
            $element.css('-o-transform', value);
            $element.css('-moz-transform', value);
            $element.css('-ms-transform', value);
        },

        removeTestElements = function () {
            ElementsMarkerWidget.clear();
            $('.' + TEST_ELEMENT_CLASS).remove();
        };

    //tests
    QUnit.testStart = function () {

    };

    QUnit.testDone = function () {
        if (!$.browser.msie)
            removeTestElements();
    };

    asyncTest('simple element', function () {
        runAsyncTest(
            function (testCanceled) {
                var elementWidth = 150,
                    elementHeight = 100,
                    elementX = 50,
                    elementY = 300,
                    pointersBaseWidth = 50,
                    pointersBaseHeight = 50,
                    pointersBaseX = 5,
                    pointersBaseY = 5;
                ElementsMarkerWidget.mark(createDiv(pointersBaseX, pointersBaseY, pointersBaseWidth, pointersBaseHeight), createDiv(elementX, elementY, elementWidth, elementHeight));
                window.setTimeout(function () {
                    ok(ShadowUI.select('.' + ELEMENT_FRAME_SHADOW_CLASS).length);
                    ok(ShadowUI.select('.' + POINTER_CLASS).length);
                    assertRect(ShadowUI.select('.' + ELEMENT_FRAME_CLASS), elementX - ELEMENT_FRAME_PADDING, elementY - ELEMENT_FRAME_PADDING,
                        elementWidth + ELEMENT_FRAME_PADDING * 2, elementHeight + ELEMENT_FRAME_PADDING * 2);
                    assertRect(ShadowUI.select('.' + POINTERS_BASE_FRAME_CLASS), pointersBaseX, pointersBaseY,
                        pointersBaseWidth, pointersBaseHeight);

                    startNext();
                }, DRAWING_TIME_INTERVAL);
            },
            1000
        );
    });

    asyncTest('animated element', function () {
        runAsyncTest(
            function (testCanceled) {
                var elementWidth = 100,
                    elementHeight = 200,
                    elementX = 100,
                    newElementX = 400,
                    elementY = 300,
                    pointersBaseWidth = 50,
                    pointersBaseHeight = 50,
                    pointersBaseX = 5,
                    pointersBaseY = 5,
                    $div = createDiv(elementX, elementY, elementWidth, elementHeight);
                ElementsMarkerWidget.mark(createDiv(pointersBaseX, pointersBaseY, pointersBaseWidth, pointersBaseHeight), $div);
                window.setTimeout(function () {
                    ok(ShadowUI.select('.' + ELEMENT_FRAME_SHADOW_CLASS).length);
                    ok(ShadowUI.select('.' + POINTER_CLASS).length);
                    assertRect(ShadowUI.select('.' + ELEMENT_FRAME_CLASS), elementX - ELEMENT_FRAME_PADDING, elementY - ELEMENT_FRAME_PADDING,
                        elementWidth + ELEMENT_FRAME_PADDING * 2, elementHeight + ELEMENT_FRAME_PADDING * 2);
                    assertRect(ShadowUI.select('.' + POINTERS_BASE_FRAME_CLASS), pointersBaseX, pointersBaseY,
                        pointersBaseWidth, pointersBaseHeight);
                    $div.animate({left: newElementX}, 100, 'linear', function () {
                        window.setTimeout(function () {
                            assertRect(ShadowUI.select('.' + ELEMENT_FRAME_CLASS), newElementX - ELEMENT_FRAME_PADDING, elementY - ELEMENT_FRAME_PADDING,
                                elementWidth + ELEMENT_FRAME_PADDING * 2, elementHeight + ELEMENT_FRAME_PADDING * 2);
                            startNext();
                        }, DRAWING_TIME_INTERVAL);
                    });

                }, DRAWING_TIME_INTERVAL);
            },
            1000
        );
    });

    asyncTest('element partially outside window borders', function () {
        runAsyncTest(
            function (testCanceled) {
                var elementWidth = 200,
                    elementHeight = 100,
                    elementX = -100,
                    elementY = -50,
                    pointersBaseWidth = 50,
                    pointersBaseHeight = 50,
                    pointersBaseX = 400,
                    pointersBaseY = 400,
                    $div = createDiv(elementX, elementY, elementWidth, elementHeight);
                ElementsMarkerWidget.mark(createDiv(pointersBaseX, pointersBaseY, pointersBaseWidth, pointersBaseHeight), $div);
                window.setTimeout(function () {
                    ok(ShadowUI.select('.' + ELEMENT_FRAME_SHADOW_CLASS).length);
                    ok(ShadowUI.select('.' + POINTER_CLASS).length);
                    assertRect(ShadowUI.select('.' + ELEMENT_FRAME_CLASS), 0 + ELEMENT_FRAME_WIDTH / 2, 0 + ELEMENT_FRAME_WIDTH / 2,
                        elementWidth + elementX + ELEMENT_FRAME_PADDING - ELEMENT_FRAME_WIDTH / 2, elementHeight + elementY + ELEMENT_FRAME_PADDING - ELEMENT_FRAME_WIDTH / 2);
                    startNext();
                }, DRAWING_TIME_INTERVAL);
            },
            1000
        );
    });

    module('regression tests');

    asyncTest('element with css transform (B236463)', function () {
        runAsyncTest(function () {
                var elementWidth = 150,
                    elementHeight = 100,
                    elementX = 200,
                    elementY = 400,
                    pointersBaseWidth = 50,
                    pointersBaseHeight = 50,
                    pointersBaseX = 5,
                    pointersBaseY = 5,
                    widthEnlarge = 2,
                    heightEnlarge = 1.5,
                    $div = createDiv(elementX, elementY, elementWidth, elementHeight);
                setTransformCSS($div, 'matrix(' + widthEnlarge + ', 0, 0, ' + heightEnlarge + ', 0, 0)');
                ElementsMarkerWidget.mark(createDiv(pointersBaseX, pointersBaseY, pointersBaseWidth, pointersBaseHeight), $div);
                window.setTimeout(function () {
                    assertRect(ShadowUI.select('.' + ELEMENT_FRAME_CLASS), elementX - (widthEnlarge * elementWidth - elementWidth) / 2 - ELEMENT_FRAME_PADDING,
                        elementY - (heightEnlarge * elementHeight - elementHeight) / 2 - ELEMENT_FRAME_PADDING,
                        elementWidth * widthEnlarge + ELEMENT_FRAME_PADDING * 2, elementHeight * heightEnlarge + ELEMENT_FRAME_PADDING * 2);
                    startNext();
                }, DRAWING_TIME_INTERVAL);
            },
            1000
        );
    });
});
