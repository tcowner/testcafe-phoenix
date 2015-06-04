var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    ShadowUI = Hammerhead.ShadowUI,
    Util = Hammerhead.Util,
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    ButtonWidget = TestCafeClient.get('UI.RecorderWidgets.Button'),
    PopupWidget = TestCafeClient.get('UI.RecorderWidgets.Popup');

Hammerhead.init();
JavascriptExecutor.init();

//consts
var TEST_ELEMENT_CLASS = 'testElement',
    RECORDER_CLASS = 'recorder',
    BUTTONS_CLASS = 'buttons';

//vars
var $container = null,
    popup = null;

var removeTestElements = function () {
    $('.' + TEST_ELEMENT_CLASS).remove();
};

$(document).ready(function () {
    QUnit.testStart = function () {
        if (!$container) {
            $container = $('<div></div>');
            ShadowUI.addClass($container, RECORDER_CLASS);
            $container.appendTo(ShadowUI.getRoot());
        }
    };

    QUnit.testDone = function () {
        removeTestElements();
        if (popup) {
            popup.close();
            popup = null;
        }
    };

    function createPopup(options) {
        options = options || {};

        var popupOptions = {
            width: options.width || 500,
            headerText: options.headerText || "test",
            content: options.content || $('<div></div>').appendTo($container),
            footerContent: options.footerContent || createButtons(),
            headerCloseButton: options.headerCloseButton || true
        };

        popup = new PopupWidget($container, popupOptions);
    }

    function createButtons() {
        var $buttons = $('<div></div>');
        ShadowUI.addClass($buttons, BUTTONS_CLASS);

        this.$confirmButton = ButtonWidget.create($buttons, 'OK');
        this.$cancelButton = ButtonWidget.create($buttons, 'Cancel');

        return $buttons;
    }

    module('Regression');

    test('popup positioning relative to element if window is scrolled down (T171045)', function () {
        var bigDivHeight = 10000,
            targetDivHeight = 200,
            $bigDiv = $('<div>').addClass(TEST_ELEMENT_CLASS).css('height', bigDivHeight + 'px').appendTo('body'),
            $targetDiv = $('<div>').addClass(TEST_ELEMENT_CLASS).css('height', targetDivHeight + 'px').appendTo('body');

        window.scrollTo(0, bigDivHeight);

        createPopup();

        ok(popup._getPopupRelativePosition($targetDiv).top < $(window).height());

        popup.disposeRelativeToElement($targetDiv);

        var popupTop = parseInt(popup.$popup.css('top'));

        ok(popupTop > 0 && popupTop + popup.$popup.height() < $(window).height() - targetDivHeight);
    });
});
