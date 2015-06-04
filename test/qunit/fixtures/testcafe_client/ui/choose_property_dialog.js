var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI,
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    ChoosePropertyDialog = TestCafeClient.get('UI.RecorderWidgets.ChoosePropertyDialog');

Hammerhead.init();
JavascriptExecutor.init();

//consts
var TEST_ELEMENT_CLASS = 'testElement',
    RECORDER_CLASS = 'recorder',
    PROPERTY_NAME_CLASS = 'property-name';

//vars
var $container = null,
    dialog = null,
    $testEl = null,
    resultCode = null,
    currentSelector = null,
    parsedSelector = null;

function removeTestElements() {
    $('.' + TEST_ELEMENT_CLASS).remove();
    $container.remove();
}

function getPropertyListItem(text) {
    return ShadowUI.select('.' + PROPERTY_NAME_CLASS).filter(function () {
        return $(this).text() === text;
    });
}

$(document).ready(function () {
    QUnit.testStart = function () {
        $container = $('<div></div>').appendTo(ShadowUI.getRoot());
        ShadowUI.addClass($container, RECORDER_CLASS);
    };

    QUnit.testDone = function () {
        dialog._close();
        removeTestElements();
        resultCode = null;
    };


    module('code generation');

    test('without properties', function () {
        $testEl = $('<div></div>').attr('id', 'id1').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        currentSelector = '$("#id1")';
        parsedSelector = JavascriptExecutor.parseSelectorSync(currentSelector, true);

        dialog = new ChoosePropertyDialog(parsedSelector);
        dialog.on(ChoosePropertyDialog.CONFIRM_BUTTON_CLICK_EVENT, function (e) {
            resultCode = e.text;
        });
        dialog.$nextButton.trigger('click');
        equal(resultCode, currentSelector + '.length > 0', 'check returned code');
        equal(eval(resultCode), true, 'check code eval results');
    });

    test('jQuery object length', function () {
        $testEl = $('<div></div>').addClass('class1').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        $('<div></div>').addClass('class1').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        currentSelector = '$(".class1")';
        parsedSelector = JavascriptExecutor.parseSelectorSync(currentSelector, true);
        dialog = new ChoosePropertyDialog(parsedSelector);
        dialog.on(ChoosePropertyDialog.CONFIRM_BUTTON_CLICK_EVENT, function (e) {
            resultCode = e.text;
        });
        getPropertyListItem('matching element count').trigger('click');
        dialog.$nextButton.trigger('click');
        equal(resultCode, currentSelector + '.length', 'check returned code');
        equal(eval(resultCode), 2, 'check code eval results');
    });

    test('jQuery object visible', function () {
        $testEl = $('<div></div>').addClass('class1').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        currentSelector = '$(".class1")';
        parsedSelector = JavascriptExecutor.parseSelectorSync(currentSelector, true);
        dialog = new ChoosePropertyDialog(parsedSelector);
        dialog.on(ChoosePropertyDialog.CONFIRM_BUTTON_CLICK_EVENT, function (e) {
            resultCode = e.text;
        });
        getPropertyListItem('visible').trigger('click');
        dialog.$nextButton.trigger('click');
        equal(resultCode, currentSelector + '.is(":visible")', 'check returned code');
        equal(eval(resultCode), true, 'check code eval results');

        $testEl.css('display', 'none');
        dialog = new ChoosePropertyDialog(parsedSelector);
        dialog.on(ChoosePropertyDialog.CONFIRM_BUTTON_CLICK_EVENT, function (e) {
            resultCode = e.text;
        });
        getPropertyListItem('visible').trigger('click');
        dialog.$nextButton.trigger('click');
        equal(resultCode, currentSelector + '.is(":visible")', 'check returned code');
        equal(eval(resultCode), false, 'check code eval results');
    });

    test('DOM element text', function () {
        var text = 'testText';
        $testEl = $('<div></div>').addClass('class1').addClass(TEST_ELEMENT_CLASS).appendTo('body');
        $testEl.text(text);
        currentSelector = 'document.getElementsByClassName("class1")[0]';
        parsedSelector = JavascriptExecutor.parseSelectorSync(currentSelector, true);
        dialog = new ChoosePropertyDialog(parsedSelector);
        dialog.on(ChoosePropertyDialog.CONFIRM_BUTTON_CLICK_EVENT, function (e) {
            resultCode = e.text;
        });
        getPropertyListItem('text').trigger('click');
        dialog.$nextButton.trigger('click');
        equal(resultCode, currentSelector + '.textContent', 'check returned code');
        equal(eval(resultCode), text, 'check code eval results');
    });

//    module('property list');
//
//    function getPropertyNamesInDialogPropertyList() {
//        var result = [];
//
//        var $items = ShadowUI.select('.' + PROPERTY_LIST_ITEM_CLASS);
//        for (var i = 0; i < $items.length; i++) {
//            if ($items.eq(i).is(':visible'))
//                result.push($items.eq(i).data('propertyName'));
//        }
//        return result;
//    }
//
//    test('collection of elements', function () {
//        $testEl = $('<div></div>').addClass('class1').addClass(TEST_ELEMENT_CLASS).appendTo('body');
//        $('<div></div>').addClass('class1').addClass(TEST_ELEMENT_CLASS).appendTo('body');
//        currentSelector = 'document.getElementsByClassName("class1")';
//        parsedSelector = JavascriptExecutor.parseSelectorSync(currentSelector, true);
//        dialog = new ChoosePropertyDialog(parsedSelector);
//        var propertyNames = getPropertyNamesInDialogPropertyList();
//        equal(propertyNames.length, 1, 'check amount of properties');
//        ok(propertyNames.indexOf('length') >= 0, 'property list contains length property');
//    });
});
