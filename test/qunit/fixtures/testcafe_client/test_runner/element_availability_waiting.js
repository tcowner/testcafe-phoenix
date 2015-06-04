var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    Transport = TestCafeClient.get('Base.Transport'),
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    Automation = TestCafeClient.get('Automation'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    Util = Hammerhead.Util,
    CursorWidget = TestCafeClient.get('UI.Cursor');

Hammerhead.init();
Automation.init();
ActionBarrier.init();
CursorWidget.init();

var testIterator = new TestIterator();
ActionsAPI.init(testIterator);

var errorRaised = false;

Transport.fail = function (err) {
    if (err) {
        errorRaised = true;
        ok(!errorRaised, 'error raised');
        start();
    }
};

var setupTestIterator = function (iteratorCallback) {
    TestIterator.prototype.asyncActionSeries = function (items, runArgumentsIterator, action) {
        var seriesActionsRun = function (elements, callback) {
            async.forEachSeries(elements, action, callback);
        };

        runArgumentsIterator(items, seriesActionsRun, iteratorCallback);
    };
};

$(document).ready(function () {
    //consts
    var TEST_ELEMENT_CLASS = 'testElement';

    //utils
    QUnit.testDone = function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
        errorRaised = false;
    };

    //tests
    asyncTest('invisible element waiting', function () {
        var clickRaised = false;

        var actionCallback = function () {
            ok(!errorRaised);
            ok(clickRaised);
            start();

        };

        setupTestIterator(actionCallback);

        var $element = $('<input>').addClass(TEST_ELEMENT_CLASS)
            .css('display', 'none')
            .click(function () {
                clickRaised = true;
            })
            .appendTo('body');

        window.setTimeout(function () {
            $element.css('display', '');
        }, 1000);

        ActionsAPI.click($element, {});
    });

    asyncTest('element from jQuery selector argument is not exist on the start', function () {
        var clickRaised = false;

        var actionCallback = function () {
            ok(!errorRaised);
            ok(clickRaised);
            start();

        };

        setupTestIterator(actionCallback);

        var id = 'element',
            $element = null;

        window.setTimeout(function () {
            $element = $('<input />').attr('id', id)
                .addClass(TEST_ELEMENT_CLASS)
                .click(function () {
                    clickRaised = true;
                })
                .appendTo('body');
        }, 1000);

        ActionsAPI.click('#' + id, {});
    });

    asyncTest('element from function argument is not exist on the start', function () {
        var clickRaised = false;

        var actionCallback = function () {
            ok(!errorRaised);
            ok(clickRaised);
            start();

        };

        setupTestIterator(actionCallback);

        var id = 'element',
            $element = null;

        window.setTimeout(function () {
            $element = $('<input />').attr('id', id)
                .addClass(TEST_ELEMENT_CLASS)
                .click(function () {
                    clickRaised = true;
                })
                .appendTo('body');
        }, 1000);

        ActionsAPI.click(function () {
            return $element;
        }, {});
    });

    asyncTest('element from array argument is not exist on the start', function () {
        var clickRaised = false;

        var actionCallback = function () {
            ok(!errorRaised);
            ok(clickRaised);
            start();

        };

        setupTestIterator(actionCallback);

        var id = 'element',
            $element1 = $('<input />').addClass(TEST_ELEMENT_CLASS).appendTo('body'),
            $element2 = null;

        window.setTimeout(function () {
            $element2 = $('<input />').attr('id', id)
                .addClass(TEST_ELEMENT_CLASS)
                .click(function () {
                    clickRaised = true;
                })
                .appendTo('body');
        }, 1000);

        ActionsAPI.click([$element1, '#' + id], {});
    });

    asyncTest('argument function returns empty jQuery object', function () {
        var clickRaised = false;

        var actionCallback = function () {
            ok(!errorRaised);
            ok(clickRaised);
            start();
        };

        setupTestIterator(actionCallback);

        var id = 'element',
            $element1 = null;

        window.setTimeout(function () {
            $element1 = $('<input />').attr('id', id)
                .addClass(TEST_ELEMENT_CLASS)
                .click(function () {
                    clickRaised = true;
                })
                .appendTo('body');
        }, 1000);

        ActionsAPI.click(function () {
            return $('#' + id);
        }, {});
    });
});
