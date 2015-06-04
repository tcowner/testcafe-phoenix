var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    StepWidget = TestCafeClient.get('UI.RecorderWidgets.ActionStep'),
    SelectorGenerator = TestCafeClient.get('Recorder.SelectorGenerator'),
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    CodeEditorWidget = TestCafeClient.get('UI.RecorderWidgets.CodeEditor'),
    SelectorEditorWidget = TestCafeClient.get('UI.RecorderWidgets.SelectorEditor');

Hammerhead.init();
JavascriptExecutor.init();

//consts
var TEST_ELEMENT_CLASS = 'testElement';

//vars
var $stepArea = null,
    stepNum = null,
    stepInfo = null,
    step = null;

var createActionDescriptor = function (type, $element, selectors, arguments) {
    var actionDescriptor = {
        type: type,
        element: $element[0],
        elementSelectors: selectors
    };
    if (arguments)
        actionDescriptor.apiArguments = arguments;

    return actionDescriptor;
};

var createInput = function (id) {
    return $('<input type="button">').attr('id', id).addClass(TEST_ELEMENT_CLASS).appendTo('body');
};

var removeTestElements = function () {
    $('.' + TEST_ELEMENT_CLASS).remove();
    $stepArea.remove();
    stepInfo = null;
    step = null;
};

$(document).ready(function () {
    QUnit.testDone = function () {
        removeTestElements();
    };

    test('B253452 - After change element selector in add action dialog change action works incorrect', function () {
        var $input1 = createInput("1"),
            $input2 = createInput("2"),

            selectorsInput1 = SelectorGenerator.generate($input1),
            options = {
                alt: false,
                ctrl: false,
                meta: false,
                shift: false,
                caretPos: '',
                offsetX: '',
                offsetY: ''
            };

        stepNum = 1;
        $stepArea = $('<div></div>').appendTo($('body')[0]);
        stepInfo = {
            actionDescriptor: createActionDescriptor('click', $input1, selectorsInput1, {
                options: options
            }),
            currentSelectorIndex: 0,
            name: 'click on input type button',
            selectors: selectorsInput1
        };

        step = new StepWidget($stepArea, stepNum, stepInfo);

        step.selectorEditor.codeEditor.setText('$("#2")');
        step.selectorEditor.codeEditor._textChanged();

        var newStepInfo = step.getStepInfo();

        equal(newStepInfo.actionDescriptor.selector, '$("#2")');
    });

    test('B254631 - Wrong selector validation when selector has errors or selector is empty', function () {
        var $input = createInput("1"),
            error = null,

            selectorsInput1 = SelectorGenerator.generate($input),
            options = {
                alt: false,
                ctrl: false,
                meta: false,
                shift: false,
                caretPos: '',
                offsetX: '',
                offsetY: ''
            };

        stepNum = 1;
        $stepArea = $('<div></div>').appendTo($('body')[0]);
        stepInfo = {
            actionDescriptor: createActionDescriptor('click', $input, selectorsInput1, {
                options: options
            }),
            currentSelectorIndex: 0,
            name: 'click on input type button',
            selectors: selectorsInput1
        };

        step = new StepWidget($stepArea, stepNum, stepInfo);

        var currentSelectorResult = step.selectorEditor.getParsedSelector();

        equal(currentSelectorResult.length, currentSelectorResult.visibleLength, 'selector doesn\'t have invisible elements');
        equal(currentSelectorResult.error, '', 'selector doesn\'t have error');
        equal(currentSelectorResult.$elements[0], $input[0], 'selector has input in $elements');


        try {
            step.selectorEditor.codeEditor.setText('$("#2"');
            step.selectorEditor.codeEditor._textChanged();
        }
        catch (err) {
            error = err;
        }

        ok(!error, 'selector was parsed correctly');

        currentSelectorResult = step.selectorEditor.getParsedSelector();
        equal(currentSelectorResult.$elements, null, 'selector doesn\'t have elements');
        notEqual(currentSelectorResult.error, '', 'selector has error');
    });
});
