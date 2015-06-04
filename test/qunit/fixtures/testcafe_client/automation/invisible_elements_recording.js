var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    Util = Hammerhead.Util,
    Settings = TestCafeClient.get('Settings');

Settings.RECORDING = true;

var Automation = TestCafeClient.get('Automation'),
    ClickPlaybackAutomation = TestCafeClient.get('Automation.Click.Playback'),
    RClickPlaybackAutomation = TestCafeClient.get('Automation.RClick.Playback'),
    DblClickPlaybackAutomation = TestCafeClient.get('Automation.DblClick.Playback'),
    DragPlaybackAutomation = TestCafeClient.get('Automation.Drag.Playback'),
    TypePlaybackAutomation = TestCafeClient.get('Automation.Type.Playback'),
    HoverPlaybackAutomation = TestCafeClient.get('Automation.Hover.Playback'),
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

    var createInvisibleInputWithHandlers = function (events) {
        var $input = createTextInput()
            .css('visibility', 'hidden');

        if (!events || !events.length)
            return $input;

        $.each(events, function (index, value) {
            $input.bind(value, function (e) {
                $input.attr('value', $input.attr('value') + e.type);
            });
        });
        return $input;
    };

    $('body').css('height', 1500);

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
    module('actions with invisible element during recording');

    asyncTest('Click playback on invisible input', function () {
        var $input = createInvisibleInputWithHandlers(['mousedown', 'mouseup', 'click']);

        ClickPlaybackAutomation.run($input[0], {}, function () {
            equal($input.attr('value'), 'mousedownmouseupclick');
            startNext();
        });
    });

    asyncTest('RClick playback on invisible input', function () {
        var $input = createInvisibleInputWithHandlers(['mousedown', 'mouseup', 'contextmenu']);

        RClickPlaybackAutomation.run($input[0], {}, function () {
            equal($input.attr('value'), 'mousedownmouseupcontextmenu');
            startNext();
        });
    });

    asyncTest('DblClick playback on invisible input', function () {
        var $input = createInvisibleInputWithHandlers(['mousedown', 'mouseup', 'click', 'dblclick']);

        DblClickPlaybackAutomation.run($input[0], {}, function () {
            equal($input.attr('value'), 'mousedownmouseupclickmousedownmouseupclickdblclick');
            startNext();
        });
    });

    asyncTest('Drag playback on invisible input', function () {
        var $input = createInvisibleInputWithHandlers(['mousedown', 'mouseup', 'click']),
            to = { x: 100, y: 100 };

        DragPlaybackAutomation.run($input[0], to, {}, function () {
            equal($input.attr('value'), '');
            startNext();
        });
    });

    asyncTest('Type playback on invisible input', function () {
        var $input = createInvisibleInputWithHandlers(['mousedown', 'mouseup', 'click', 'keydown', 'keypress', 'keyup']),
            text = 'test';

        TypePlaybackAutomation.run($input[0], text, {}, function () {
            equal($input.attr('value'), '');
            startNext();
        });
    });

    asyncTest('Hover playback on invisible input', function () {
        var $input = createInvisibleInputWithHandlers(['mouseenter', 'mouseover']),
            text = 'test';

        HoverPlaybackAutomation.run($input[0], {}, function () {
            equal($input.attr('value'), '');
            startNext();
        });
    });
});
