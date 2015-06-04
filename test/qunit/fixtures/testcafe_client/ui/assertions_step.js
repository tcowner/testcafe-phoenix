var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor'),
    AssertionsStep = TestCafeClient.get('UI.RecorderWidgets.AssertionsStep');

Hammerhead.init();
JavascriptExecutor.init();

//consts
var TEST_ELEMENT_CLASS = 'testElement';

//vars
var $stepArea = null,
    step = null;

var removeTestElements = function () {
    $('.' + TEST_ELEMENT_CLASS).remove();
    $stepArea.remove();
};

$(document).ready(function () {
    QUnit.testStart = function () {
        $stepArea = $('<div></div>').appendTo($('body')[0]);
    };

    QUnit.testDone = function () {
        removeTestElements();
        step.destroy();
    };

    test('empty step must be not valid', function () {
        var stepInfo = {
            isAssertion: true,
            stepName: 'name',
            blocks: []
        };

        step = new AssertionsStep($stepArea, 1, stepInfo);

        ok(!step.isValid(), 'check that the step is not valid');
    });

    test('not empty step must be valid', function () {
        var stepInfo = {
            isAssertion: true,
            stepName: 'name',
            blocks: [
                {
                    assertions: [
                        {
                            operator: 'ok',
                            arguments: ['true']
                        }
                    ]
                }
            ]
        };

        step = new AssertionsStep($stepArea, 1, stepInfo);

        ok(step.isValid(), 'check that the step is not valid');
    });

});
