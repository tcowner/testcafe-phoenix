var Hammerhead          = HammerheadClient.get('Hammerhead'),
    IFrameSandbox       = HammerheadClient.get('DOMSandbox.IFrame'),
    $                   = Hammerhead.$,
    ShadowUI            = Hammerhead.ShadowUI,
    Util                = Hammerhead.Util,
    JavascriptExecutor  = TestCafeClient.get('Base.JavascriptExecutor'),
    EditAssertionDialog = TestCafeClient.get('UI.RecorderWidgets.EditAssertionDialog');

Hammerhead.init();
JavascriptExecutor.init();

//consts
var TEST_ELEMENT_CLASS      = 'testElement',
    RECORDER_CLASS          = 'recorder',
    IFRAME_RESPONSE_TIMEOUT = 500,
    IFRAME_LOADING_TIMEOUT  = 1000;

//vars
var $container                = null,
    dialog                    = null,
    assertion                 = null,
    $crossDomainIFrame        = null,
    crossDomainIFrameSelector = '$("#crossDomainIFrame")',
    crossDomainIFrameLoaded   = false;

var removeTestElements = function () {
    $('.' + TEST_ELEMENT_CLASS).remove();
};

$(document).ready(function () {
    IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, function (e) {
        e.iframe.contentWindow.eval.call(e.iframe.contentWindow, [
            'HammerheadClient.define(\'Settings\', function (require, exports) {',
            '    exports.JOB_OWNER_TOKEN = "ownerToken";',
            '    exports.JOB_UID = "jobUid";',
            '});',
            'var UrlUtil = HammerheadClient.get("UrlUtil");',
            'UrlUtil.OriginLocation.get = function() { return "https://example.com"; };',
            'HammerheadClient.get(\'Hammerhead\').init();'
        ].join(''));
    });

    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);

    $crossDomainIFrame        = $('<iframe id="crossDomainIFrame"></iframe>').appendTo('body');
    $crossDomainIFrame[0].src = 'http://' + window.location.hostname + ':1336/object_viewer.html';
    $crossDomainIFrame.load(function () {
        crossDomainIFrameLoaded = true;
    });

    QUnit.testStart = function () {
        if (!$container) {
            $container = $('<div></div>');
            ShadowUI.addClass($container, RECORDER_CLASS);
            $container.appendTo(ShadowUI.getRoot());
        }
    };

    QUnit.testDone = function () {
        removeTestElements();
        if (dialog && dialog.$cancelButton && dialog.$cancelButton.is(':visible')) {
            dialog.$cancelButton.trigger('click');
            dialog = null;
        }
        assertion = null;
    };

    function createDialog (operator, arguments, iframeSelector) {
        assertion = {
            operator:  operator,
            arguments: arguments
        };

        var options = {
            enableAssertionValidation: true
        };

        if (iframeSelector) {
            options.iFrameSelector = iframeSelector;
        }

        dialog = new EditAssertionDialog(assertion, options);

        dialog.on(EditAssertionDialog.CONFIRM_BUTTON_CLICK_EVENT, function (e) {
            assertion = e.assertionInfo;
        });
    }

    function isAssertionSuccessful () {
        if (dialog.$stateIndicator) {
            return /passed/i.test(dialog.$stateIndicator.text());
        }
        else {
            return false;
        }
    }

    function isCopyButtonEnabled () {
        return dialog.$copyButton && !dialog.$copyButton.attr('disabled');
    }

    function runCrossDomainIFrameTest (testFunc) {
        if (!crossDomainIFrameLoaded) {
            waitForIFrame(testFunc);
        }
        else {
            testFunc();
        }
    }

    function waitForIFrame (testFunc) {
        if (!crossDomainIFrameLoaded) {
            window.setTimeout(function () {
                waitForIFrame(testFunc);
            }, IFRAME_LOADING_TIMEOUT);
        }
        else {
            window.setTimeout(testFunc, IFRAME_LOADING_TIMEOUT);
        }
    }

    function checkConfirmButtonDisabled () {
        ok(dialog.$confirmButton.attr('disabled'), 'check that confirm button is disabled');
    }

    function checkCopyButtonSynchronously (expectedValue) {
        ok(isCopyButtonEnabled(), 'check that copy button is visible');
        if (isCopyButtonEnabled()) {
            dialog.$copyButton.trigger('click');
            equal(dialog.expected.value, expectedValue, 'check that actual value was copied to expected argument input');
            ok(isAssertionSuccessful(), 'check that assertion is successful');
            dialog.$confirmButton.trigger('click');
            equal(assertion.arguments[1], expectedValue, 'check that actual value was copied to expected argument');
        }
    }

    function checkCopyButtonAsynchronously (expectedValue) {
        window.setTimeout(function () {
            ok(isCopyButtonEnabled(), 'check that copy button is visible');
            if (isCopyButtonEnabled()) {
                dialog.$copyButton.trigger('click');
                equal(dialog.expected.value, expectedValue, 'check that actual value was copied to expected argument input');
                window.setTimeout(function () {
                    dialog.$confirmButton.trigger('click');
                    equal(assertion.arguments[1], expectedValue, 'check that actual value was copied to expected argument');

                    start();
                }, IFRAME_RESPONSE_TIMEOUT);
            }
            else {
                start();
            }
        }, IFRAME_RESPONSE_TIMEOUT);
    }

    module('validation');

    test('empty assertion', function () {
        createDialog('ok', [undefined]);

        checkConfirmButtonDisabled();
    });

    test('invalid javascript', function () {
        createDialog('ok', ['$(']);

        checkConfirmButtonDisabled();
    });

    module('copy button');

    test('string in actual value', function () {
        $('<div></div>').addClass(TEST_ELEMENT_CLASS).text('test').attr('id', 'div1').appendTo('body');

        createDialog('eq', ['$("#div1").text()', undefined]);

        checkCopyButtonSynchronously('"test"');
    });

    test('number in actual value', function () {
        $('<div></div>').addClass(TEST_ELEMENT_CLASS).text('test').attr('id', 'div1').appendTo('body');

        createDialog('eq', ['$("#div1").length', undefined]);

        checkCopyButtonSynchronously('1');
    });

    test('boolean in actual value', function () {
        $('<div></div>').addClass(TEST_ELEMENT_CLASS).attr('id', 'div1').appendTo('body');

        createDialog('eq', ['$("#div1").is(":visible")', undefined]);

        checkCopyButtonSynchronously('true');
    });

    test('array without objects in actual value', function () {
        createDialog('eq', ['["test", [0.5, 0.7, 0.33], 1]', undefined]);

        checkCopyButtonSynchronously('["test", [0.5, 0.7, 0.33], 1]');
    });

    test('empty actual value', function () {
        createDialog('eq', [undefined, undefined]);

        ok(!isCopyButtonEnabled(), 'check that copy button is not visible');
    });

    test('error in actual value', function () {
        createDialog('eq', ['"test', undefined]);

        ok(!isCopyButtonEnabled(), 'check that copy button is not visible');
    });

    test('object in actual value', function () {
        $('<div></div>').addClass(TEST_ELEMENT_CLASS).attr('id', 'div1').appendTo('body');

        createDialog('eq', ['$("#div1")', undefined]);

        ok(!isCopyButtonEnabled(), 'check that copy button is not visible');
    });

    test('array with objects in actual value', function () {
        createDialog('eq', ['["test", [0.5, 0.7, $()], 1]', undefined]);

        ok(!isCopyButtonEnabled(), 'check that copy button is not visible');
    });

    module('copy button - iframe');

    asyncTest('string in actual value', function () {
        runCrossDomainIFrameTest(function () {

            createDialog('eq', ['$("#testDiv")[0].innerHTML', undefined], crossDomainIFrameSelector);

            checkCopyButtonAsynchronously('"div text"');
        });
    });

    asyncTest('number in actual value', function () {
        runCrossDomainIFrameTest(function () {

            createDialog('eq', ['$("div").length', undefined], crossDomainIFrameSelector);

            checkCopyButtonAsynchronously('2');
        });
    });

    asyncTest('boolean in actual value', function () {
        runCrossDomainIFrameTest(function () {

            createDialog('eq', ['window.self === window.top', undefined], crossDomainIFrameSelector);

            checkCopyButtonAsynchronously('false');
        });
    });

    asyncTest('array without objects in actual value', function () {
        runCrossDomainIFrameTest(function () {

            createDialog('eq', ['["test", [0.5, 0.7, 0.33], 1]', undefined], crossDomainIFrameSelector);

            checkCopyButtonAsynchronously('["test", [0.5, 0.7, 0.33], 1]');
        });
    });

    asyncTest('empty actual value', function () {
        runCrossDomainIFrameTest(function () {

            createDialog('eq', [undefined, undefined], crossDomainIFrameSelector);

            window.setTimeout(function () {

                ok(!isCopyButtonEnabled(), 'check that copy button is not visible');

                start();

            }, IFRAME_RESPONSE_TIMEOUT);
        });
    });

    asyncTest('error in actual value', function () {
        runCrossDomainIFrameTest(function () {

            createDialog('eq', ['"test', undefined], crossDomainIFrameSelector);

            window.setTimeout(function () {

                ok(!isCopyButtonEnabled(), 'check that copy button is not visible');

                start();

            }, IFRAME_RESPONSE_TIMEOUT);
        });
    });

    asyncTest('object in actual value', function () {
        runCrossDomainIFrameTest(function () {

            createDialog('eq', ['$("div")', undefined], crossDomainIFrameSelector);

            window.setTimeout(function () {

                ok(!isCopyButtonEnabled(), 'check that copy button is not visible');

                start();

            }, IFRAME_RESPONSE_TIMEOUT);
        });
    });

    asyncTest('array with objects in actual value', function () {
        runCrossDomainIFrameTest(function () {

            createDialog('eq', ['["test", [0.5, 0.7, $()], 1]', undefined], crossDomainIFrameSelector);

            window.setTimeout(function () {

                ok(!isCopyButtonEnabled(), 'check that copy button is not visible');

                start();

            }, IFRAME_RESPONSE_TIMEOUT);
        });
    });

    asyncTest('window.top in actual value', function () {
        runCrossDomainIFrameTest(function () {

            var browserRaisesCrossDomainAccessErrors = false;

            try {
                void $crossDomainIFrame.contents().body;
            }
            catch (e) {
                browserRaisesCrossDomainAccessErrors = true;
            }

            createDialog('eq', ['window.top', undefined], crossDomainIFrameSelector);

            window.setTimeout(function () {

                if (browserRaisesCrossDomainAccessErrors) {
                    ok(!dialog.actual.isValid(), 'check that actual argument has error')
                }
                ok(!isCopyButtonEnabled(), 'check that copy button is not visible');

                start();

            }, IFRAME_RESPONSE_TIMEOUT);
        });
    });

    module('regression');

    test('copy button should became disabled after removing the actual value', function () {
        createDialog('eq', ['80085', undefined]);

        ok(isCopyButtonEnabled(), 'check that copy button is visible');
        dialog.actual.setValue('');
        ok(!isCopyButtonEnabled(), 'check that copy button is not visible');
    });

    test('create assertion for element text with \" \' \\r \\n \\ &nbsp; symbols', function () {
        $('<div></div>').addClass(TEST_ELEMENT_CLASS).html('test \\n &nbsp; test').attr('id', 'div1').appendTo('body');
        $('<div></div>').addClass(TEST_ELEMENT_CLASS).text('test \r\n " \' \xa0 \\xa0 test').attr('id', 'div2').appendTo('body');

        createDialog('eq', ['$("#div1").text() + $("#div2").text()', undefined]);

        checkCopyButtonSynchronously('"test \\\\n \\xA0 testtest \\r\\n \\" \' \\xA0 \\\\xa0 test"');
    });
});
