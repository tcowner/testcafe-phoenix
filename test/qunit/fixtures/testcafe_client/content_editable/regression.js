var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    async = Hammerhead.async,
    Util = Hammerhead.Util,
    JSProcessor = Hammerhead.JSProcessor,
    PageState = Hammerhead.PageState,
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    TextSelection = Hammerhead.TextSelection,
    ContentEditableHelper = Hammerhead.ContentEditableHelper,

    Automation = TestCafeClient.get('Automation'),
    ClickPlaybackAutomation = TestCafeClient.get('Automation.Click.Playback'),
    TypePlaybackAutomation = TestCafeClient.get('Automation.Type.Playback'),
    CursorWidget = TestCafeClient.get('UI.Cursor');

Hammerhead.init();
Automation.init();
CursorWidget.init();
JavascriptExecutor.init();

$(document).ready(function () {
    //consts
    var TEST_ELEMENT_CLASS = 'testElement';

    var firstElementInnerHTML = null,
        secondElementInnerHTML = null,
        thirdElementInnerHTML = null;

    $('body').css('height', 1500).attr('contenteditable', 'true');

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

    var checkSelection = function ($el, startNode, startOffset, endNode, endOffset) {
        var curDocument = Util.findDocument($el[0]),
            selection = curDocument.getSelection();
        equal(Util.getActiveElement(), $el[0]);
        ok(Util.isTheSameNode(startNode, selection.anchorNode), 'startNode correct');
        equal(selection.anchorOffset, startOffset, 'startOffset correct');
        ok(Util.isTheSameNode(endNode, selection.focusNode), 'endNode correct');
        equal(selection.focusOffset, endOffset, 'endOffset correct');
    };

    var setInnerHTML = function ($el, innerHTML) {
        window[JSProcessor.SET_PROPERTY_METH_NAME]($el[0], 'innerHTML', innerHTML);
    };

    var stateHelper = {
        isStateSaved: function () {
            return firstElementInnerHTML;
        },
        saveState: function () {
            firstElementInnerHTML = $('#1')[0].innerHTML;
            secondElementInnerHTML = $('#2')[0].innerHTML;
            thirdElementInnerHTML = $('#3')[0].innerHTML;
        },
        restoreState: function () {
            var curActiveElement = Util.getActiveElement(),
                curDocument = Util.findDocument(curActiveElement);

            if (firstElementInnerHTML) {
                setInnerHTML($('#1'), firstElementInnerHTML);
                setInnerHTML($('#2'), secondElementInnerHTML);
                setInnerHTML($('#3'), thirdElementInnerHTML);
            }
        }
    };

    QUnit.testStart = function () {
        //before first test save page state
        if (!stateHelper.isStateSaved())
            stateHelper.saveState();
    };

    QUnit.testDone = function () {
        stateHelper.restoreState();
        if (!$.browser.msie)
            removeTestElements();
    };

    //tests
    module('regression tests');

    asyncTest('Wrong result of type action without option \'caretPos\'', function () {
        var $body = $('body'),
            $el = $('#2').find('p:first'),

            node = $el[0].childNodes[0],
            nodeValue = node.nodeValue,

            typingText = '123 test';

        $body.focus();
        equal(document.activeElement, $body[0]);

        async.series({
            'Type in child of body with contenteditable attribute': function (callback) {
                TypePlaybackAutomation.run($el[0], typingText, {}, function () {
                    callback();
                });
            },

            'Check result of typing': function () {
                equal(document.activeElement, $body[0]);
                checkSelection($body, node, nodeValue.length + typingText.length, node, nodeValue.length + typingText.length);
                equal($('#2').find('p:first')[0].childNodes[0].nodeValue, nodeValue + typingText.replace(' ', String.fromCharCode(160)), 'typing must be in the end of element from a parameter of act.type');
                startNext();

            }
        });
    });
});
