HammerheadClient.define('DOMSandbox.Event', function (require, exports) {
    var $ = require('jQuery'),
        NativeMethods = require('DOMSandbox.NativeMethods'),
        SandboxUtil = require('DOMSandbox.Util'),
        SharedConst = require('Shared.Const'),
        ShadowUI = require('DOMSandbox.ShadowUI'),
        Util = require('Util');

    var INTERNAL_FOCUS_FLAG = SharedConst.PROPERTY_PREFIX + 'iff',
        INTERNAL_BLUR_FLAG = SharedConst.PROPERTY_PREFIX + 'ibf',
        DISPATCHED_EVENT_FLAG = SharedConst.PROPERTY_PREFIX + 'def',
        EVENT_SANDBOX_DISPATCH_EVENT_FLAG = 'tc-sdef-310efb6b',
        DISABLE_OUTER_FOCUS_HANDLERS = false;

    exports.BEFORE_UNLOAD_EVENT = 'beforeUnload';
    exports.BEFORE_BEFORE_UNLOAD_EVENT = 'beforeBeforeUnload';
    exports.UNLOAD_EVENT = 'unload';

    var EVENT_LISTENER_ATTACHED_EVENT = 'eventListenerAttached',
        ELEMENT_HAS_ADDINITIONAL_EVENT_METHODS = Util.isIE && !Util.isIE11;

    var eventEmitter = new Util.EventEmitter(),
        topWindow = Util.isCrossDomainWindows(window, window.top) ? window : window.top;

    var clickedFileInput = null;

    var hoverElementFixed = false;

    exports.on = eventEmitter.on.bind(eventEmitter);
    exports.off = eventEmitter.off.bind(eventEmitter);

    exports.init = function (window, document) {
        function beforeDispatchEvent() {
            window[EVENT_SANDBOX_DISPATCH_EVENT_FLAG] = (window[EVENT_SANDBOX_DISPATCH_EVENT_FLAG] || 0) + 1;
        }

        function afterDispatchEvent() {
            window[EVENT_SANDBOX_DISPATCH_EVENT_FLAG]--;

            if (!window[EVENT_SANDBOX_DISPATCH_EVENT_FLAG])
                delete window[EVENT_SANDBOX_DISPATCH_EVENT_FLAG];
        }

        //wrappers
        function overridedDispatchEvent(ev) {
            beforeDispatchEvent();

            var res = NativeMethods.dispatchEvent.call(this, ev);

            afterDispatchEvent();
            return res;
        }

        function overridedFireEvent(eventName, ev) {
            var eventType = eventName.substring(0, 2) === 'on' ? eventName.substring(2) : eventName,
                createEventType,
                res;

            beforeDispatchEvent();

            //event is 'MSEventObj'
            if (!ev || !ev.target) {
                if (/(^mouse\w+$)|^(dbl)?click$|^contextmenu$/.test(eventType))
                    createEventType = 'MouseEvents';
                else if (/^key\w+$/.test(eventType))
                    createEventType = 'Events';
                else if (/^touch\w+$/.test(eventType))
                    createEventType = 'TouchEvent';
                else
                    createEventType = 'Events';

                if (ev) {
                    ev = $.extend(document.createEvent(createEventType), ev);
                    ev.initEvent(eventType, typeof ev.cancelBubble !== 'undefined' ? ev.cancelBubble : false, true);
                }
                else {
                    //NOTE: fire event method can be called with no arguments
                    ev = document.createEvent(createEventType);
                    ev.initEvent(eventType, true, true);
                }
            }

            res = NativeMethods.dispatchEvent.call(this, ev);
            afterDispatchEvent();
            return res;
        }

        function overridedAttachEvent(eventName, handler) {
            NativeMethods.addEventListener.call(this, eventName.substring(2), handler);
        }

        function overridedDetachEvent(eventName, handler) {
            NativeMethods.removeEventListener.call(this, eventName.substring(2), handler);
        }

        function overridedClick() {
            beforeDispatchEvent();

            if (Util.isFileInput(this))
                clickedFileInput = this;

            var res = exports.Simulator.nativeClick(this, NativeMethods.click);

            afterDispatchEvent();
            return res;
        }

        function overridedSetSelectionRange() {
            return setSelectionRangeWrapper.apply(this, arguments);
        }

        function overridedSelect() {
            return selectWrapper.call(this);
        }

        function overridedFocus() {
            return focus(this, null, false, false, true);
        }

        function overridedBlur() {
            return blur(this, null, false, true);
        }

        var $lastHoveredElement = null;

        function cancelInternalEvents(e, dispatched, preventEvent, cancelHandlers, stopPropagation) {
            //NOTE: we should cancel events raised by native function calling (focus, blur) only if the element has the flag.
            // If event is dispatched, we shouldn't cancel it.
            var target = e.target || e.srcElement,
                internalEventFlag = e.type === 'focus' ? INTERNAL_FOCUS_FLAG : INTERNAL_BLUR_FLAG;

            if (target[internalEventFlag] && !e[DISPATCHED_EVENT_FLAG])
                stopPropagation();
        }

        exports.fixHoveredElement = function () {
            hoverElementFixed = true;
        };

        exports.freeHoveredElement = function () {
            hoverElementFixed = false;
        };

        function needChangeInputType(el) {
            var tagName = el.tagName ? el.tagName.toLowerCase() : '';
            return tagName === 'input' && (Util.isWebKit && /^(number|email)$/.test(el.type));
        }

        exports.setSelection = function (el, start, end, direction) {
            if (el.setSelectionRange)
                el.setSelectionRange(start, end, direction);
            else {
                el.selectionStart = start;
                el.selectionEnd = end;
            }
        };

        exports.getSelection = function (el) {
            var changeType = needChangeInputType(el),
                activeElement = Util.getActiveElement(Util.findDocument(el)),
                isElementActive = activeElement === el,
                savedType = el.type,
                selection = null;

            //HACK: (the problem after Chrome update to v.33.0.1750.117, and in Mozilla 29.0 for input with type 'number' T101195)
            // To get selection we should change input type to text if it's 'number' or 'email' (B254340).
            // But type changing is async in this case, so we should call blur to raise it (and focus to restore activeElement).
            if (changeType) {
                if (isElementActive)
                    blur(el, null, true);
                el.type = 'text';
            }

            if (Util.isInputWithoutSelectionPropertiesInMozilla(el)) {
                selection = {
                    start: 0,
                    end: 0,
                    direction: 'forward'
                };
            }
            else {
                selection = {
                    start: el.selectionStart,
                    end: el.selectionEnd,
                    direction: el.selectionDirection
                };
            }


            if (changeType) {
                el.type = savedType;
                if (isElementActive)
                    focus(el, null, true);
            }

            return selection;
        };

        exports.wrapSetterSelection = function (element, selectionSetter, needFocus, isContentEditable) {
            var curDocument = Util.findDocument(element),
                activeElement = null,

                result = null,
                focusRaised = false,
                focusHandler = function () {
                    focusRaised = true;
                };

            if (needFocus)
                element.addEventListener('focus', focusHandler);

            //focus and blur events
            beforeDispatchEvent();
            beforeDispatchEvent();

            result = selectionSetter();

            //focus and blur events
            afterDispatchEvent();
            afterDispatchEvent();

            if (needFocus) {
                activeElement = Util.getActiveElement(curDocument);

                if (Util.isWebKit && activeElement !== element) {
                    if (focusRaised)
                        element[INTERNAL_FOCUS_FLAG] = true;

                    element.focus();
                }

                if (Util.isIE)
                    internalSetTimeout.call(window, function () {
                        internalSetTimeout.call(window, function () {
                            element.removeEventListener('focus', focusHandler);

                            if (!focusRaised)
                                exports.Simulator.focus(element);
                        }, 0);
                    }, 0);
                else {
                    element.removeEventListener('focus', focusHandler);

                    if (!focusRaised) {
                        //NOTE: in Mozilla calling dispatchEvent 'focus' does active element.
                        // We should call native focus method.
                        if (isContentEditable && Util.isMozilla)
                            focus(element, null, true, false, true);
                        else
                            exports.Simulator.focus(element);
                    }
                }
            }
            return result;
        };

        function setSelectionRangeWrapper() {
            var selectionStart = arguments[0],
                selectionEnd = arguments[1],
                selectionDirection = arguments[2] || 'none',
                element = this,

                isTextArea = this.tagName && this.tagName.toLowerCase() === 'textarea',
                fn = isTextArea ? NativeMethods.textAreaSetSelectionRange : NativeMethods.setSelectionRange,
                activeElement = Util.getActiveElement(Util.findDocument(element)),
                isElementActive = false;

            var selectionSetter = function () {
                var changeType = needChangeInputType(element),
                    savedType = element.type,
                    res;

                if (changeType)
                    element.type = 'text';

                res = fn.call(element, selectionStart, selectionEnd, selectionDirection);

                if (changeType) {
                    element.type = savedType;
                    //HACK: (the problem after Chrome update to v.33.0.1750.117, and in Mozilla 29.0 for input with type 'number' T101195)
                    // To set right selection we should change input type to text if it's 'number' or 'email' and restore it after (B254340).
                    // But type changing is async in this case, so we should call blur to raise it (and focus to restore activeElement).
                    if (isElementActive) {
                        blur(element, null, true);
                        focus(element, null, true);
                    }
                }

                return res;
            };

            if (activeElement === element) {
                isElementActive = true;
                return selectionSetter();
            }

            //setSelectionRange leads to element focusing only in IE
            return exports.wrapSetterSelection(element, selectionSetter, Util.isIE);
        }

        function selectWrapper() {
            var element = this.parentElement();

            if (!element || Util.getActiveElement(Util.findDocument(element)) === element)
                return NativeMethods.select.call(this);
            else {
                var result = null,
                    focusRaised = false,
                    focusHandler = function () {
                        focusRaised = true;
                    };

                element.addEventListener('focus', focusHandler);
                result = NativeMethods.select.call(this);

                internalSetTimeout.call(window, function () {
                    internalSetTimeout.call(window, function () {
                        element.removeEventListener('focus', focusHandler);

                        if (!focusRaised)
                            exports.Simulator.focus(element);
                    }, 0);
                }, 0);
                return result;
            }
        }

        //NOTE: when you call focus/blur function of some element in IE, handlers of the event are executed it async manner,
        // but before any function that is called with the window.setTimeout function. So, we should raise handlers with
        // timeout but we should do it before other async functions calling
        var timeouts = [],
            deferredFunctions = [],
            nativeSetTimeout = NativeMethods.setTimeout,
            nativeSetInterval = NativeMethods.setInterval,
            internalSetTimeout = nativeSetTimeout;

        if (Util.isIE) {
            window.setTimeout = function () {
                return nativeSetTimeout.apply(window, wrapTimeoutFunctionsArguments(arguments));
            };

            window.setInterval = function () {
                return nativeSetInterval.apply(window, wrapTimeoutFunctionsArguments(arguments));
            };

            internalSetTimeout = window.setTimeout;
        }

        function callDeferredFunction(fn, args) {
            if (timeouts.length) {
                var curTimeouts = [],
                    curHandlers = [],
                    i = 0;

                for (; i < timeouts.length; i++) {
                    curTimeouts.push(timeouts[i]);
                    curHandlers.push(deferredFunctions[i]);
                }

                timeouts = [];
                deferredFunctions = [];

                for (i = 0; i < curTimeouts.length; i++) {
                    window.clearInterval(curTimeouts[i]);
                    curHandlers[i]();
                }

                //NOTE: handlers can create new deferred functions
                return callDeferredFunction(fn, args);
            }

            return fn.apply(window, args);
        }

        function wrapTimeoutFunctionsArguments(args) {
            var fn = args[0],
                fnToRun = (typeof fn === 'function') ? fn : function () {
                    window.eval(fn);
                };

            args[0] = function () {
                return callDeferredFunction(fnToRun, arguments);
            };

            return args;
        }

        function deferFunction(fn) {
            var deferredFunction = function () {
                fn();

                for (var i = 0; i < deferredFunctions.length; i++) {
                    if (deferredFunctions[i] === deferredFunction) {
                        deferredFunctions.splice(i, 1);
                        timeouts.splice(i, 1);

                        break;
                    }
                }
            };

            deferredFunctions.push(deferredFunction);
            timeouts.push(nativeSetTimeout.call(window, deferredFunction, 0));
        }

        function raiseEvent(element, type, callback, withoutHandlers, isAsync, forMouseEvent, preventScrolling) {
            //NOTE: focus and blur events should be raised after the activeElement changed (B237489)
            var simulateEvent = function () {
                    if (Util.isIE) {
                        window.setTimeout(function () {
                            window.setTimeout(function () {
                                if (element[getInternalEventFlag()])
                                    delete element[getInternalEventFlag()];
                            }, 0);
                        }, 0);
                    }
                    else if (element[getInternalEventFlag()])
                        delete element[getInternalEventFlag()];

                    if (!withoutHandlers) {
                        if (isAsync) {
                            deferFunction(function () {
                                exports.Simulator[type](element);
                            });
                        }
                        else
                            exports.Simulator[type](element);
                    }
                    callback();
                },

                getInternalEventFlag = function () {
                    return type === 'focus' ? INTERNAL_FOCUS_FLAG : INTERNAL_BLUR_FLAG;
                };

            //T239149 - TD15.1? - Error occurs during assertion creation on http://knockoutjs.com/examples/helloWorld.html in IE9
            if (Util.isIE && Util.browserVersion === 9 && ShadowUI.getRoot()[0] === element && (type === 'focus' || type === 'blur'))
                callback();

            if (element[type]) {
                //NOTE: we should guarantee that activeElement will be changed, therefore we should call native focus/blur
                // event. To guarantee all focus/blur events raising we should raise it manually too.

                var windowScroll = null;

                if (preventScrolling)
                    windowScroll = Util.getElementScroll($(window));

                var tempElement = null;
                if (type === 'focus' && element.tagName && element.tagName.toLowerCase() === 'label' && element.htmlFor) {
                    tempElement = Util.findDocument(element).getElementById(element.htmlFor);
                    if (tempElement)
                        element = tempElement;
                    else {
                        callback();
                        return;
                    }
                }

                element[getInternalEventFlag()] = true;

                NativeMethods[type].call(element);

                if (preventScrolling) {
                    var newWindowScroll = Util.getElementScroll($(window));

                    if (newWindowScroll.left !== windowScroll.left)
                        $(window).scrollLeft(windowScroll.left);

                    if (newWindowScroll.top !== windowScroll.top)
                        $(window).scrollTop(windowScroll.top);
                }

                var curDocument = Util.findDocument(element),
                    activeElement = Util.getActiveElement(curDocument);

                //if element was not focused and it has parent with tabindex, we focus this parent
                var $parent = $(element).parent();

                if (type === 'focus' && activeElement !== element && $parent[0] !== document && $parent.closest('[tabindex]').length && forMouseEvent) {
                    //NOTE: in WebKit calling of native focus for parent element raised page scrolling, we can't prevent it,
                    // therefore we need to restore page scrolling value
                    raiseEvent($parent.closest('[tabindex]')[0], 'focus', simulateEvent, false, false, forMouseEvent, forMouseEvent && Util.isWebKit);
                }
                //NOTE: some browsers doesn't change document.activeElement after element.blur() if browser window is on background.
                //That's why we call body.focus() without handlers. It should be called synchronously because client scripts may
                //expect that document.activeElement will be changed immediately after element.blur() calling.
                else if (type === 'blur' && activeElement === element && element !== $('body', curDocument)[0]) {
                    raiseEvent($('body', curDocument)[0], 'focus', simulateEvent, true);
                }
                else {
                    simulateEvent();
                }
            }
            else {
                simulateEvent();
            }
        }

        function focus(element, callback, silent, forMouseEvent, isNativeFocus) {
            if (DISABLE_OUTER_FOCUS_HANDLERS && !Util.isShadowUIElement(element))
                return;

            var callFocusCallback = function (callback) {
                if (typeof callback === 'function')
                    callback();
            };

            var raiseFocusEvent = function () {
                raiseEvent(element, 'focus', function () {
                    if (!silent)
                        elementEditingWatcher.watch(element);

                    //NOTE: If we call focus for unfocusable element (like 'div' or 'image') in iframe we should make
                    // document.active this iframe manually, so we call focus without handlers
                    if (isCurrentElementInIFrame && iFrameElement && topWindow.document.activeElement !== iFrameElement) {
                        raiseEvent(iFrameElement, 'focus', function () {
                            callFocusCallback(callback);
                        }, true, isAsync);
                    }
                    else
                        callFocusCallback(callback);

                }, withoutHandlers || silent, isAsync, forMouseEvent);
            };

            //NOTE: in IE if you call focus() or blur() methods from script, active element is changed immediately
            // but events are raised asynchronously after some timeout
            var isAsync = false;

            if (isNativeFocus && Util.isIE) {
                //in IE focus() method does not have any effect if it is called from focus event handler on second event phase
                if (((savedWindowEvents && savedWindowEvents.length) || Util.isIE11) && window.event && window.event.type === 'focus' && window.event.srcElement === element) {
                    callFocusCallback(callback);
                    return;
                }
                else
                    isAsync = true;
            }

            var isCurrentElementInIFrame = Util.isElementInIframe(element),
                iFrameElement = isCurrentElementInIFrame ? Util.getIFrameByElement(element) : null,
                curDocument = Util.findDocument(element),
                activeElement = Util.getActiveElement(),
                activeElementDocument = Util.findDocument(activeElement),
                withoutHandlers = element === $('body', curDocument)[0] && !Util.isIE,
                needBlur = false,
                needBlurIFrame = false;

            if (activeElement && activeElement.tagName) {
                if (activeElement === element)
                    withoutHandlers = true;
                else if (curDocument !== activeElementDocument && activeElement === $('body', activeElementDocument)[0])  //B253685
                    needBlur = false;
                else if (activeElement === $('body', curDocument)[0]) {
                    //Blur event raised for body only in IE. In addition, we must not call blur function for body because
                    //this leads to browser window moving to background
                    if (!silent && Util.isIE) {
                        var simulateBodyBlur = function () {
                            exports.Simulator.blur(activeElement);
                        };

                        if (isAsync)
                            internalSetTimeout.call(window, simulateBodyBlur, 0);
                        else
                            simulateBodyBlur();
                    }
                }
                else
                    needBlur = true;

                //B254260
                needBlurIFrame = curDocument !== activeElementDocument && Util.isElementInIframe(activeElement, activeElementDocument);
            }

            //NOTE: we always call blur for iframe manually without handlers (B254260)
            if (needBlurIFrame && !needBlur) {
                if (Util.isIE) {
                    //NOTE: We should call blur for iframe with handlers in IE
                    //but we can't call method 'blur' because activeElement !== element and handlers will not be called
                    exports.Simulator.blur(Util.getIFrameByElement(activeElement));
                    raiseFocusEvent();
                }
                else
                    blur(Util.getIFrameByElement(activeElement), raiseFocusEvent, true, isNativeFocus);
            }
            else if (needBlur) {
                blur(activeElement, function () {
                    if (needBlurIFrame)
                        blur(Util.getIFrameByElement(activeElement), raiseFocusEvent, true, isNativeFocus);
                    else
                        raiseFocusEvent();
                }, silent, isNativeFocus);
            }
            else
                raiseFocusEvent();
        }

        function blur(element, callback, withoutHandlers, isNativeBlur) {
            var activeElement = Util.getActiveElement(Util.findDocument(element)),
            //in IE if you call focus() or blur() methods from script, active element is changed immediately
            // but events are raised asynchronously after some timeout
                isAsync = isNativeBlur && Util.isIE;

            if (activeElement !== element)
                withoutHandlers = true;

            if (!withoutHandlers) {
                elementEditingWatcher.check(element);
                elementEditingWatcher.stopWatching(element);
            }

            raiseEvent(element, 'blur', function () {
                if (typeof callback === 'function')
                    callback();
            }, withoutHandlers, isAsync);
        }

        function overrideElementOrHTMLElementMethod(methodName, overridedMethod) {
            if (window.Element && methodName in window.Element.prototype)
                window.Element.prototype[methodName] = overridedMethod;
            else if (window.HTMLElement && methodName in window.HTMLElement.prototype)
                window.HTMLElement.prototype[methodName] = overridedMethod;

            if (window.Document && methodName in window.Document.prototype)
                window.Document.prototype[methodName] = overridedMethod;
        }

        if (SandboxUtil.BROWSER_HAS_ELEMENT_PROTOTYPE) {
            window.HTMLInputElement.prototype.setSelectionRange = overridedSetSelectionRange;
            window.HTMLTextAreaElement.prototype.setSelectionRange = overridedSetSelectionRange;

            overrideElementOrHTMLElementMethod('focus', overridedFocus);
            overrideElementOrHTMLElementMethod('blur', overridedBlur);
            overrideElementOrHTMLElementMethod('dispatchEvent', overridedDispatchEvent);

            if (ELEMENT_HAS_ADDINITIONAL_EVENT_METHODS) {
                overrideElementOrHTMLElementMethod('fireEvent', overridedFireEvent);
                overrideElementOrHTMLElementMethod('attachEvent', overridedAttachEvent);
                overrideElementOrHTMLElementMethod('detachEvent', overridedDetachEvent);
            }
        }

        //change
        var elementEditingWatcher = (function () {
            var OLD_VALUE_PROPERTY = SharedConst.PROPERTY_PREFIX + "oldValue",
                ELEMENT_EDITING_OBSERVED_FLAG = SharedConst.PROPERTY_PREFIX + "elementEditingObserved";

            function onBlur(e) {
                var target = (e.target || e.srcElement);
                if (!checkElementChanged(target))
                    stopWatching(target);
            }

            function onChange(e) {
                stopWatching(e.target || e.srcElement);
            }

            function stopWatching(element) {
                if (element) {
                    $(element).unbind('blur', onBlur);
                    $(element).unbind('change', onChange);
                    if (element[ELEMENT_EDITING_OBSERVED_FLAG])
                        delete element[ELEMENT_EDITING_OBSERVED_FLAG];
                    if (element[OLD_VALUE_PROPERTY])
                        delete element[OLD_VALUE_PROPERTY];
                }
            }

            function watchElement(element) {
                if (element && !element[ELEMENT_EDITING_OBSERVED_FLAG] && Util.isTextEditableElementAndEditingAllowed(element) && !Util.isShadowUIElement(element)) {
                    var $element = $(element);

                    element[ELEMENT_EDITING_OBSERVED_FLAG] = true;
                    element[OLD_VALUE_PROPERTY] = element.value;
                    $element.bind('blur', onBlur);
                    $element.bind('change', onChange);
                }
            }

            function restartWatching(element) {
                if (element && element[ELEMENT_EDITING_OBSERVED_FLAG])
                    element[OLD_VALUE_PROPERTY] = element.value;
            }

            function checkElementChanged(element) {
                if (element && element[ELEMENT_EDITING_OBSERVED_FLAG] && element.value !== element[OLD_VALUE_PROPERTY]) {
                    exports.Simulator.change(element);
                    restartWatching(element);
                    return true;
                }
                else
                    return false;
            }

            return {
                watch: watchElement,
                restartWatching: restartWatching,
                check: checkElementChanged,
                stopWatching: stopWatching
            };
        })();

        if (Util.isIE && window.TextRange && window.TextRange.prototype.select)
            window.TextRange.prototype.select = overridedSelect;

        exports.watchElementEditing = elementEditingWatcher.watch;
        exports.restartWatchingElementEditing = elementEditingWatcher.restartWatching;
        exports.processElementChanging = elementEditingWatcher.check;
        exports.focus = focus;
        exports.blur = blur;

        exports.overrideElement = function (el, overridePrototypeMeths) {
            if ('click' in el)
                el.click = overridedClick;

            if (!SandboxUtil.BROWSER_HAS_ELEMENT_PROTOTYPE || overridePrototypeMeths) {
                el.dispatchEvent = overridedDispatchEvent;

                if ('focus' in el) {
                    el.focus = overridedFocus;
                    el.blur = overridedBlur;
                }

                if ('setSelectionRange' in el)
                    el.setSelectionRange = overridedSetSelectionRange;

                if (ELEMENT_HAS_ADDINITIONAL_EVENT_METHODS) {
                    el.fireEvent = overridedFireEvent;
                    el.attachEvent = overridedAttachEvent;
                    el.detachEvent = overridedDetachEvent;
                }
            }

            if (Util.isInputElement(el)) {
                if (Util.isIE) {
                    // Prevent browser's open file dialog
                    NativeMethods.addEventListener.call(el, 'click', function (e) {
                        if (Util.isFileInput(el)) {
                            if (clickedFileInput === el) {
                                clickedFileInput = null;

                                return Util.preventDefault(e, true);
                            }
                        }
                    }, true);
                }
            }
        };


        //NOTE: this handler should be called after the others
        var emitBeforeUnloadEvent = function () {
            eventEmitter.emit(exports.BEFORE_UNLOAD_EVENT, {
                returnValue: storedBeforeUnloadReturnValue,
                prevented: prevented,
                isFakeIEEvent: isFakeIEBeforeUnloadEvent
            });

            isFakeIEBeforeUnloadEvent = false;
        };

        var storedBeforeUnloadReturnValue = '',
            prevented = false;

        function onBeforeUnloadHanlder(e, originListener) {
            //NOTE: overriding the returnValue property to prevent native dialog
            Object.defineProperty(e, 'returnValue', SandboxUtil.createPropertyDesc({
                get: function () {
                    return storedBeforeUnloadReturnValue;
                },
                set: function (value) {
                    //NOTE: in all browsers if any value is set it leads to preventing unload. In Mozilla only if value
                    // is an empty string it does not do it.
                    storedBeforeUnloadReturnValue = value;

                    prevented = Util.isMozilla ? value !== '' : true;
                }
            }));

            Object.defineProperty(e, 'preventDefault', SandboxUtil.createPropertyDesc({
                get: function () {
                    return function () {
                        prevented = true;
                    };
                },
                set: function () {
                }
            }));

            var res = originListener(e);

            if (typeof res !== 'undefined') {
                storedBeforeUnloadReturnValue = res;
                prevented = true;
            }
        }

        exports.setOnBeforeUnload = function (window, value) {
            if (typeof value === 'function') {

                this.storedBeforeUnloadHandler = value;

                window.onbeforeunload = function (e) {
                    return onBeforeUnloadHanlder(e, value);
                };

                //NOTE: reattach listener and it'll be the last in the queue
                NativeMethods.windowRemoveEventListener.call(window, 'beforeunload', emitBeforeUnloadEvent);
                NativeMethods.windowAddEventListener.call(window, 'beforeunload', emitBeforeUnloadEvent);
            }
            else {
                this.storedBeforeUnloadHandler = null;
                window.onbeforeunload = null;
            }
        };

        exports.getOnBeforeUnload = function () {
            return this.storedBeforeUnloadHandler;
        };

        exports.initDocumentListening = function () {
            exports.initElementListening(document, Util.DOM_EVENTS);
        };

        exports.initDocumentListening();

        function addWindowEventHandlers() {
            exports.initElementListening(window, Util.DOM_EVENTS.concat(['beforeunload', 'unload', 'message']));

            exports.setEventListenerWrapper(window, ['beforeunload'], onBeforeUnloadHanlder);

            exports.addInternalEventListener(window, ['unload'], function () {
                eventEmitter.emit(exports.UNLOAD_EVENT);
            });

            exports.addInternalEventListener(window, ['mouseover'], function (e) {
                if (hoverElementFixed || Util.isShadowUIElement(e.target))
                    return;

                var $target = $(e.target),
                    $jointParent = null,
                    stop = false;


                // NOTE: In this method, we are looking for a joint parent for the previous and the new hovered element.
                // Processes need only to that parent. This we are trying to reduce the number of dom calls.
                if ($lastHoveredElement) {
                    var $el = $lastHoveredElement;

                    while (!stop) {
                        // Check that the current element is a joint parent for the hovered elements.
                        if ($el.has($target).length === 0) {
                            $el.removeAttr(SharedConst.TEST_CAFE_HOVER_PSEUDO_CLASS_ATTR);
                            $el = $el.parent();
                            stop = $el.length === 0;
                        } else
                            stop = true;
                    }

                    $jointParent = $el;
                }

                stop = false;

                while (!stop) {
                    // Assign pseudo-class marker up to joint parent.
                    if ($target !== $jointParent) {
                        $target.attr(SharedConst.TEST_CAFE_HOVER_PSEUDO_CLASS_ATTR, '');
                        $target = $target.parent();
                        stop = $target.length === 0;
                    } else
                        stop = true;
                }
            });

            exports.addInternalEventListener(window, ['mouseout'], function (e) {
                if (!Util.isShadowUIElement(e.target))
                    $lastHoveredElement = $(e.target);
            });

            exports.addInternalEventListener(window, ['focus', 'blur', 'change'], cancelInternalEvents);
        }

        addWindowEventHandlers();

        var isFakeIEBeforeUnloadEvent = false;

        $(document).on('click', 'a', function () {
            if (Util.isIE && !Util.isIE11 && this.tagName && this.tagName.toLowerCase() === 'a') {
                var href = $(this).attr('href');

                isFakeIEBeforeUnloadEvent = /(^javascript:)|(^mailto:)|(^tel:)|(^#)/.test(href);
            }
        });

        NativeMethods.windowAddEventListener.call(window, 'beforeunload', emitBeforeUnloadEvent);

        exports.addInternalEventListener(window, ['beforeunload'], function () {
            eventEmitter.emit(exports.BEFORE_BEFORE_UNLOAD_EVENT, {
                isFakeIEEvent: isFakeIEBeforeUnloadEvent
            });
        });

        eventEmitter.on(EVENT_LISTENER_ATTACHED_EVENT, function (e) {
            if (e.el === window && e.eventType === 'beforeunload') {
                //NOTE: reattach listener and it'll be the last in the queue
                NativeMethods.windowRemoveEventListener.call(window, 'beforeunload', emitBeforeUnloadEvent);
                NativeMethods.windowAddEventListener.call(window, 'beforeunload', emitBeforeUnloadEvent);
            }
        });
    };

    //event listeners overriding
    (function () {
        var ELEMENT_LISTENING_EVENTS_STORAGE_PROP = 'tc_eles_bef23a16';

        var LISTENED_EVENTS = [
            'click', 'mousedown', 'mouseup', 'dblclick', 'contextmenu', 'mousemove', 'mouseover', 'mouseout',
            'pointerdown', 'pointermove', 'pointerover', 'pointerout', 'pointerup',
            'MSPointerDown', 'MSPointerMove', 'MSPointerOver', 'MSPointerOut', 'MSPointerUp',
            'touchstart', 'touchmove', 'touchend',
            'keydown', 'keypress', 'keyup',
            'change', 'focus', 'blur', 'focusin', 'focusout'
        ];

        var listeningCtx = {
            getElementCtx: function (el) {
                return el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP];
            },

            getEventCtx: function (el, event) {
                event = Util.isIE11 && /MSPointer/.test(event) ? event.replace('MS', '').toLowerCase() : event;
                return listeningCtx.getElementCtx(el)[event] || null;
            },

            isElementListening: function (el) {
                return !!el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP];
            },

            addListeningElement: function (el, events) {
                if (!el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP])
                    el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP] = {};

                for (var i = 0; i < events.length; i++) {
                    if (!el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP][events[i]]) {
                        el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP][events[i]] = {
                            internalHandlers: [],
                            outerHandlers: [],
                            outerHandlersWrapper: null,
                            wrappers: [],
                            cancelOuterHandlers: false
                        };
                    }
                }
            },

            removeListeningElement: function (el) {
                delete el[ELEMENT_LISTENING_EVENTS_STORAGE_PROP];
            },

            addFirstInternalHandler: function (el, events, handler) {
                var elementHandlers = listeningCtx.getElementCtx(el);

                for (var i = 0; i < events.length; i++)
                    elementHandlers[events[i]].internalHandlers.splice(0, 0, handler);
            },

            addInternalHandler: function (el, events, handler) {
                var elementHandlers = listeningCtx.getElementCtx(el);

                for (var i = 0; i < events.length; i++)
                    elementHandlers[events[i]].internalHandlers.push(handler);

            },
            removeInternalHandler: function (el, events, handler) {
                var elementHandlers = listeningCtx.getElementCtx(el);

                for (var i = 0; i < events.length; i++) {
                    var eventHandlers = elementHandlers[events[i]].internalHandlers,
                        listenerIndex = $.inArray(handler, eventHandlers);

                    if (listenerIndex > -1)
                        eventHandlers.splice(listenerIndex, 1);
                }
            },

            wrapEventListener: function (eventListeningInfo, listener, wrapper, useCapture) {
                eventListeningInfo.outerHandlers.push({fn: listener, useCapture: useCapture || false});
                eventListeningInfo.wrappers.push(wrapper);
            },

            getWrapper: function (eventListeningInfo, listener, useCapture) {
                var originListeners = eventListeningInfo.outerHandlers,
                    wrappers = eventListeningInfo.wrappers,
                    wrapper = null;

                for (var i = 0; i < originListeners.length; i++) {
                    var curListener = originListeners[i];

                    if (curListener.fn === listener && (curListener.useCapture || false) === (useCapture || false)) {
                        wrapper = wrappers[i];

                        wrappers.splice(i, 1);
                        originListeners.splice(i, 1);

                        return wrapper;
                    }
                }
            }
        };

        var eventHandler = function (e) {
            //NOTE: fix for the bug in firefox (https://bugzilla.mozilla.org/show_bug.cgi?id=1161548).
            //An exception is raised when try to get any property from the event object in some cases.
            var type = '';

            try {
                type = e.type;
            }
            catch (err) {
                return;
            }

            var el = this,
                eventPrevented = false,
                handlersCancelled = false,
                stopPropagationCalled = false,

                eventListeningInfo = listeningCtx.getEventCtx(el, type),
                internalHandlers = eventListeningInfo ? eventListeningInfo.internalHandlers : [];

            eventListeningInfo.cancelOuterHandlers = false;

            var preventEvent = function () {
                eventPrevented = true;
                Util.preventDefault(e);
            };

            var cancelHandlers = function () {
                if (!handlersCancelled)
                    eventListeningInfo.cancelOuterHandlers = true;

                handlersCancelled = true;
            };

            var stopPropagation = function () {
                stopPropagationCalled = true;

                Util.stopPropagation(e);
            };

            for (var i = 0; i < internalHandlers.length; i++) {
                internalHandlers[i].call(el, e, !!window[EVENT_SANDBOX_DISPATCH_EVENT_FLAG], preventEvent, cancelHandlers, stopPropagation);

                if (eventPrevented || stopPropagationCalled)
                    break;
            }
        };

        function getEventListenerWrapper(eventListeningInfo, listener) {
            return function (e) {
                if (eventListeningInfo.cancelOuterHandlers)
                    return;

                if (typeof eventListeningInfo.outerHandlersWrapper === 'function')
                    return eventListeningInfo.outerHandlersWrapper.call(this, e, listener);
                else
                    return listener.call(this, e);
            };
        }

        function getBodyEventListenerWrapper(documentEventListeningInfo, listener) {
            return function (e) {
                if (documentEventListeningInfo.cancelOuterHandlers)
                    return;

                return listener.call(this, e);
            };
        }

        exports.initElementListening = function (el, events) {
            var nativeAddEventListener = (function () {
                if (Util.isWindowInstance(el))
                    return NativeMethods.windowAddEventListener;

                return typeof el.body !== 'undefined' ? NativeMethods.documentAddEventListener : el.addEventListener;
            })();

            var nativeRemoveEventListener = (function () {
                if (Util.isWindowInstance(el))
                    return NativeMethods.windowRemoveEventListener;

                return typeof el.body !== 'undefined' ? NativeMethods.documentRemoveEventListener : el.removeEventListener;
            })();

            events = events || LISTENED_EVENTS;

            listeningCtx.addListeningElement(el, events);

            for (var i = 0; i < events.length; i++) {
                nativeAddEventListener.call(el, events[i], eventHandler, true);
            }

            el.addEventListener = function (type, listener, useCapture) {
                var eventListeningInfo = listeningCtx.getEventCtx(el, type);

                if (!eventListeningInfo)
                    return nativeAddEventListener.call(this, type, listener, useCapture);

                //T233158 - Wrong test run for mouse click in IE
                var isDifferentHandler = eventListeningInfo.outerHandlers.every(function (value) {
                    return value.fn !== listener || value.useCapture !== useCapture;
                });

                if (!isDifferentHandler)
                    return;

                var wrapper = getEventListenerWrapper(eventListeningInfo, listener);

                listeningCtx.wrapEventListener(eventListeningInfo, listener, wrapper, useCapture);

                var res = nativeAddEventListener.call(this, type, wrapper, useCapture);

                eventEmitter.emit(EVENT_LISTENER_ATTACHED_EVENT, {
                    el: this,
                    eventType: type,
                    listener: listener
                });

                return res;
            };

            var removeEventListener = function (type, listener, useCapture) {
                var eventListeningInfo = listeningCtx.getEventCtx(this, type);

                if (!eventListeningInfo)
                    return nativeRemoveEventListener.call(this, type, listener, useCapture);

                return nativeRemoveEventListener.call(this, type, listeningCtx.getWrapper(eventListeningInfo, listener, useCapture), useCapture);
            };

            el.removeEventListener = removeEventListener;
        };

        exports.restartElementListening = function (el) {
            var nativeAddEventListener = (function () {
                if (Util.isWindowInstance(el))
                    return NativeMethods.windowAddEventListener;

                return typeof el.body !== 'undefined' ? NativeMethods.documentAddEventListener : NativeMethods.addEventListener;
            })();

            var elementCtx = listeningCtx.getElementCtx(el);

            if (elementCtx) {
                Object.keys(elementCtx).forEach(function (event) {
                    nativeAddEventListener.call(el, event, eventHandler, true);
                });
            }
        };

        exports.initDocumentBodyListening = function (doc) {
            var events = Util.DOM_EVENTS;

            var nativeAddEventListener = (function () {
                return doc.body.addEventListener;
            })();

            var nativeRemoveEventListener = (function () {
                return doc.body.removeEventListener;
            })();

            listeningCtx.addListeningElement(doc.body, events);

            doc.body.addEventListener = function (type, listener, useCapture) {
                var docEventListeningInfo = listeningCtx.getEventCtx(doc, type),
                    eventListeningInfo = listeningCtx.getEventCtx(this, type);

                if (!docEventListeningInfo)
                    return nativeAddEventListener.call(this, type, listener, useCapture);

                //T233158 - Wrong test run for mouse click in IE
                var isDifferentHandler = eventListeningInfo.outerHandlers.every(function (value) {
                    return value.fn !== listener || value.useCapture !== useCapture;
                });

                if (!isDifferentHandler)
                    return;

                var wrapper = getBodyEventListenerWrapper(docEventListeningInfo, listener);

                listeningCtx.wrapEventListener(eventListeningInfo, listener, wrapper, useCapture);

                var res = nativeAddEventListener.call(this, type, wrapper, useCapture);

                eventEmitter.emit(EVENT_LISTENER_ATTACHED_EVENT, {
                    el: this,
                    eventType: type,
                    listener: listener
                });

                return res;
            };

            doc.body.removeEventListener = function (type, listener, useCapture) {
                var eventListeningInfo = listeningCtx.getEventCtx(this, type);

                if (!eventListeningInfo)
                    return nativeRemoveEventListener.call(this, type, listener, useCapture);

                return nativeRemoveEventListener.call(this, type, listeningCtx.getWrapper(eventListeningInfo, listener, useCapture), useCapture);
            };
        };

        exports.cancelElementListening = function (el) {
            listeningCtx.removeListeningElement(el);

            if (el.body)
                listeningCtx.removeListeningElement(el.body);
        };

        exports.addInternalEventListener = function (el, events, handler) {
            listeningCtx.addInternalHandler(el, events, handler);
        };

        exports.addFirstInternalHandler = function (el, events, handler) {
            listeningCtx.addFirstInternalHandler(el, events, handler);
        };

        exports.removeInternalEventListener = function (el, events, handler) {
            listeningCtx.removeInternalHandler(el, events, handler);
        };

        exports.setEventListenerWrapper = function (el, events, wrapper) {
            if (!listeningCtx.isElementListening(el))
                exports.initElementListening(el, events);

            for (var i = 0; i < events.length; i++) {
                var eventListeningInfo = listeningCtx.getEventCtx(el, events[i]);

                eventListeningInfo.outerHandlersWrapper = wrapper;
            }
        };
    })();

    var touchIdentifier = Date.now();

    function getTouchIdentifier(type) {
        //NOTE: a touch point is created on 'touchstart' event. When it's moved its id should not be changed (T112153)
        if (type === 'touchstart')
            touchIdentifier++;

        return touchIdentifier;
    }

    function getUIEventArgs(type, options) {
        var opts = options || {};

        return {
            type: type,
            canBubble: opts.canBubble !== false,
            cancelable: opts.cancelable !== false,
            view: opts.view || window,
            detail: opts.detail || 0,
            ctrlKey: opts.ctrlKey || false,
            altKey: opts.altKey || false,
            shiftKey: opts.shiftKey || false,
            metaKey: opts.metaKey || false
        };
    }

    function getMouseEventArgs(type, options) {
        var opts = options || {};

        return $.extend(getUIEventArgs(type, options), {
            screenX: opts.screenX || 0,
            screenY: opts.screenY || 0,
            clientX: opts.clientX || 0,
            clientY: opts.clientY || 0,
            button: typeof opts.button === 'undefined' ? Util.BUTTON.LEFT : opts.button,
            buttons: typeof opts.buttons === 'undefined' ? Util.BUTTONS_PARAMETER.LEFT_BUTTON : opts.buttons,
            relatedTarget: opts.relatedTarget || null,
            which: typeof opts.which === 'undefined' ? Util.WHICH_PARAMETER.LEFT_BUTTON : opts.which
        });
    }

    function getKeyEventArgs(type, options) {
        var opts = options || {};
        return $.extend(getUIEventArgs(type, options), {
            keyCode: opts.keyCode || 0,
            charCode: opts.charCode || 0,
            which: type === 'press' ? opts.charCode : opts.keyCode
        });
    }

    function getTouchEventArgs(type, options) {
        var opts = options || {},
            args = $.extend(getUIEventArgs(type, opts), {
                screenX: opts.screenX || 0,
                screenY: opts.screenY || 0,
                clientX: opts.clientX || 0,
                clientY: opts.clientY || 0,
                pageX: opts.clientX || 0,
                pageY: opts.clientY || 0
            });

        if (Util.isIOS)
            args.touch = document.createTouch(args.view, options.target, getTouchIdentifier(args.type),
                args.clientX, args.clientY, 0, 0);
        else
            args.touch = document.createTouch(args.view, options.target, getTouchIdentifier(args.type), args.pageX, args.pageY,
                args.screenX, args.screenY, args.clientX, args.clientY, null, null, typeof args.rotation === 'undefined' ? 0 : args.rotation); //B237995

        args.changedTouches = document.createTouchList(args.touch);
        args.touches = args.type === 'touchend' ? document.createTouchList() : args.changedTouches; //T170088
        args.targetTouches = args.touches;

        return args;
    }

    var IE_BUTTONS_MAP = {
        0: 1,
        1: 4,
        2: 2
    };

    //NOTE: (IE only) if some event dispatching raised native click function calling we should remove window.event property
    // (that was set in the raiseDispatchEvent function). Otherwise the window.event property will be equal dispatched event
    // but not native click event. After click we should restore it. (B237144)
    var savedWindowEvents = [],
        savedNativeClickCount = 0;

    function raiseNativeClick(el, originClick) {
        //B254199
        var curWindow = Util.isElementInIframe(el) ? Util.getIFrameByElement(el).contentWindow : window;

        if (Util.isIE && !Util.isIE11)
            delete curWindow.event;

        originClick.call(el);

        if (Util.isIE && !Util.isIE11) {
            if (savedNativeClickCount--)
                savedWindowEvents.shift();

            if (savedWindowEvents.length) {
                Object.defineProperty(curWindow, 'event', {
                    get: function () {
                        return savedWindowEvents[0];
                    },
                    configurable: true
                });
            }
        }
    }

    function raiseDispatchEvent(el, ev, args) {
        //NOTE: in IE  when we raise event via the dispatchEvent function, the window.event object is null.
        // After a real event happened there is the window.event object but it is not identical with the first argument
        // of event handler. The window.Event object is identical with the object that is created when we raise event
        // via the fireEvent function. So, when we raise event via the dispatchEvent function we should set the
        // window.event object malually.
        // Except IE11 - window.event is not null and its the same as in event handler (only in window.top.event).
        // Also in iE11 window.event has not returnValue property and
        // impossible to prevent event via assigning window.event.returnValue = false
        var isElementInIFrame = Util.isElementInIframe(el);

        if (Util.isFileInput(el) && ev.type === 'click')
            clickedFileInput = el;

        if (Util.isIE && !Util.isIE11) {
            args = args || {type: ev.type};

            var returnValue = true,
            //B254199
                curWindow = isElementInIFrame ? Util.getIFrameByElement(el).contentWindow : window,
                curWindowEvent = null,
                onEvent = 'on' + (Util.isIE && Util.browserVersion === 10 && /MSPointer(Down|Up|Move|Over|Out)/.test(ev.type) ? ev.type.toLowerCase() : ev.type),
                inlineHandler = el[onEvent],
                button = args.button;

            //NOTE: if window.event generated after native click raised
            if (typeof curWindow.event === 'object' && savedWindowEvents.length && curWindow.event !== savedWindowEvents[0]) {
                savedNativeClickCount++;
                savedWindowEvents.unshift(curWindow.event);
            }

            delete curWindow.event;

            var saveWindowEventObject = function (e) {
                curWindowEvent = curWindow.event || ev;
                savedWindowEvents.unshift(curWindowEvent);
                Util.preventDefault(e);
            };

            if (el.parentNode) {  // NOTE: fireEvent raises error when el.parentNode === null

                el[onEvent] = saveWindowEventObject;
                args.button = IE_BUTTONS_MAP[button];

                NativeMethods.fireEvent.call(el, onEvent, $.extend(Util.findDocument(el).createEventObject(), args));

                el[onEvent] = inlineHandler;
                args.button = button;
            }

            Object.defineProperty(curWindow, 'event', {
                get: function () {
                    return savedWindowEvents[0];
                },
                configurable: true
            });

            var cancelBubble = false;

            if (curWindowEvent) {
                Object.defineProperty(curWindowEvent, 'returnValue', {
                    get: function () {
                        return returnValue;
                    },

                    set: function (value) {
                        if (value === false)
                            ev.preventDefault();

                        returnValue = value;
                    },
                    configurable: true
                });

                Object.defineProperty(curWindowEvent, 'cancelBubble', {
                    get: function () {
                        return cancelBubble;
                    },

                    set: function (value) {
                        ev.cancelBubble = cancelBubble = value;
                    },
                    configurable: true
                });

                if (curWindowEvent.type === 'mouseout' || curWindowEvent.type === 'mouseover') {
                    Object.defineProperty(curWindowEvent, 'fromElement', {
                        get: function () {
                            return curWindowEvent.type === 'mouseout' ? el : args.relatedTarget;
                        },
                        configurable: true
                    });
                    Object.defineProperty(curWindowEvent, 'toElement', {
                        get: function () {
                            return curWindowEvent.type === 'mouseover' ? el : args.relatedTarget;
                        },
                        configurable: true
                    });
                }

            }

            returnValue = el.dispatchEvent(ev) && returnValue;

            if (curWindowEvent && curWindowEvent === savedWindowEvents[0])
                savedWindowEvents.shift();

            if (!savedWindowEvents.length)
                delete curWindow.event;

            return returnValue;
        }
        //NOTE: In IE11 iframe's window.event object is null.
        // So we should set iframe's window.event object malually by window.event (B254199).
        else if (Util.isIE11 && isElementInIFrame) {

            Object.defineProperty(Util.getIFrameByElement(el).contentWindow, 'event', {
                get: function () {
                    return window.event;
                },
                configurable: true
            });

            return el.dispatchEvent(ev);
        }
        else {
            return el.dispatchEvent(ev);
        }
    }

    function dispatchMouseEvent(el, args) {
        var ev = null,
            pointerRegExp = /mouse(down|up|move|over|out)/;

        //NOTE: in IE submit doesn't work if a click is emulated for some submit button's children (for example img, B236676)
        //In addition, if a test is being recorded in IE, the target of a click event is always a button, not a child, so child does not receive click event at all
        if (Util.isIE) {
            if (args.type === 'click' || args.type === 'mouseup' || args.type === 'mousedown')
                if (el.parentNode && $(el.parentNode).closest('button').length) {
                    var $button = $(el.parentNode).closest('button');
                    if ($button.attr('type') === 'submit') {
                        el = $button[0];
                    }
                }
        }

        if (pointerRegExp.test(args.type) && (window.PointerEvent || window.MSPointerEvent)) {
            var pointEvent = Util.isIE11 ? document.createEvent('PointerEvent') : document.createEvent('MSPointerEvent'),
                elPosition = Util.getOffsetPosition(el),
                elBorders = Util.getBordersWidth($(el)),
                elClientPosition = Util.offsetToClientCoords({
                    x: elPosition.left + elBorders.left,
                    y: elPosition.top + elBorders.top
                }),
                eventShortType = args.type.replace('mouse', ''),
                pArgs = $.extend({
                    widthArg: Util.isIE11 ? 1 : 0,
                    heightArg: Util.isIE11 ? 1 : 0,
                    pressure: 0,
                    rotation: 0,
                    tiltX: 0,
                    tiltY: 0,
                    pointerIdArg: 1, //NOTE: this parameter must be "1" for mouse
                    pointerType: Util.isIE11 ? 'mouse' : 4,
                    hwTimestampArg: Date.now(),
                    isPrimary: true
                }, args);

            pArgs.type = Util.isIE11 ? 'pointer' + eventShortType : 'MSPointer' + eventShortType.charAt(0).toUpperCase() + eventShortType.substring(1);
            pArgs.offsetXArg = args.clientX - elClientPosition.x;
            pArgs.offsetYArg = args.clientY - elClientPosition.y;
            pArgs.button = args.buttons === Util.BUTTONS_PARAMETER.NO_BUTTON ? Util.POINTER_EVENT_BUTTON.NO_BUTTON : pArgs.button;

            //NOTE: we send null as a relatedTarget argument because IE has memory leak
            pointEvent.initPointerEvent(pArgs.type, pArgs.canBubble, pArgs.cancelable, window, pArgs.detail, pArgs.screenX,
                pArgs.screenY, pArgs.clientX, pArgs.clientY, pArgs.ctrlKey, pArgs.altKey, pArgs.shiftKey, pArgs.metaKey,
                pArgs.button, null, pArgs.offsetXArg, pArgs.offsetYArg, pArgs.widthArg, pArgs.heightArg,
                pArgs.pressure, pArgs.rotation, pArgs.tiltX, pArgs.tiltY, pArgs.pointerIdArg, pArgs.pointerType,
                pArgs.hwTimestampArg, pArgs.isPrimary);

            //NOTE: after dispatching pointer event doesn't contain 'target' and 'relatedTarget' property
            Object.defineProperty(pointEvent, 'target', {
                get: function () {
                    return el;
                },
                configurable: true
            });

            Object.defineProperty(pointEvent, 'relatedTarget', {
                get: function () {
                    return args.relatedTarget;
                },
                configurable: true
            });

            Object.defineProperty(pointEvent, 'buttons', {
                get: function () {
                    return args.buttons;
                }
            });

            raiseDispatchEvent(el, pointEvent, pArgs);
        }

        ev = document.createEvent('MouseEvents');
        ev.initMouseEvent(args.type, args.canBubble, args.cancelable, window, args.detail, args.screenX,
            args.screenY, args.clientX, args.clientY, args.ctrlKey, args.altKey, args.shiftKey, args.metaKey,
            args.button, args.relatedTarget);

        if (Util.isMozilla || Util.isIE) {
            Object.defineProperty(ev, 'buttons', {
                get: function () {
                    return args.buttons;
                }
            });
        }

        //T188166 - act.hover trigger "mouseenter" event with "which" parameter 1
        if (typeof args.which !== 'undefined' && $.browser.webkit) {
            Object.defineProperty(ev, SharedConst.EVENT_SANDBOX_WHICH_PROPERTY_WRAPPER, {
                get: function () {
                    return args.which;
                }
            });
        }

        //NOTE: After the MouseEvent was created by using initMouseEvent method pageX and pageY properties equal zero (only in IE9).
        //We can set them only by defineProperty method (B253930)
        if (Util.isIE && Util.browserVersion === 9) {
            var currentDocument = Util.findDocument(el),
                documentScroll = Util.getElementScroll($(currentDocument));

            Object.defineProperty(ev, 'pageX', {
                get: function () {
                    return ev.clientX + documentScroll.left;
                }
            });

            Object.defineProperty(ev, 'pageY', {
                get: function () {
                    return ev.clientY + documentScroll.top;
                }
            });
        }

        return raiseDispatchEvent(el, ev, args);
    }

    function dispatchKeyEvent(el, args) {
        var ev = null;

        if (document.createEvent) {
            ev = document.createEvent('Events');
            ev.initEvent(args.type, args.canBubble, args.cancelable);
            ev = $.extend(ev, {
                view: args.view,
                detail: args.detail,
                ctrlKey: args.ctrlKey,
                altKey: args.altKey,
                shiftKey: args.shiftKey,
                metaKey: args.metaKey,
                keyCode: args.keyCode,
                charCode: args.charCode,
                which: args.which
            });
            return raiseDispatchEvent(el, ev, args);
        }
    }

    function dispatchEvent(el, name, flag) {
        var ev = null;

        if (document.createEvent) {
            ev = document.createEvent('Events');

            //NOTE: the dispatchEvent funciton is used for events specific to one element (focus, blur, change, input, submit),
            // so we set the 'bubbling' (the second) argument to false (T229732)
            ev.initEvent(name, false, true);

            if (flag)
                ev[flag] = true;

            return raiseDispatchEvent(el, ev);
        }
    }

    function dispatchTouchEvent(el, args) {
        var ev = document.createEvent('TouchEvent');

        //HACK: test for iOS using initTouchEvent args count (TODO:replace it with user agent analyzis later)
        if (Util.isIOS) {
            ev.initTouchEvent(args.type, args.canBubble, args.cancelable, args.view,
                args.detail, args.screenX, args.screenY, args.pageX, args.pageY, args.ctrlKey,
                args.altKey, args.shiftKey, args.metaKey, args.touches, args.targetTouches,
                args.changedTouches, args.scale, typeof args.rotation === 'undefined' ? 0 : args.rotation); //B237995
        } else {
            if (ev.initTouchEvent.length === 12) {
                // FireFox
                ev.initTouchEvent(args.type, args.canBubble, args.cancelable, args.view,
                    args.detail, args.ctrlKey, args.altKey, args.shiftKey, args.metaKey, args.touches,
                    args.targetTouches, args.changedTouches);
            } else {
                // Default android browser, Dolphin
                ev.initTouchEvent(args.touches, args.targetTouches, args.changedTouches, args.type, args.view,
                    args.screenX, args.screenY, args.pageX - args.view.pageXOffset, args.pageY - args.view.pageYOffset,
                    args.ctrlKey, args.altKey, args.shiftKey, args.metaKey);
            }
        }

        return el.dispatchEvent(ev);
    }

    exports.disableOuterFocusHandlers = function () {
        DISABLE_OUTER_FOCUS_HANDLERS = true;
    };

    exports.enableOuterFocusHandlers = function () {
        DISABLE_OUTER_FOCUS_HANDLERS = false;
    };

    function simulateEvent(el, event, userOptions, options) {
        var args,
            dispatch,
        //NOTE: we don't emulate click on link with modifiers (ctrl, shift, ctrl+shift, alt),
        // because it causes the opening of additional tabs and window in browser or loading files
            isClickOnLink = event === 'click' && el.tagName && el.tagName.toLocaleLowerCase() === 'a',
            opts = $.extend(
                userOptions ? {
                    clientX: userOptions.clientX,
                    clientY: userOptions.clientY,
                    altKey: isClickOnLink ? false : userOptions.alt,
                    shiftKey: isClickOnLink ? false : userOptions.shift,
                    ctrlKey: isClickOnLink ? false : userOptions.ctrl,
                    metaKey: userOptions.meta,
                    button: userOptions.button,
                    which: userOptions.which,
                    buttons: userOptions.buttons,
                    relatedTarget: userOptions.relatedTarget
                } : {},
                options || {});
        if (!opts.relatedTarget)
            opts.relatedTarget = $('body')[0];
        if (/(^mouse\w+$)|^(dbl)?click$|^contextmenu$/.test(event)) {
            if (userOptions && userOptions.button !== undefined)
                opts = $.extend(opts, {button: userOptions.button});
            args = getMouseEventArgs(event, opts);
            dispatch = dispatchMouseEvent;
        }
        else if (/^key\w+$/.test(event)) {
            if (userOptions && (userOptions.keyCode !== undefined || userOptions.charCode !== undefined))
                opts = $.extend(opts, {keyCode: userOptions.keyCode || 0, charCode: userOptions.charCode || 0});
            args = getKeyEventArgs(event, opts);
            dispatch = dispatchKeyEvent;
        }
        else if (/^touch\w+$/.test(event)) {
            args = getTouchEventArgs(event, $.extend(opts, {target: el}));
            dispatch = dispatchTouchEvent;
        }
        return dispatch(el, args);
    }

    /* NOTE: options = {
     [clientX: integer,]
     [clientY: integer,]
     [alt: true|false,]
     [ctrl: true|false,]
     [shift: true|false,]
     [meta: true|false,]
     [button: Util.BUTTON]
     }
     */


    // NOTE: mouse events
    exports.Simulator = {};

    exports.Simulator.click = function (el, options) {
        return simulateEvent(el, 'click', options, {
            button: Util.BUTTON.LEFT,
            buttons: Util.BUTTONS_PARAMETER.LEFT_BUTTON
        });
    };

    exports.Simulator.nativeClick = function (el, originClick) {
        raiseNativeClick(el, originClick);
    };

    exports.Simulator.dblclick = function (el, options) {
        return simulateEvent(el, 'dblclick', options, {
            button: Util.BUTTON.LEFT,
            buttons: Util.BUTTONS_PARAMETER.LEFT_BUTTON
        });
    };

    exports.Simulator.rightclick = function (el, options) {
        return simulateEvent(el, 'click', options, {
            button: Util.BUTTON.RIGHT,
            buttons: Util.BUTTONS_PARAMETER.RIGHT_BUTTON
        });
    };

    exports.Simulator.contextmenu = function (el, options) {
        return simulateEvent(el, 'contextmenu', options, {
            button: Util.BUTTON.RIGHT,
            which: Util.WHICH_PARAMETER.RIGHT_BUTTON,
            buttons: Util.BUTTONS_PARAMETER.RIGHT_BUTTON
        });
    };

    exports.Simulator.mousedown = function (el, options) {
        options = options || {};

        options.button = typeof options.button === 'undefined' ? Util.BUTTON.LEFT : options.button;
        options.which = typeof options.which === 'undefined' || options.button !== Util.BUTTON.RIGHT ? Util.WHICH_PARAMETER.LEFT_BUTTON : Util.WHICH_PARAMETER.RIGHT_BUTTON;
        options.buttons = typeof options.buttons === 'undefined' ? Util.BUTTONS_PARAMETER.LEFT_BUTTON : options.buttons;

        return simulateEvent(el, 'mousedown', options);
    };

    exports.Simulator.mouseup = function (el, options) {
        options = options || {};

        options.button = typeof options.button === 'undefined' ? Util.BUTTON.LEFT : options.button;
        options.which = typeof options.which === 'undefined' || options.button !== Util.BUTTON.RIGHT ? Util.WHICH_PARAMETER.LEFT_BUTTON : Util.WHICH_PARAMETER.RIGHT_BUTTON;
        options.buttons = typeof options.buttons === 'undefined' ? Util.BUTTONS_PARAMETER.LEFT_BUTTON : options.buttons;

        return simulateEvent(el, 'mouseup', options);
    };

    exports.Simulator.mouseover = function (el, options) {
        return simulateEvent(el, 'mouseover', options);
    };

    exports.Simulator.mousemove = function (el, options) {
        return simulateEvent(el, 'mousemove', options, {cancelable: false});
    };

    exports.Simulator.mouseout = function (el, options) {
        return simulateEvent(el, 'mouseout', options);
    };

    // NOTE: keyboard events
    exports.Simulator.keypress = function (el, options) {
        return simulateEvent(el, 'keypress', options);
    };

    exports.Simulator.keyup = function (el, options) {
        return simulateEvent(el, 'keyup', options);
    };

    exports.Simulator.keydown = function (el, options) {
        return simulateEvent(el, 'keydown', options);
    };

    exports.Simulator.input = function (el) {
        return dispatchEvent(el, 'input');
    };

    // NOTE: control events
    exports.Simulator.blur = function (el) {
        return dispatchEvent(el, 'blur', DISPATCHED_EVENT_FLAG);
    };

    exports.Simulator.focus = function (el) {
        return dispatchEvent(el, 'focus', DISPATCHED_EVENT_FLAG);
    };

    exports.Simulator.change = function (el) {
        return dispatchEvent(el, 'change', DISPATCHED_EVENT_FLAG);
    };

    exports.Simulator.submit = function (el) {
        return dispatchEvent(el, 'submit');
    };

    // NOTE: touch events
    exports.Simulator.touchstart = function (el, options) {
        return simulateEvent(el, 'touchstart', options);
    };

    exports.Simulator.touchend = function (el, options) {
        return simulateEvent(el, 'touchend', options);
    };

    exports.Simulator.touchmove = function (el, options) {
        return simulateEvent(el, 'touchmove', options);
    };
});
