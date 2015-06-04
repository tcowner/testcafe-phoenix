var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util,
    StepNameGenerator = TestCafeClient.get('Recorder.StepNameGenerator');

$(document).ready(function () {
    var RESULTS_DICTIONARY = {
        'linkWithText': 'Click link "LinkText"',
        'linkWithTitleOnly': 'Click link "LinkTitle"',
        'tagPWithLongText': 'Click paragraph "Lor-ip, do_lor sit..."',
        'tagH1': 'Click ' + '<' + 'h1' + '> ' + '"Headerheader, h1..."',
        'inputWithoutType': 'Click input "Label for Input..."',
        'textInput': 'Click input',
        'passwordInput': 'Click password input "ThisItPasswordInput"',
        'hiddenInput': 'Click hidden input',
        'fileInput': 'Click file button',
        'imageInput': 'Click image button "altAttrForImageInput"',
        'radioInput': 'Click radio button "RadioInputTitle"',
        'checkboxInput': 'Click check box "on"',
        'submitInput': 'Click submit button "SubmitItNow"',
        'resetInput': 'Click reset button "Label Reset"',
        'buttonInput': 'Click button',
        'divWithTextWithoutSpaces': 'Drag div "1234567890123456789..."',
        'divWithMaxLengthText': 'Drag div "12345678901234567890"',
        'formWithName': 'Hover over form "formInputs"',
        'textareaWithLabel': 'Type in text area "Label for Textarea"',
        'textareaWithTitle': 'Type in text area "This is textarea..."',
        'formWithoutName': 'Click form',
        'figureWithFigcaption': 'Click figure "Figcaption for..."',
        'figureWithoutFigcaption': 'Click figure "Text In Figure"',
        'detailWithSummary': 'Click details "Detail summary"',
        'detailWithTitle': 'Click details "detail title"',
        'fieldsetWithLegend': 'Click fieldset "Fieldset legend"',
        'fieldsetWithoutLegend': 'Click fieldset "fieldset title"',
        'imgWithAlt': 'Click image "Some image"',
        'imgWithTitle': 'Click image "imageTitle"',
        'buttonWithoutType': 'Click submit button',
        'buttonWithTypeButton': 'Click button',
        'submitButton': 'Click submit button',
        'resetButton': 'Click reset button',
        'tableWithCaption': 'Click table "Table Caption"',
        'tableColumn1': 'Click header cell "Column1"',
        'tableRow1': 'Click table row',
        'tableCell2': 'Click table cell "Cell2"',
        'html': 'Dblclick html',
        'body': 'Rclick body',
        'divRussian': 'Click div "Я бы, русский..."',
        'divWithoutOwnText': 'Click div',
        'forPressShift': 'Press key SHIFT',
        'forPressCtrlAlt': 'Press key combination CTRL+ALT',
        'forWaitAction': 'Wait 555 milliseconds',
        'T122792': 'Click input "Имя *"',
        'fieldsetWithLongLegendTitle': 'Click fieldset "legend title with..."'

    };
    var createActionDescriptor = function (type, $element, argument) {
        var actionDescriptor = {
            type: type,
            element: $element[0]
        };
        if (!argument)
            return actionDescriptor;
        else if (type === 'press')
            actionDescriptor.apiArguments = {
                keysCommand: argument
            };
        else
            actionDescriptor.apiArguments = {
                ms: argument
            };
        return actionDescriptor;
    };

    var assertStepName = function (actionType, $element, argument) {
        strictEqual(StepNameGenerator.generateStepName(createActionDescriptor(actionType, $element, argument)), RESULTS_DICTIONARY[$element[0].id || $element[0].tagName.toLowerCase()]);
    };

    test('test click on links', function () {
        assertStepName('click', $('#linkWithText'));
        assertStepName('click', $('#linkWithTitleOnly'));
    });

    test('test click on paragraph with long text', function () {
        assertStepName('click', $('#tagPWithLongText'));
    });

    test('test click h1', function () {
        assertStepName('click', $('#tagH1'));
    });

    test('test click inputs', function () {
        assertStepName('click', $('#inputWithoutType'));
        assertStepName('click', $('#textInput'));
        assertStepName('click', $('#passwordInput'));
        assertStepName('click', $('#hiddenInput'));
        assertStepName('click', $('#fileInput'));
        assertStepName('click', $('#imageInput'));
        assertStepName('click', $('#radioInput'));
        assertStepName('click', $('#checkboxInput'));
        assertStepName('click', $('#submitInput'));
        //NOTE: in IE input with type reset have default value = "Reset"
        var $resetInput = $('#resetInput');
        $resetInput.attr('value', '');
        assertStepName('click', $resetInput);
        assertStepName('click', $('#buttonInput'));
    });

    test('test click buttons', function () {
        var buttonWithoutType = $('<button id="buttonWithoutType"></button>'),
            buttonWithTypeButton = $('<button type="button" id="buttonWithTypeButton"></button>'),
            submitButton = $('<button type="submit" id="submitButton"></button>'),
            resetButton = $('<button type="reset" id="resetButton"></button>');
        $('iframe[name="iframe1"]').contents().find('body').append(buttonWithoutType[0]);
        $('iframe[name="iframe1"]').contents().find('body').append(buttonWithTypeButton[0]);
        $('iframe[name="iframe1"]').contents().find('body').append(submitButton[0]);
        $('iframe[name="iframe1"]').contents().find('body').append(resetButton[0]);
        assertStepName('click', buttonWithoutType);
        assertStepName('click', buttonWithTypeButton);
        assertStepName('click', submitButton);
        assertStepName('click', resetButton);
    });

    test('test drag divs', function () {
        assertStepName('drag', $('#divWithTextWithoutSpaces'));
        assertStepName('drag', $('#divWithMaxLengthText'));
    });

    test('test click and hover over forms', function () {
        assertStepName('hover', $('#formWithName'));
        assertStepName('click', $('#formWithoutName'));
    });

    test('test type in textareas', function () {
        assertStepName('type', $('#textareaWithLabel'));
        assertStepName('type', $('#textareaWithTitle'));
    });

    test('test click figure and its elements', function () {
        assertStepName('click', $('#imgWithAlt'));
        assertStepName('click', $('#imgWithTitle'));
    });

    test('test click details', function () {
        if (!Util.isIE)
            assertStepName('click', $('#detailWithSummary'));
        assertStepName('click', $('#detailWithTitle'));
    });

    test('test click fieldsets', function () {
        assertStepName('click', $('#fieldsetWithLegend'));
        assertStepName('click', $('#fieldsetWithoutLegend'));
    });

    test('test click table and its elements', function () {
        assertStepName('click', $('#tableWithCaption'));
        assertStepName('click', $('#tableColumn1'));
        assertStepName('click', $('#tableRow1'));
        assertStepName('click', $('#tableCell2'));
    });

    test('test click body and html', function () {
        assertStepName('dblclick', $('html'));
        assertStepName('rclick', $('body'));
    });

    test('test russian text', function () {
        assertStepName('click', $('#divRussian'));
    });

    test('test B233445 - Wrong step name generated on mail.ru site', function () {
        assertStepName('click', $('#divWithoutOwnText'));
    });

    test('test press actions', function () {
        assertStepName('press', $('#forPressShift'), 'shift');
        assertStepName('press', $('#forPressCtrlAlt'), 'ctrl+alt');
    });

    test('test wait action', function () {
        assertStepName('wait', $('#forWaitAction'), 555);
    });

    module('regression');

    test('T122792 - Spaces are not cut in step name that contains label\'s text', function () {
        assertStepName('click', $('#T122792'));
    });

    test('Wrong generation step name for click on fieldset with long legend title', function () {
        assertStepName('click', $('#fieldsetWithLongLegendTitle'));
    });
});
