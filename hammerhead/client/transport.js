/* global isIFrameWithoutSrc:true */
HammerheadClient.define('Transport', function (require, exports) {
    var $ = require('jQuery'),
        async = require('async'),
        JSON = require('JSON'),
        NativeMethods = require('DOMSandbox.NativeMethods'),
        ServiceCommands = require('Shared.ServiceCommands'),
        Settings = require('Settings'),
        Util = require('Util');

    //Const
    var SWITCH_BACK_TO_ASYNC_XHR_DELAY = 2000,
        SERVICE_MESSAGES_WAITING_INTERVAL = 50,
        MSG_RECEIVED = 'received';

    //Globals
    var eventEmitter = new Util.EventEmitter(),
        msgQueue = {},
        useAsyncXhr = true;

    //NOTE: if we are unloading we should switch to sync XHR to be sure that we will not lost any service msgs
    window.addEventListener('beforeunload', function () {
        useAsyncXhr = false;

        //NOTE: if unloading was canceled switch back to async XHR
        NativeMethods.setTimeout.call(window, function () {
            useAsyncXhr = true;
        }, SWITCH_BACK_TO_ASYNC_XHR_DELAY);
    }, true);

    function sendNextQueuedMsg(queueId) {
        var queueItem = msgQueue[queueId][0];

        exports.asyncServiceMsg(queueItem.msg, function (res) {
            if (queueItem.callback)
                queueItem.callback(res);

            msgQueue[queueId].shift();

            eventEmitter.emit(MSG_RECEIVED, {});

            if (msgQueue[queueId].length)
                sendNextQueuedMsg(queueId);
        });
    }

    function storeMessage(msg) {
        var storedMessages = getStoredMessages();

        storedMessages.push(msg);

        window.localStorage.setItem(Settings.JOB_UID, JSON.stringify(storedMessages));
    }

    function getStoredMessages() {
        var storedMessagesStr = window.localStorage.getItem(Settings.JOB_UID);

        return storedMessagesStr ? JSON.parse(storedMessagesStr) : [];
    }

    function removeMessageFromStore(cmd) {
        var messages = getStoredMessages();

        for (var i = 0; i < messages.length; i++) {
            if (messages[i].cmd === cmd) {
                messages.splice(i, 1);

                break;
            }
        }

        window.localStorage.setItem(Settings.JOB_UID, JSON.stringify(messages));
    }

    exports.waitCookieMsg = function (callback) {
        var cookieMsgInProgress = function () {
            return msgQueue[ServiceCommands.SET_COOKIE] && !!msgQueue[ServiceCommands.SET_COOKIE].length;
        };

        if (cookieMsgInProgress()) {
            var handler = function () {
                if (!cookieMsgInProgress()) {
                    eventEmitter.off(MSG_RECEIVED, handler);

                    callback();
                }
            };

            eventEmitter.on(MSG_RECEIVED, handler);
        } else
            callback();
    };

    //NOTE: use sync method for most important things only
    exports.syncServiceMsg = function (msg, callback) {
        var storedSync = useAsyncXhr;

        useAsyncXhr = false;

        exports.asyncServiceMsg(msg, function (res) {
            useAsyncXhr = storedSync;
            callback(res);
        });
    };

    var activeServiceMessagesCounter = 0;

    exports.waitForServiceMessagesCompleted = function (callback, timeout) {
        if (!activeServiceMessagesCounter) {
            callback();
            return;
        }

        var timeoutId = window.setTimeout(function () {
            window.clearInterval(intervalId);
            callback();
        }, timeout);

        var intervalId = window.setInterval(function () {
            if (!activeServiceMessagesCounter) {
                window.clearInterval(intervalId);
                window.clearTimeout(timeoutId);
                callback();
            }
        }, SERVICE_MESSAGES_WAITING_INTERVAL);
    };

    exports.asyncServiceMsg = function (msg, callback) {
        msg.jobUid = Settings.JOB_UID;
        msg.jobOwnerToken = Settings.JOB_OWNER_TOKEN;

        if (isIFrameWithoutSrc)
            msg.referer = Settings.REFERER;

        var opt = {
            async: useAsyncXhr,
            cache: false,
            data: JSON.stringify(msg),
            type: 'POST',
            url: Settings.SERVICE_MSG_URL
        };

        var sendMsg = function (forced) {
            activeServiceMessagesCounter++;

            if (forced)
                opt.async = false;

            var jqxhr = $.ajax(opt),
                msgCallback = function () {
                    activeServiceMessagesCounter--;

                    if (callback)
                        callback(jqxhr.responseText && JSON.parse(jqxhr.responseText));
                };

            if (forced)
                jqxhr.always(msgCallback);
            else {
                jqxhr.done(msgCallback);
                jqxhr.fail(function () {
                    if (Util.isWebKit) {
                        storeMessage(msg);
                        msgCallback();
                    } else
                        sendMsg(true);
                });
            }
        };

        removeMessageFromStore(msg.cmd);
        sendMsg();
    };

    exports.batchUpdate = function (updateCallback) {
        var storedMessages = getStoredMessages();

        if (storedMessages.length) {
            window.localStorage.removeItem(Settings.JOB_UID);

            async.forEach(storedMessages, exports.queuedAsyncServiceMsg, updateCallback);
        } else
            updateCallback();
    };

    exports.queuedAsyncServiceMsg = function (msg, callback) {
        if (!msgQueue[msg.cmd])
            msgQueue[msg.cmd] = [];

        msgQueue[msg.cmd].push({
            msg: msg,
            callback: callback
        });

        //NOTE: if we don't have pending msgs except this one then send it immediately
        if (msgQueue[msg.cmd].length === 1)
            sendNextQueuedMsg(msg.cmd);
    };
});