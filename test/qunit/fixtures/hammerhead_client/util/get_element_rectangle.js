var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util;

$(document).ready(function () {
    var TEST_ELEMENT_CLASS = 'testElement',
        SVG_OPEN_TAG = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">',
        SVG_CLOSE_TAG = '</svg>',

        removeTestElements = function () {
            $('.' + TEST_ELEMENT_CLASS).remove();
        },

        assertRectangle = function (rectangle, left, top, width, height) {
            ok(rectangle.left === left, 'left checked');
            ok(rectangle.top === top, 'top checked');
            ok(rectangle.width === width, 'width checked');
            ok(rectangle.height === height, 'height checked');
        };

    QUnit.testStart = function () {
    };

    QUnit.testDone = function () {
        removeTestElements();
    };

    var createSelectElement = function (size) {
        var $select = $('<select><option>one</option><option>two</option><option>three</option><option>four</option><option>five</option></select>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body');
        if (size)
            $select.attr('size', size);
        return $select;
    };

    var mapElementsTests = function () {
        module('map elements');

        var imgLeft = 10,
            imgTop = 20,
            imgWidth = 1000,
            imgHeight = 1000,
            mapName = 'map',
            createImgElement = function () {
                var $img = $('<img>').addClass(TEST_ELEMENT_CLASS).css({
                    position: 'absolute',
                    left: imgLeft,
                    top: imgTop,
                    width: imgWidth,
                    height: imgHeight
                }).attr('usemap', '#' + mapName).appendTo('body');
                imgWidth = $img[0].offsetWidth;
                imgHeight = $img[0].offsetHeight;
                return $img;
            },
            createMapElement = function () {
                createImgElement();
                return $('<map></map>').addClass(TEST_ELEMENT_CLASS).attr('name', mapName).appendTo('body');
            },
            createAreaElement = function (shape, coords) {
                return $('<area>').addClass(TEST_ELEMENT_CLASS).attr('shape', shape).attr('coords', coords).appendTo(createMapElement());
            };

        test('map', function () {
            var $map = createMapElement();
            ok(Util.isElementVisible($map[0]), 'check visibility');
            assertRectangle(Util.getElementRectangle($map[0]),
                imgLeft,
                imgTop,
                imgWidth,
                imgHeight
            );
        });

        test('rect area', function () {
            var rectLeft = 10,
                rectTop = 5,
                rectRight = 50,
                rectBottom = 70,
                $area = createAreaElement('rect', [rectLeft, rectTop, rectRight, rectBottom].join(','));
            ok(Util.isElementVisible($area[0]), 'check visibility');
            assertRectangle(Util.getElementRectangle($area[0]),
                rectLeft + imgLeft,
                rectTop + imgTop,
                rectRight - rectLeft,
                rectBottom - rectTop
            );
        });

        test('circle area', function () {
            var centerLeft = 90,
                centerTop = 100,
                diameter = 30,
                $area = createAreaElement('circle', [centerLeft, centerTop, diameter].join(','));
            ok(Util.isElementVisible($area[0]), 'check visibility');
            assertRectangle(Util.getElementRectangle($area[0]),
                centerLeft + imgLeft - diameter,
                centerTop + imgTop - diameter,
                diameter * 2,
                diameter * 2
            );
        });

        test('default area', function () {
            var $area = createAreaElement('default', '');
            ok(Util.isElementVisible($area[0]), 'check visibility');
            assertRectangle(Util.getElementRectangle($area[0]),
                imgLeft,
                imgTop,
                imgWidth,
                imgHeight
            );
        });

        test('poly areas', function () {
            var leastLeftPoint = 10,
                leastTopPoint = 20,
                mostRightPoint = 300,
                mostBottomPoint = 450,
                points = [leastLeftPoint, leastTopPoint, mostRightPoint, leastTopPoint + 10, leastLeftPoint + 10, mostBottomPoint],
                $area = createAreaElement('poly', points.join(','));
            ok(Util.isElementVisible($area[0]), 'check visibility');
            assertRectangle(Util.getElementRectangle($area[0]),
                leastLeftPoint + imgLeft,
                leastTopPoint + imgTop,
                mostRightPoint - leastLeftPoint,
                mostBottomPoint - leastTopPoint
            );

            points = [leastLeftPoint, leastTopPoint + 20, leastLeftPoint + 20, leastTopPoint, leastLeftPoint + 60, leastTopPoint + 30, mostRightPoint, mostBottomPoint - 50, mostRightPoint - 40, mostBottomPoint];
            $area = createAreaElement('poly', points.join(','));
            ok(Util.isElementVisible($area[0]), 'check visibility');
            assertRectangle(Util.getElementRectangle($area[0]),
                leastLeftPoint + imgLeft,
                leastTopPoint + imgTop,
                mostRightPoint - leastLeftPoint,
                mostBottomPoint - leastTopPoint
            );
        });
    }();

    module('regression tests');
    test('svg element in iframe (B237722)', function () {
        var cx = 20,
            cy = 30,
            r = 10,
            $iframe = $('#iframe1').addClass(TEST_ELEMENT_CLASS),
            $svg = $(SVG_OPEN_TAG + '<circle></circle>' + SVG_CLOSE_TAG).addClass(TEST_ELEMENT_CLASS).appendTo($('body', $iframe.contents())),
            $circle = $($svg.find('circle')).addClass(TEST_ELEMENT_CLASS).attr({
                cx: cx,
                cy: cy,
                r: r,
                'stroke-width': '0',
                fill: 'grey'
            }).appendTo($svg);
        assertRectangle(Util.getElementRectangle($circle[0]),
            Math.round(cx + $iframe.offset().left),
            Math.round(cy + $iframe.offset().top),
            r * 2,
            r * 2
        );
    });

    test('Element marking for visible options (in select with "size" attribute value more than one) (B237359)', function () {
        var $select = createSelectElement(2).css({
                position: 'absolute',
                left: 20,
                top: 30
            }),
            selectRectangle = Util.getElementRectangle($select[0]),
            selectBorders = Util.getBordersWidth($select),
            $option = $select.children().eq(0);

        assertRectangle(Util.getElementRectangle($option[0]),
            Math.round(selectRectangle.left + selectBorders.left),
            Math.round(selectRectangle.top + selectBorders.top + Util.getElementPadding($select).top),
            selectRectangle.width - (selectBorders.left + selectBorders.right) - Util.getScrollbarSize(),
            Util.getOptionHeight($select)
        );
    });
});
