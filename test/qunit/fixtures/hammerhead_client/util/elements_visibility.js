var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util;

$(document).ready(function () {
    var TEST_ELEMENT_CLASS = 'testElement',
        $parent = null,
        $child = null;

//setup
    QUnit.testStart = function () {
        $parent = $('<div></div>').addClass(TEST_ELEMENT_CLASS).height(100).width(100).appendTo('body');
        $child = $('<div></div>').addClass(TEST_ELEMENT_CLASS).height(50).width(50).appendTo($parent);
    };

    QUnit.testDone = function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
        $parent = null;
        $child = null;
    };

//tests
    test('visible', function () {
        ok(Util.isElementVisible($parent[0]));
        ok(Util.isElementVisible($child[0]));
    });

    test('child display:none', function () {
        $child.css('display', 'none');
        ok(!Util.isElementVisible($child[0]));
        ok(Util.isElementVisible($parent[0]));
    });

    test('parent display:none', function () {
        $parent.css('display', 'none');
        ok(!Util.isElementVisible($child[0]));
        ok(!Util.isElementVisible($parent[0]));
    });

    test('child visibility:hidden', function () {
        $child.css('visibility', 'hidden');
        ok(!Util.isElementVisible($child[0]));
        ok(Util.isElementVisible($parent[0]));
    });

    test('parent visibility:hidden', function () {
        $parent.css('visibility', 'hidden');
        ok(!Util.isElementVisible($child[0]));
        ok(!Util.isElementVisible($parent[0]));
    });

    test('empty child size', function () {
        $child.height(0).width(0);
        ok(!Util.isElementVisible($child[0]));
        ok(Util.isElementVisible($parent[0]));
    });

    test('empty child size (witdh paddings)', function () {
        $child.height(0).width(0).css('padding', 5);
        ok(Util.isElementVisible($child[0]));
        ok(Util.isElementVisible($parent[0]));
    });

    test('empty parent size', function () {
        $parent.height(0).width(0);
        ok(Util.isElementVisible($child[0]));
        ok(!Util.isElementVisible($parent[0]));
    });

    test('element in scrollable container', function () {
        var $scrollable = $('<div></div>').addClass(TEST_ELEMENT_CLASS).height(300).width(300).css('overflow', 'auto').appendTo('body'),
            $container = $('<div></div>').addClass(TEST_ELEMENT_CLASS).height(1000).width(1000).appendTo($scrollable),
            $div = $('<div></div>').addClass(TEST_ELEMENT_CLASS).height(100).width(100).appendTo($container);
        $scrollable.scrollTop(900);
        $scrollable.scrollLeft(900);
        ok(Util.isElementVisible($div[0]));
    });
});