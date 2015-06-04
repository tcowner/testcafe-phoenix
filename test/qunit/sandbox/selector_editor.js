var Hammerhead         = HammerheadClient.get('Hammerhead'),
    $                  = Hammerhead.$,
    ShadowUI           = Hammerhead.ShadowUI,
    IFrameSandbox      = HammerheadClient.get('DOMSandbox.IFrame'),

    SelectorEditor     = TestCafeClient.get('UI.RecorderWidgets.SelectorEditor'),
    SelectorGenerator  = TestCafeClient.get('Recorder.SelectorGenerator'),
    JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor');

Hammerhead.init();

$(document).ready(function () {
    var selectorEditor    = null,
        crossDomainIFrame = $('#crossDomain')[0];

    crossDomainIFrame.src = 'http://localhost:1336/simple_page.html';


    JavascriptExecutor.init();

    function createSettingsPanel () {
        var $root                    = ShadowUI.getRoot(),
            $recorder                = $('<div></div>').appendTo($root),
            $step                    = $('<div></div>').appendTo($recorder),
            $rightArea               = $('<div></div>').appendTo($step),
            $selectorEditorContainer = null;

        ShadowUI.addClass($recorder, 'recorder');
        ShadowUI.addClass($step, 'step');
        ShadowUI.addClass($step, 'action-step');
        ShadowUI.addClass($rightArea, 'right-area');

        $rightArea.css({
            width:           600,
            height:          300,
            position:        'absolute',
            top:             200,
            left:            100,
            backgroundColor: 'lightyellow',
            padding:         '20px',
            zIndex:          2147483646
        });

        var settingsPanel = window.TestCafeSandbox.settingsPanel;

        settingsPanel.create();

        var enableFloatMode       = settingsPanel.addCheckbox('enableFloatMode', true),
            enableValidation      = settingsPanel.addCheckbox('enableValidation', true),
            enableElementsMarking = settingsPanel.addCheckbox('enableElementsMarking', true),
            allowEdit             = settingsPanel.addCheckbox('allowEdit', true),
            editorWidth           = settingsPanel.addInput('width', '100%'),
            editorHeight          = settingsPanel.addInput('height', '100%');

        function createSelectorEditor (opts) {
            $selectorEditorContainer = $('<div></div>').appendTo($rightArea);
            ShadowUI.addClass($selectorEditorContainer, 'selector-editor-container');

            var options = $.extend({
                width:                 editorWidth.getValue(),
                height:                editorHeight.getValue(),
                selectors:             SelectorGenerator.generate($('#testDiv')),
                currentSelectorIndex:  0,
                enableFloatMode:       enableFloatMode.isChecked(),
                $floatingParent:       $rightArea,
                enableValidation:      enableValidation.isChecked(),
                enableElementsMarking: enableElementsMarking.isChecked(),
                allowEdit:             allowEdit.isChecked()
            }, opts || {});

            selectorEditor = new SelectorEditor($selectorEditorContainer, options);

            selectorEditor.on(SelectorEditor.SELECTOR_CHANGED_EVENT, function (e) {
                panelConsole.log('--change even-- ' + e.text);
                panelConsole.log('text: ' + e.text);
                panelConsole.log('selector index: ' + e.index);
            });

            selectorEditor.on(SelectorEditor.FOCUS_EVENT, function () {
                panelConsole.log('focus');
            });

            selectorEditor.on(SelectorEditor.BLUR_EVENT, function () {
                panelConsole.log('blur');
            });
        }

        settingsPanel.addButton('Create Selector Editor', function () {
            createSelectorEditor();
        });

        settingsPanel.addButton('Create Selector Editor With IFrame Context', function () {
            createSelectorEditor({
                context: crossDomainIFrame.contentWindow
            });
        });

        settingsPanel.addButton('Remove Selector Editor', function () {
            if (selectorEditor) {
                selectorEditor.destroy();
            }
            if ($selectorEditorContainer) {
                $selectorEditorContainer.remove();
            }
        });

        var panelConsole = settingsPanel.addLogArea();

        settingsPanel.addButton('Clear log', function () {
            panelConsole.clear();
        });

        var $lastRemovedDiv = null;
        settingsPanel.addButton('Remove first div', function () {
            $lastRemovedDiv = $('div').eq(0).remove();
        });

        settingsPanel.addButton('Restore first div', function () {
            if ($lastRemovedDiv) {
                $lastRemovedDiv.prependTo('body');
            }

            $lastRemovedDiv = null;
        });
    }

    createSettingsPanel();
});