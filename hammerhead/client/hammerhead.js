HammerheadClient.define('Hammerhead', function (require, exports) {
    var $ = require('jQuery'),
        async = require('async'),
        ContentEditableHelper = require('ContentEditableHelper'),
        DOMSandbox = require('DOMSandbox'),
        Errs = require('Shared.Errors'),
        EventSandbox = require('DOMSandbox.Event'),
        IFrameSandbox = require('DOMSandbox.IFrame'),
        InfoManager = require('DOMSandbox.Upload.InfoManager'),
        JSON = require('JSON'),
        JSProcessor = require('Shared.JSProcessor'),
        MessageSandbox = require('DOMSandbox.Message'),
        NativeMethods = require('DOMSandbox.NativeMethods'),
        PageProc = require('Shared.PageProc'),
        PageState = require('PageState'),
        SandboxedJQuery = require('SandboxedJQuery'),
        SandboxUtil = require('DOMSandbox.Util'),
        ShadowUI = require('DOMSandbox.ShadowUI'),
        SharedConst = require('Shared.Const'),
        TextSelection = require('TextSelection'),
        Transport = require('Transport'),
        UploadSandbox = require('DOMSandbox.Upload'),
        Util = require('Util'),
        XhrSandbox = require('DOMSandbox.Xhr');

    // Const
    exports.DOM_SANDBOX_OVERRIDE_DOM_METHOD_NAME = SharedConst.DOM_SANDBOX_OVERRIDE_DOM_METHOD_NAME;
    exports.DOM_SANDBOX_PROCESSED_CONTEXT = SharedConst.DOM_SANDBOX_PROCESSED_CONTEXT;
    exports.DOM_SANDBOX_STORED_ATTR_POSTFIX = SharedConst.DOM_SANDBOX_STORED_ATTR_POSTFIX;
    exports.EVENT_SANDBOX_DISPATCH_EVENT_FLAG = SharedConst.EVENT_SANDBOX_DISPATCH_EVENT_FLAG;
    exports.OLD_ATTR_VALUES = SharedConst.OLD_ATTR_VALUES;
    exports.PROPERTIES_FOR_WRAPPING = JSProcessor.wrappedProperties;
    exports.TEST_CAFE_HOVER_PSEUDO_CLASS_ATTR = SharedConst.TEST_CAFE_HOVER_PSEUDO_CLASS_ATTR;
    exports.TEST_CAFE_HOVER_PSEUDO_CLASS_ATTR = SharedConst.TEST_CAFE_HOVER_PSEUDO_CLASS_ATTR;
    exports.TEST_CAFE_UI_CLASSNAME_POSTFIX = SharedConst.TEST_CAFE_UI_CLASSNAME_POSTFIX;

    // Events
    exports.BEFORE_BEFORE_UNLOAD_EVENT = EventSandbox.BEFORE_BEFORE_UNLOAD_EVENT;
    exports.BEFORE_UNLOAD_EVENT = EventSandbox.BEFORE_UNLOAD_EVENT;
    exports.BODY_CREATED = DOMSandbox.BODY_CREATED;
    exports.DOM_DOCUMENT_CLEARED = DOMSandbox.DOCUMENT_CLEARED;
    exports.FILE_UPLOADING_EVENT = UploadSandbox.FILE_UPLOADING_EVENT;
    exports.IFRAME_READY_TO_INIT = IFrameSandbox.IFRAME_READY_TO_INIT;
    exports.UNCAUGHT_JS_ERROR = DOMSandbox.UNCAUGHT_JS_ERROR;
    exports.UNLOAD_EVENT = EventSandbox.UNLOAD_EVENT;
    exports.XHR_COMPLETED = XhrSandbox.XHR_COMPLETED;
    exports.XHR_ERROR = XhrSandbox.XHR_ERROR;
    exports.XHR_SEND = XhrSandbox.XHR_SEND;

    var getEventOwner = function (evtName) {
        switch (evtName) {
            case EventSandbox.BEFORE_UNLOAD_EVENT:
            case EventSandbox.BEFORE_BEFORE_UNLOAD_EVENT:
            case EventSandbox.UNLOAD_EVENT:
                return EventSandbox;

            case DOMSandbox.BODY_CREATED:
            case DOMSandbox.DOCUMENT_CLEARED:
            case DOMSandbox.UNCAUGHT_JS_ERROR:
                return DOMSandbox;

            case UploadSandbox.FILE_UPLOADING_EVENT:
                return UploadSandbox;

            case IFrameSandbox.IFRAME_READY_TO_INIT:
                return IFrameSandbox;

            case XhrSandbox.XHR_COMPLETED:
            case XhrSandbox.XHR_ERROR:
            case XhrSandbox.XHR_SEND:
                return XhrSandbox;

            default:
                return null;
        }
    };

    exports.on = function (evtName, handler) {
        var eventOwner = getEventOwner(evtName);

        if (eventOwner)
            eventOwner.on(evtName, handler);
    };

    exports.off = function (evtName, handler) {
        var eventOwner = getEventOwner(evtName);

        if (eventOwner)
            eventOwner.off(evtName, handler);
    };

    // Methods
    exports.getOriginElementAttributes = SandboxUtil.getAttributesProperty;
    exports.getStoredAttrName = PageProc.getStoredAttrName;
    exports.upload = UploadSandbox.upload;

    // Private members
    exports._raiseBodyCreatedEvent = DOMSandbox.raiseBodyCreatedEvent;
    exports._rebindDomSandboxToIframe = DOMSandbox.rebindDomSandboxToIframe;
    exports._UploadManager = InfoManager;
    
    // Modules
    exports.$ = $;
    exports.async = async;
    exports.ContentEditableHelper = ContentEditableHelper;
    exports.Errs = Errs;
    exports.EventSandbox = EventSandbox;
    exports.EventSimulator = EventSandbox.Simulator;
    exports.JSON = JSON;
    exports.JSProcessor = JSProcessor;
    exports.MessageSandbox = MessageSandbox;
    exports.NativeMethods = NativeMethods;
    exports.PageState = PageState;
    exports.ShadowUI = ShadowUI;
    exports.TextSelection = TextSelection;
    exports.Transport = Transport;
    exports.Util = Util;

    exports.init = function () {
        DOMSandbox.init(window, document);
        exports.SandboxedJQuery = SandboxedJQuery.jQuery;
    };

    window.Hammerhead = exports;
});