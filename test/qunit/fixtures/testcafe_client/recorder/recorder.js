var Hammerhead        = HammerheadClient.get('Hammerhead'),
    IFrameSandbox     = HammerheadClient.get('DOMSandbox.IFrame'),
    $                 = Hammerhead.$,
    async             = Hammerhead.async,
    ShadowUI          = Hammerhead.ShadowUI,
    EventSandbox = Hammerhead.EventSandbox,
    Util = Hammerhead.Util,
    DOMSandbox = HammerheadClient.get('DOMSandbox'),
    Settings = TestCafeClient.get('Settings'),
    Automation        = TestCafeClient.get('Automation'),
    Transport         = TestCafeClient.get('Base.Transport'),
    ServiceCommands   = TestCafeClient.get('Shared.ServiceCommands'),
    StepNameGenerator = TestCafeClient.get('Recorder.StepNameGenerator'),
    RecorderUI        = TestCafeClient.get('UI.Recorder'),
    Recorder          = TestCafeClient.get('Recorder.Recorder'),
    EventListener     = TestCafeClient.get('Recorder.EventListener');
    PopupWidget = TestCafeClient.get('UI.RecorderWidgets.Popup'),
    ButtonWidget = TestCafeClient.get('UI.RecorderWidgets.Button');

Hammerhead.init();
DOMSandbox.raiseBodyCreatedEvent();

var DEFAULT_STEP_NAME_PREFIX = 'step_';

var currentStepsInfo     = null,
    actionParsedCallback = null,
    saveTestCallback     = null,
    stepNameCounter      = 0;

var serviceMsg = function (msg, callback) {
    if (msg.cmd === ServiceCommands.STEPS_INFO_GET) {
        callback({
            stepsInfo: currentStepsInfo || []
        });
    }


    if (msg.cmd === ServiceCommands.STEPS_INFO_SET) {
        currentStepsInfo = msg.stepsInfo;
    }
};

Transport.asyncServiceMsg       = serviceMsg;
Transport.queuedAsyncServiceMsg = serviceMsg;

var savedEventListenerStart = EventListener.start;

EventListener.start = function (callback, options) {
    actionParsedCallback = callback;
    savedEventListenerStart(callback, options);
};

RecorderUI.events.on = function (ev, callback) {
    if (ev === 'saveTest') {
        saveTestCallback = callback;
    }
};

StepNameGenerator.generateStepName = function () {
    return DEFAULT_STEP_NAME_PREFIX + stepNameCounter++;
};

var actionDescriptorBuilders = {
        click: {
            getActionDescriptor: function (useOffsets) {
                return $.extend(true, {}, Automation.defaultMouseActionDescriptor, {
                    type:         'click',
                    element:      $('<div></div>').appendTo('body')[0],
                    selector:     '#selector',
                    apiArguments: {
                        options: {
                            ctrl:    false,
                            alt:     false,
                            shift:   false,
                            meta:    false,
                            offsetX: '',
                            offsetY: ''
                        }
                    },
                    serviceInfo:  {
                        useOffsets: useOffsets || false,
                        selectors:  [
                            {
                                description: 'selectorDescription',
                                id:          'selectorId',
                                selector:    '#selector'
                            }
                        ]
                    }
                });
            }
        },
        press: {
            getActionDescriptor: function () {
                return $.extend(true, {}, Automation.defaultPressActionDescriptor, {
                    type:         'press',
                    apiArguments: {
                        keysCommand: 'esc'
                    }
                });
            }
        },
        type:  {
            getActionDescriptor: function () {
                return {
                    type:         'type',
                    element:      $('<input value="123"/>').appendTo('body')[0],
                    selector:     '#selector',
                    serviceInfo:  {
                        selectors: [
                            {
                                description: 'selectorDescription',
                                id:          'selectorId',
                                selector:    '#selector'
                            }
                        ]
                    },
                    apiArguments: {
                        text: 'abc'
                    }
                };
            }
        }
    },

    recorder                 = null;

RecorderUI.confirmAction = function (stepNum, stepInfo, callback) {
    callback(true, stepInfo);
};

var nativeAlert    = window.alert,
    overridedAlert = null;

window.alert = function (message) {
    (overridedAlert || nativeAlert).call(this, message);
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

    return new PopupWidget(ShadowUI.getRoot(), popupOptions);
}

function createButtons() {
    var $buttons = $('<div></div>');

    this.$confirmButton = ButtonWidget.create($buttons, 'OK');
    this.$cancelButton = ButtonWidget.create($buttons, 'Cancel');

    return $buttons;
}

$(document).ready(function () {
    //constants
    var TEST_ELEMENT_CLASS = 'testElement',

        //vars
        $iFrame            = null,
        $iFrameInput       = null,

        //utils
        createIFrame       = function (callback) {
            $iFrame = $('<iframe id="test1" src="about:blank"/>')
                .css({
                    width:  '600px',
                    height: '600px'
                })
                .addClass(TEST_ELEMENT_CLASS);

            $iFrameInput = $('<input/>').addClass(TEST_ELEMENT_CLASS);


            var onLoadHandler = function () {
                window.setTimeout(function () {
                    $($iFrame[0].contentWindow.document.body).append($iFrameInput);
                    $iFrame.unbind('load', onLoadHandler);
                    callback();
                }, 0);
            };

            $iFrame.bind('load', onLoadHandler);
            $iFrame.appendTo($('body'));

            return $iFrame;
        },

        removeTestElements = function () {
            $('.' + TEST_ELEMENT_CLASS).remove();
            ShadowUI.select('.recorder').remove();
        };

    var handler = function (e) {
        if (e.iframe.id.indexOf('test') !== -1) {
            e.iframe.contentWindow.eval.call(e.iframe.contentWindow, [
                'HammerheadClient.define(\'Settings\', function (require, exports) {',
                '    exports.JOB_OWNER_TOKEN = "ownerToken";',
                '    exports.JOB_UID = "jobUid";',
                '});',
                'var UrlUtil = HammerheadClient.get("UrlUtil");',
                'UrlUtil.OriginLocation.get = function() { return "https://example.com"; };',
                'HammerheadClient.get(\'Hammerhead\').init();'
            ].join(''));
        }
    };

    QUnit.testStart = function () {
        stepNameCounter  = 0;
        currentStepsInfo = null;
        if ($.browser.msie) {
            removeTestElements();
        }

        recorder = new Recorder();

        recorder.loadStepsInfo(function () {
            recorder.start();
        });

        IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
        IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);
    };

    QUnit.testDone = function () {
        if (!$.browser.msie) {
            removeTestElements();
        }

        IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
    };

    module('regression tests');

    test('B251638 - TestCafe - The recorder does not add the handleAlert function when a test is being recorded in Dialog mode (silent mode)', function () {
        overridedAlert = function () {
        };

        var firstExpectedObj  = {
                action:                     'click',
                actionArgs:                 [
                    {
                        options: {
                            alt:     false,
                            ctrl:    false,
                            meta:    false,
                            offsetX: '',
                            offsetY: '',
                            shift:   false
                        }
                    }
                ],
                currentSelectorIndex:       0,
                failed:                     false,
                error:                      null,
                dialogError:                null,
                name:                       'step_0',
                useOffsets:                 false,
                selectors:                  [
                    {
                        description: 'selectorDescription',
                        id:          'selectorId',
                        selector:    '#selector'
                    }
                ],
                iFrameSelectors:            null,
                currentIFrameSelectorIndex: 0
            },
            secondExpectedObj = $.extend({}, firstExpectedObj, {
                name:                 'step_1',
                nativeDialogHandlers: [[{ dialog: 'alert' }]]
            });

        //first shouldn't have handleAlert
        actionParsedCallback(actionDescriptorBuilders.click.getActionDescriptor());

        ok(currentStepsInfo.length, 1);
        deepEqual(currentStepsInfo[0], firstExpectedObj);

        //second should have handleAlert
        actionParsedCallback(actionDescriptorBuilders.click.getActionDescriptor());
        window.alert();

        saveTestCallback({ testName: 'test' });

        ok(currentStepsInfo.length, 2);

        deepEqual(currentStepsInfo[0], firstExpectedObj, 'test1');
        deepEqual(currentStepsInfo[1], secondExpectedObj, 'test2');

        overridedAlert = null;
    });

    test('B254453 - TD14_1 - Assigned value to \'Use offset\' option  is not saved after moving to another page', function () {
        var getExpectedObj = function (stepNumber, useOffsets) {
            return {
                action:                     'click',
                actionArgs:                 [
                    {
                        options: {
                            alt:     false,
                            ctrl:    false,
                            meta:    false,
                            offsetX: '',
                            offsetY: '',
                            shift:   false
                        }
                    }
                ],
                currentSelectorIndex:       0,
                name:                       'step_' + stepNumber,
                useOffsets:                 useOffsets,
                failed:                     false,
                error:                      null,
                dialogError:                null,
                selectors:                  [
                    {
                        description: 'selectorDescription',
                        id:          'selectorId',
                        selector:    '#selector'
                    }
                ],
                iFrameSelectors:            null,
                currentIFrameSelectorIndex: 0
            }
        };

        var firstExpectedObj  = getExpectedObj(0, true),
            secondExpectedObj = getExpectedObj(1, false);

        actionParsedCallback(actionDescriptorBuilders.click.getActionDescriptor(true));

        ok(currentStepsInfo.length, 1);
        deepEqual(currentStepsInfo[0], firstExpectedObj);

        //we should call Recorder.loadStepsInfo to load stepsInfo from server (we substitute stepsInfo on currentStepsInfo)
        recorder.loadStepsInfo(function () {
        });

        //we save another one action to raise save stepInfo on server, in currentStepsInfo should remain correct value for 'useOffsets' property
        actionParsedCallback(actionDescriptorBuilders.click.getActionDescriptor(false));
        ok(currentStepsInfo.length, 2);
        deepEqual(currentStepsInfo[0], firstExpectedObj);
        deepEqual(currentStepsInfo[1], secondExpectedObj);
    });

    test('B254680 - Wrong stepList dialog markup after recording press action and move to another page', function () {
        var getExpectedObj = function (stepNumber) {
            return {
                action:                     'press',
                actionArgs:                 [
                    { keysCommand: 'esc' }
                ],
                currentSelectorIndex:       0,
                name:                       'step_' + stepNumber,
                iFrameSelectors:            null,
                currentIFrameSelectorIndex: 0,
                failed:                     false,
                error:                      null,
                dialogError:                null
            }
        };

        var getExpectedObjAfterSendToServer = function (expectedObject) {
            expectedObject.selectors  = undefined;
            expectedObject.useOffsets = undefined;
            return expectedObject;
        };

        var firstExpectedObj  = getExpectedObj(0),
            secondExpectedObj = getExpectedObj(1);

        actionParsedCallback(actionDescriptorBuilders.press.getActionDescriptor());

        ok(currentStepsInfo.length, 1);
        deepEqual(currentStepsInfo[0], getExpectedObjAfterSendToServer(firstExpectedObj));

        //we should call Recorder.loadStepsInfo to load stepsInfo from server (we substitute stepsInfo on currentStepsInfo)
        recorder.loadStepsInfo(function () {
        });

        //we save another one action to raise save stepInfo on server, in currentStepsInfo should remain correct value for 'useOffsets' property
        actionParsedCallback(actionDescriptorBuilders.press.getActionDescriptor());

        ok(currentStepsInfo.length, 2);
        //NOTE: each stepInfo should not contains selectors = [], 'selectors' must be 'undefined'
        deepEqual(currentStepsInfo[0], getExpectedObj(0));
        deepEqual(currentStepsInfo[1], getExpectedObjAfterSendToServer(secondExpectedObj));
    });

    asyncTest('B253740 - "Permission denied" error occurs on "http://jqueryui.com/droppable/" and impossible to save test in IE', function () {
        var descriptor  = null,
            errorRaised = false;
        var expectedObj = {
                action:                     'click',
                actionArgs:                 [
                    {
                        options: {
                            alt:     false,
                            ctrl:    false,
                            meta:    false,
                            offsetX: '',
                            offsetY: '',
                            shift:   false
                        }
                    }
                ],
                currentSelectorIndex:       0,
                name:                       'step_0',
                useOffsets:                 false,
                selectors:                  [
                    {
                        description: 'selectorDescription',
                        id:          'selectorId',
                        selector:    '#selector'
                    }
                ],
                iFrameSelectors:            null,
                currentIFrameSelectorIndex: 0,
                failed:                     false,
                error:                      null,
                dialogError:                null
            },
            $iFrame     = null;

        var testActions = function () {
            async.series({
                'Change iframe src':           function (callback) {
                    descriptor         = actionDescriptorBuilders.click.getActionDescriptor();
                    descriptor.element = $iFrameInput[0];
                    $iFrame[0].src     = '/data/test_runner/test.html';
                    callback();
                },
                'Send action parsed callback': function (callback) {
                    window.setTimeout(function () {
                        try {
                            actionParsedCallback(descriptor);
                        }
                        catch (e) {
                            errorRaised = true;
                        }
                        callback();
                    }, 500);
                },
                'Check saved action object':   function () {
                    ok(!errorRaised, 'no "Permission denied" error occurred');
                    ok(currentStepsInfo, 'parsed action saved');
                    if (currentStepsInfo) {
                        ok(currentStepsInfo.length, 1);
                        deepEqual(currentStepsInfo[0], expectedObj);
                    }

                    $iFrame.remove();
                    start();
                }
            });
        };

        $iFrame = createIFrame(testActions);
    });

    test('T232566 - TD15.1 - Delete keyboard button not work for "Save test dialog" in http://gap.webpremiere.de/ - TOP-LEVEL HANDLERS SUPPRESSING', function () {
        var EVENTS_TO_SUPPRESS = Util.DOM_EVENTS;
        
        var $input = $('<input/>'),
            $popup = null,
            firedEvents = [];

        function handler(e){
            if(Util.isShadowUIElement(e.target || e.srcElement))
                firedEvents.push("Fired " + e.type + " while in " + e.currentTarget + ", phase: " + (e.eventPhase === Event.CAPTURING_PHASE ? "capturing" : "bubbling"));
        }

        EVENTS_TO_SUPPRESS.forEach(function (evType){
            window.addEventListener(evType, handler, true);
            document.addEventListener(evType, handler, true);
            document.body.addEventListener(evType, handler, true);
        });

        popup = createPopup({content: $input});

        Settings.RECORDING = true;

        EVENTS_TO_SUPPRESS.forEach(function (evType){
            var ev = document.createEvent('Event');
            ev.initEvent(evType, true, true);
            $input[0].dispatchEvent(ev);

            window.removeEventListener(evType, handler, true);
            document.removeEventListener(evType, handler, true);
            document.body.removeEventListener(evType, handler, true);
        });

        
        Settings.RECORDING = false;

        deepEqual(firedEvents, [], 'No event handlers must be fired');

        popup.close();
    });

    asyncTest('T232566 - TD15.1 - Delete keyboard button not work for "Save test dialog" in http://gap.webpremiere.de/ - FOCUSING PREVENTION', function () {
        var EVENTS_TO_SUPPRESS = Util.DOM_EVENTS;
        
        var $shadowInput = $('<input/>'),
            $clientInput = $('<input/>'),
            $popup = null,
            blurRaised = false,
            focusRaised = false;

        $shadowInput[0].addEventListener('blur', function () {
            blurRaised = true;
        });

        $clientInput[0].addEventListener('focus', function () {
            focusRaised = true;
        });

        popup = createPopup({content: $shadowInput});

        Settings.RECORDING = true;

        $shadowInput[0].focus();
        $clientInput[0].focus();

        strictEqual(document.activeElement, $shadowInput[0], 'Check active element');

        setTimeout(function () {
            Settings.RECORDING = false;

            ok(!blurRaised, "No blur handlers must be fired");
            ok(!focusRaised, "No focus handlers must be fired");

            popup.close();
            start();
        }, 250)
    });
});
