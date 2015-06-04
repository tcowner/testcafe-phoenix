(function () {
    TestCafeClient.define('Settings', {});

    HammerheadClient.define('Settings', function (require, exports) {
        exports.JOB_OWNER_TOKEN = 'ownerToken';
        exports.JOB_UID         = 'jobUid';
    });

    var UrlUtil = HammerheadClient.get('UrlUtil');

    UrlUtil.OriginLocation.get = function () {
        return 'https://example.com';
    };
})();

(function () {
    var Hammerhead        = HammerheadClient.get('Hammerhead'),
        $                 = Hammerhead.$,
        ShadowUI          = Hammerhead.ShadowUI,

        DraggingBehaviour = TestCafeClient.get('UI.DraggingBehavior');

    //Const
    var SETTINGS_PANEL_CLASS = 'settings-panel';

    $(document).ready(function () {
        //Settings panel
        var $root = ShadowUI.getRoot();

        var $settingsPanel = null;

        function createSettingsPanel () {
            $settingsPanel = $('<div></div>').width(500).addClass(SETTINGS_PANEL_CLASS).appendTo($root);

            function movePanelRight () {
                $settingsPanel.css('left', $(window).width() - $settingsPanel.width());
            }

            movePanelRight();

            window.addEventListener('resize', movePanelRight);

            //DraggingBehaviour.init($settingsPanel, $settingsPanel);

            var $title = $('<div></div>').addClass('title').text('Settings panel').appendTo($settingsPanel);
        }

        function _addBlock (title) {
            var $block = $('<div></div>').addClass('block').appendTo($settingsPanel);

            $('<div></div>').text(title).addClass('title').appendTo($block);

            return {
                addButton: function (name, onclick) {
                    _addButton(name, onclick, $block);
                },

                addInput: function (label, value, isNumber) {
                    return _addInput(label, value, isNumber, $block);
                },

                addCheckbox: function (label, checked) {
                    return _addCheckbox(label, checked, $block);
                },

                addSelect: function (label, items, onChange) {
                    return _addSelect(label, items, onChange, $settingsPanel);
                },

                remove: function () {
                    $block.remove();
                },

                clear: function () {
                    $block.find('*').filter(function () {
                        return !$(this).is('.title');
                    }).remove();
                }
            }
        }

        function _addButton (name, onclick, $container) {
            $('<button></button>').html(name).addClass('button').appendTo($container).on('click', onclick);
        }

        function _addInput (label, value, isNumber, $container) {
            var $inputArea = $('<div></div>').addClass('input-area').appendTo($container),
                $label     = $('<label></label>').addClass('label').text(label).appendTo($inputArea),
                $input     = $('<input type="text">').attr('value', value).addClass('input').appendTo($inputArea);

            return {
                getValue: function () {
                    var value = $input[0].value;

                    return isNumber ? parseInt(value) : value;
                }
            };
        }

        function _addCheckbox (label, checked, $container) {
            var $checkboxArea = $('<div></div>').addClass('checkbox-area').appendTo($container),
                $label        = $('<label></label>').addClass('label').text(label).appendTo($checkboxArea),
                $checkbox     = $('<input type="checkbox">').addClass('checkbox').appendTo($checkboxArea);

            if (typeof checked !== 'undefined') {
                $checkbox[0].checked = checked;
            }

            return {
                isChecked: function () {
                    return $checkbox[0].checked;
                }
            };
        }

        function _addSelect (label, items, onChange, $container) {
            var $selectArea = $('<div></div>').addClass('select-area').appendTo($container),
                $label      = $('<label></label>').addClass('label').text(label).appendTo($selectArea),
                $select     = $('<select></select>').addClass('select').appendTo($selectArea);

            for (var i = 0; i < items.length; i++) {
                $('<option></option>').text(items[i]).appendTo($select);
            }

            $select.change(function () {
                if (typeof onChange === 'function') {
                    onChange();
                }
            });

            return {
                getValue: function () {
                    return $select[0].value;
                }
            };
        }

        function _addLogArea ($container) {
            var $area = $('<div></div>').addClass('log').appendTo($container);

            return {
                clear: function () {
                    $area.html('');
                },
                log:   function (text) {
                    $('<div></div>').text(text).appendTo($area);
                    $area.scrollTop($area[0].scrollHeight);
                }
            }
        }

        function _addCreateActionBlock () {
            var panel        = window.TestCafeSandbox.settingsPanel,
                actions      = ['click', 'rclick', 'dblclick', 'drag', 'hover', 'press', 'select', 'type', 'wait'],
                optionsBlock = null,

                keys         = null,
                ms           = null,
                offsetX      = null,
                offsetY      = null,
                caretPos     = null,
                useOffsets   = null,
                inIFrame     = null,
                startPos     = null,
                endPos       = null,
                dragOffsetX  = null,
                dragOffsetY  = null,
                text         = null;

            function createOptions (action) {

                if (optionsBlock) {
                    optionsBlock.clear();
                }
                else {
                    optionsBlock = panel.addBlock('Step options');
                }

                if (action === 'hover') {
                }
                else if (action === 'press') {
                    keys = optionsBlock.addInput('keys: ', '');
                }
                else if (action === 'wait') {
                    ms = optionsBlock.addInput('ms: ', '');

                }
                else {

                    offsetX    = optionsBlock.addInput('offsetX: ', '');
                    offsetY    = optionsBlock.addInput('offsetY: ', '');
                    caretPos   = optionsBlock.addInput('caretPos: ', '');
                    useOffsets = optionsBlock.addCheckbox('useOffsets');
                    inIFrame   = optionsBlock.addCheckbox('inIFrame');

                    if (action === 'select') {
                        startPos = optionsBlock.addInput('startPos: ', '');
                        endPos   = optionsBlock.addInput('endPos: ', '');
                    }

                    if (action === 'drag') {
                        dragOffsetX = optionsBlock.addInput('dragOffsetX: ', '');
                        dragOffsetY = optionsBlock.addInput('dragOffsetY: ', '');
                    }

                    if (action === 'type') {
                        text = optionsBlock.addInput('text: ', '');
                    }
                }
            }

            function getStepInfo () {
                var action   = actionSelect.getValue(),
                    $el      = $('#testDiv'),
                    stepInfo = window.TestCafeSandbox.getDefaultStepInfo(action, $el),
                    args     = stepInfo.actionDescriptor.apiArguments;

                if (action === 'press') {
                    args.keysCommand = keys.getValue();
                }
                else if (action === 'wait') {
                    args.ms = ms.getValue();
                }
                else {
                    if (action !== 'hover') {
                        args.options.offsetX = offsetX.getValue();
                        args.options.offsetY = offsetY.getValue();
                        args.useOffsets      = useOffsets.isChecked();
                        stepInfo.useOffsets  = useOffsets.isChecked();

                        if (action !== 'drag') {
                            args.options.caretPos = caretPos.getValue();
                        }
                    }

                    if (action === 'select') {
                        args.startPos = startPos.getValue();
                        args.endPos   = endPos.getValue();
                    }

                    if (action === 'drag') {
                        args.dragOffsetX = dragOffsetX.getValue();
                        args.dragOffsetY = dragOffsetY.getValue();
                    }

                    if (action === 'type') {
                        args.text = text.getValue() || 'some text';
                    }

                    if (inIFrame.isChecked()) {
                        stepInfo.iFrameSelectors    = SelectorGenerator.generate($('iframe').eq(0));
                        stepInfo.iFameSelectorIndex = 0;
                        args.iFrameSelectors        = SelectorGenerator.generate($('iframe').eq(0));
                    }
                }

                return stepInfo;
            }

            var actionSelect = panel.addSelect('action: ', actions, function () {
                createOptions(actionSelect.getValue());
            });
            createOptions(actions[0]);

            return {
                getStepInfo: getStepInfo
            }
        }

        function _addCreateAssertionsStepBlock () {
            var panel          = window.TestCafeSandbox.settingsPanel,
                operators      = ['eq', 'notEq', 'ok', 'notOk'],
                argumentsBlock = null,

                argument1      = null,
                argument2      = null,
                message        = null;

            function createArguments (operator) {
                if (argumentsBlock) {
                    argumentsBlock.clear();
                }
                else {
                    argumentsBlock = panel.addBlock('Assertion options');
                }

                if (operator === 'eq' || operator === 'notEq') {
                    argument1 = argumentsBlock.addInput('actual: ', '');
                    argument2 = argumentsBlock.addInput('expected: ', '');
                }
                else {
                    argument1 = argumentsBlock.addInput('expression: ', '');
                }
                message = argumentsBlock.addInput('message: ', '');
            }

            function getStepInfo () {
                var operator = operatorSelect.getValue(),
                    stepInfo = window.TestCafeSandbox.getDefaultAssertionsStepInfo(operator);

                stepInfo.assertions[0].arguments[0] = argument1.getValue();
                if (stepInfo.assertions[0].arguments.length === 2) {
                    stepInfo.assertions[0].arguments[1] = argument2.getValue();
                }
                stepInfo.assertions[0].message = message.getValue();

                return stepInfo;
            }

            var operatorSelect = panel.addSelect('operator: ', operators, function () {
                createArguments(operatorSelect.getValue());
            });
            createArguments(operators[0]);

            return {
                getStepInfo: getStepInfo
            }
        }


        //API
        window.TestCafeSandbox = {
            settingsPanel: {
                create:                       createSettingsPanel,
                addBlock:                     _addBlock,
                addButton:                    function (name, onclick) {
                    _addButton(name, onclick, $settingsPanel);
                },
                addInput:                     function (label, value, isNumber) {
                    return _addInput(label, value, isNumber, $settingsPanel);
                },
                addSelect:                    function (label, items, onChange) {
                    return _addSelect(label, items, onChange, $settingsPanel);
                },
                addCheckbox:                  function (label, checked) {
                    return _addCheckbox(label, checked, $settingsPanel);
                },
                addLogArea:                   function () {
                    return _addLogArea($settingsPanel);
                },
                addCreateActionBlock:         _addCreateActionBlock,
                addCreateAssertionsStepBlock: _addCreateAssertionsStepBlock,
                getPanelElement:              function () {
                    return $settingsPanel;
                }
            }
        };

        //step info
        var SelectorGenerator  = TestCafeClient.get('Recorder.SelectorGenerator');
        var JavascriptExecutor = TestCafeClient.get('Base.JavascriptExecutor');
        JavascriptExecutor.init();

        window.TestCafeSandbox.getDefaultStepInfo = function (action, $el) {
            var stepInfo = {
                    currentSelectorIndex: 0,
                    name:                 'Action ' + action,
                    useOffsets:           false,
                    actionDescriptor:     {
                        prevPageState: null,
                        type:          action,
                        apiArguments:  {
                            options: {}
                        }
                    }
                },

                args     = stepInfo.actionDescriptor.apiArguments;

            if (action === 'press') {
                args.keysCommand = 'ctrl+a';
            }
            else if (action === 'wait') {
                args.ms = '2';
            }
            else {
                if ($el) {
                    stepInfo.selectors    = SelectorGenerator.generate($el);
                    args.element          = $el[0];
                    args.elementSelectors = SelectorGenerator.generate($el);
                }

                if (action !== 'hover') {
                    args.options.ctrl    = false;
                    args.options.alt     = true;
                    args.options.shift   = false;
                    args.options.meta    = false;
                    args.options.offsetX = '';
                    args.options.offsetY = '';
                    args.useOffsets      = false;

                    if (action !== 'drag') {
                        args.options.caretPos = '';
                    }
                }

                if (action === 'select') {
                    args.startPos = 1;
                    args.endPos   = 2;
                }

                if (action === 'drag') {
                    args.dragOffsetX = 1;
                    args.dragOffsetY = 1;
                }

                if (action === 'type') {
                    args.text = 'text';
                }


            }

            return stepInfo;
        };

        window.TestCafeSandbox.getDefaultAssertionsStepInfo = function (operator) {
            return {
                name:        'Default name',
                isAssertion: true,
                assertions:  [
                    {
                        operator:  operator,
                        arguments: new Array(/eq/i.test(operator) ? 2 : 1)
                    }
                ]
            };
        };
    });
})();