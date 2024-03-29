/* global isIFrameWithoutSrc:true */
HammerheadClient.define('DOMSandbox.Message', function (require, exports) {
    var EventSandbox = require('DOMSandbox.Event'),
        JSON = require('JSON'),
        NativeMethods = require('DOMSandbox.NativeMethods'),
        UrlUtil = require('UrlUtil'),
        Util = require('Util');

    var messageType = {
        SERVICE: '5Gtrb',
        USER: 'qWip2'
    };

    var SERVICE_MSG_RECEIVED = 'received',
        PING_DELAY = 200;

    //NOTE: published for test purposes only
    exports.PING_IFRAME_TIMEOUT = 7000;
    exports.PING_IFRAME_MIN_TIMEOUT = 100;
    exports.SERVICE_MSG_RECEIVED = SERVICE_MSG_RECEIVED;

    var RECEIVE_MSG_FN = 'tc_rmf_375fb9e7';

    exports.MessageType = messageType;

    var eventEmitter = new Util.EventEmitter(),
        pingCallback = null,
        pingCmd = null;

    //NOTE: the window.top property may be changed after an iFrame is removed from DOM in IE, so we save it on script initializing
    var topWindow = window.top;

    exports.on = eventEmitter.on.bind(eventEmitter);
    exports.off = eventEmitter.off.bind(eventEmitter);

    exports.init = function (window) {
        function onMessage(e) {
            var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

            if (data.type === messageType.SERVICE && e.source) {
                if (pingCmd && data.message.cmd === pingCmd && data.message.isPingResponse) {
                    pingCallback();
                    pingCallback = null;
                    pingCmd = null;
                } else
                    eventEmitter.emit(SERVICE_MSG_RECEIVED, {message: data.message, source: e.source});
            }
        }

        EventSandbox.addInternalEventListener(window, ['message'], onMessage);

        window[RECEIVE_MSG_FN] = (isIFrameWithoutSrc || topWindow === window.self) ? onMessage : null;

        EventSandbox.setEventListenerWrapper(window, ['message'], onWindowMessage);
    };

    function onWindowMessage(e, originListener) {
        var resultEvt = {};

        /* jshint ignore:start */
        for (var key in e)
            resultEvt[key] = typeof e[key] === 'function' ? e[key].bind(e) : e[key];
        /* jshint ignore:end */

        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

        if (data.type !== messageType.SERVICE) {
            var originUrl = UrlUtil.OriginLocation.get();

            if (data.targetUrl === '*' || UrlUtil.sameOriginCheck(originUrl, data.targetUrl)) {
                resultEvt.origin = data.originUrl;

                var isIE9 = Util.isIE && Util.browserVersion < 10;
                // IE9 can send only string values
                if (typeof data.message !== 'string' && (isIE9 || data.isStringMessage))
                    resultEvt.data = JSON.stringify(data.message);
                else
                    resultEvt.data = data.message;

                return originListener.call(window, resultEvt);
            }
        }
    }

    exports.setOnMessage = function (window, value) {
        if (typeof value === 'function') {
            this.storedOnMessageHandler = value;

            window.onmessage = function (e) {
                return onWindowMessage(e, value);
            };
        } else {
            this.storedOnMessageHandler = null;
            window.onmessage = null;
        }
    };

    exports.getOnMessage = function () {
        return this.storedOnMessageHandler;
    };

    exports.postMessage = function (contentWindow, args) {
        var targetUrl = args[1];

        if (Util.isCrossDomainWindows(window, contentWindow))
            args[1] = UrlUtil.getCrossDomainProxyUrl();
        else if (!UrlUtil.isSupportedProtocol(contentWindow.location))
            args[1] = '*';
        else {
            args[1] = UrlUtil.formatUrl({
                protocol: window.location.protocol,
                host: window.location.host
            });
        }

        args[0] = wrapMessage(messageType.USER, args[0], targetUrl);

        if (isIFrameWithoutSrc) {
            window.tc_cw_375fb9e7 = contentWindow;
            window.tc_a_375fb9e7 = args;

            return window.eval('window.tc_cw_375fb9e7.postMessage(window.tc_a_375fb9e7[0], window.tc_a_375fb9e7[1]); delete window.tc_cw_375fb9e7; delete window.tc_a_375fb9e7');
        } else
            return contentWindow.postMessage(args[0], args[1]);
    };

    //NOTE: in IE after an iFrame is removed from DOM the window.top property is equal to window.self
    function isIFrameRemoved() {
        return window.top === window.self && window !== topWindow;
    }

    exports.sendServiceMsg = function (msg, targetWindow) {
        var message = wrapMessage(messageType.SERVICE, msg);

        //NOTE: for iframes without src
        if (!isIFrameRemoved() && (isIFrameWithoutSrc || (!Util.isCrossDomainWindows(targetWindow, window) && targetWindow[RECEIVE_MSG_FN]))) {
            //NOTE: postMessage delay imitation
            NativeMethods.setTimeout.call(topWindow, function () {
                targetWindow[RECEIVE_MSG_FN]({
                    data: JSON.parse(JSON.stringify(message)), // Cloning message to prevent this modification
                    source: window
                });
            }, 10);

            return;
        }

        return targetWindow.postMessage(message, '*');
    };

    exports.pingIFrame = function (targetIFrame, pingMessageCommand, callback, shortWaiting) {
        var pingInterval = null,
            pingTimeout = null,
            targetWindow = null;

        function sendPingRequest() {
            if (targetIFrame.contentWindow) {
                targetWindow = targetIFrame.contentWindow;

                exports.sendServiceMsg({
                    cmd: pingCmd,
                    isPingRequest: true
                }, targetWindow);
            }
        }

        function cleanTimeouts() {
            window.clearInterval(pingInterval);
            window.clearTimeout(pingTimeout);

            pingCallback = null;
            pingCmd = null;
            pingInterval = null;
            pingTimeout = null;
        }

        pingTimeout = NativeMethods.setTimeout.call(window, function () {
            cleanTimeouts();
            callback(true);
        }, shortWaiting ? exports.PING_IFRAME_MIN_TIMEOUT : exports.PING_IFRAME_TIMEOUT);

        if (typeof callback === 'function') {
            pingCallback = function () {
                cleanTimeouts();
                callback();
            };

            pingCmd = pingMessageCommand;

            sendPingRequest();
            pingInterval = NativeMethods.setInterval.call(window, sendPingRequest, PING_DELAY);
        }
    };

    function wrapMessage(type, message, targetUrl) {
        var parsedOrigin = UrlUtil.OriginLocation.getParsed(),
            originUrl = UrlUtil.formatUrl({
                protocol: parsedOrigin.protocol,
                host: parsedOrigin.host
            });

        var result = {
            isStringMessage: typeof message === 'string',
            message: message,
            originUrl: originUrl,
            targetUrl: targetUrl,
            type: type
        };

        // IE9 can send only string values
        return (Util.isIE && Util.browserVersion < 10) ? JSON.stringify(result) : result;
    }
});