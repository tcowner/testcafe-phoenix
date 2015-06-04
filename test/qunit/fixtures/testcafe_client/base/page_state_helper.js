var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    PageState = Hammerhead.PageState,
    TextSelection = Hammerhead.TextSelection,
    Util = Hammerhead.Util,
    EventSandbox = Hammerhead.EventSandbox;

Hammerhead.init();

$(document).ready(function () {
    var TEST_ELEMENT_CLASS = 'testElement';

    var createTextInput = function (value) {
        var elementString = ['<input type="', 'text', '" value="', value, '" />'].join('');

        return $(elementString)
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body')[0];
    };

    var createSelect = function () {
        var select = $('<select><select/>')
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body')[0];
        $('<option>one</option>').appendTo(select);
        $('<option>two</option>').appendTo(select);
        $('<option>three</option>').appendTo(select);

        return select;
    };

    QUnit.testStart = function () {
    };

    QUnit.testDone = function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
    };

    asyncTest('restore focus and selection to a text input', function () {
        var input1 = createTextInput('abcd'),
            input2 = createTextInput(''),

            startSelection = 2,
            endSelection = 3,
            selectionInverse = true,
            handlerRaised = false;

        EventSandbox.focus(input1, function () {
            TextSelection.select(input1, startSelection, endSelection, selectionInverse);
            equal(Util.getActiveElement(), input1);

            var state = PageState.saveState();

            EventSandbox.focus(input2, function () {
                equal(Util.getActiveElement(), input2);

                input1.addEventListener('focus', function () {
                    handlerRaised = true;
                });

                PageState.restoreState(state, false, function () {
                    equal(Util.getActiveElement(), input1);
                    equal(TextSelection.getSelectionStart(input1), startSelection);
                    equal(TextSelection.getSelectionEnd(input1), endSelection);
                    equal(TextSelection.hasInverseSelection(input1), selectionInverse);
                    ok(handlerRaised);
                    start();
                });
            });
        });
    });

    asyncTest('silent restore focus and selection to a text input', function () {
        var input1 = createTextInput('abcd'),
            input2 = createTextInput(''),

            startSelection = 2,
            endSelection = 3,
            selectionInverse = true,
            handlerRaised = false;

        EventSandbox.focus(input1, function () {
            TextSelection.select(input1, startSelection, endSelection, selectionInverse);
            equal(Util.getActiveElement(), input1);

            var state = PageState.saveState();

            EventSandbox.focus(input2, function () {
                equal(Util.getActiveElement(), input2);

                input1.addEventListener('focus', function () {
                    handlerRaised = true;
                });

                PageState.restoreState(state, true, function () {
                    equal(Util.getActiveElement(), input1);
                    equal(TextSelection.getSelectionStart(input1), startSelection);
                    equal(TextSelection.getSelectionEnd(input1), endSelection);
                    equal(TextSelection.hasInverseSelection(input1), selectionInverse);
                    ok(!handlerRaised);
                    start();
                });
            });
        });
    });

    asyncTest('restore selected index', function () {
        var select = createSelect(),

            startSelectedIndex = 0,
            endSelectedIndex = 2;

        EventSandbox.focus(select, function () {
            select.selectedIndex = startSelectedIndex;
            var state = PageState.saveState();

            select.selectedIndex = endSelectedIndex;

            PageState.restoreState(state, false, function () {
                equal(select.selectedIndex, startSelectedIndex);
                start();
            });
        });
    });

    asyncTest('add affected element', function () {
        var text = 'text',
            input = createTextInput('text');

        var state = PageState.saveState(input);

        input.value = '';

        PageState.restoreState(state, false, function () {
            equal(input.value, text);
            start();
        });
    });
});
