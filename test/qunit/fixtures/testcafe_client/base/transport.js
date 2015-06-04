var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Util = Hammerhead.Util;

$(document).ready(function () {
    var Settings = HammerheadClient.get('Settings');
    var Transport = HammerheadClient.get('Transport');

    Settings.SERVICE_MSG_URL = '/service-msg/100';

    asyncTest('Queued async service msg', function () {
        var savedAsyncServiceMsgFunc = Transport.asyncServiceMsg;

        Transport.asyncServiceMsg = function (msg, callback) {
            window.setTimeout(function () {
                callback(msg.duration);
            }, msg.duration);
        };

        var completeMsgReqs = [];

        var msgCallback = function (duration) {
            completeMsgReqs.push(duration);

            if (completeMsgReqs.length === 5) {
                var expectedCompleteMsgReqs = [10, 500, 200, 300, 200];

                deepEqual(completeMsgReqs, expectedCompleteMsgReqs);
                Transport.asyncServiceMsg = savedAsyncServiceMsgFunc;

                start();
            }
        };

        expect(1);

        Transport.queuedAsyncServiceMsg({cmd: 'Type1', duration: 500}, msgCallback);
        Transport.queuedAsyncServiceMsg({cmd: 'Type2', duration: 10}, msgCallback);
        Transport.queuedAsyncServiceMsg({cmd: 'Type1', duration: 200}, msgCallback);
        Transport.queuedAsyncServiceMsg({cmd: 'Type1', duration: 300}, msgCallback);
        Transport.queuedAsyncServiceMsg({cmd: 'Type1', duration: 200}, msgCallback);

    });

    if (!Util.isWebKit) {
        asyncTest('Resend aborted async service msg', function () {
            var xhrCount = 0,
                callbackCount = 0;

            var onAjaxSend = function (event, jqXHR, ajaxOptions) {
                xhrCount++;

                var expectedAsync = xhrCount === 1;

                equal(ajaxOptions.async, expectedAsync);

                jqXHR.abort();
            };

            $(document).on('ajaxSend', onAjaxSend);

            Transport.asyncServiceMsg({}, function () {
                callbackCount++;
            });

            expect(3);

            window.setTimeout(function () {
                equal(callbackCount, 1);

                $(document).off('onAjaxSend', onAjaxSend);
                start();
            }, 200);
        });
    }
    else {
        asyncTest('Resend aborted async service msg (WebKit)', function () {
            var Hammerhead = HammerheadClient.get('Hammerhead'),
                Settings = HammerheadClient.get('Settings'),
                Transport = HammerheadClient.get('Transport');

            Settings.JOB_UID = '%%%testUid%%%';

            var xhrCount = 0,
                callbackCount = 0,
                value = 'testValue';


            ok(!window.localStorage.getItem(Settings.JOB_UID));

            var onAjaxSend = function (event, jqXHR) {
                xhrCount++;

                jqXHR.abort();
            };

            $(document).on('ajaxSend', onAjaxSend);

            var msg = {
                test: value
            };

            Transport.asyncServiceMsg(msg, function () {
                callbackCount++;
            });

            window.setTimeout(function () {
                equal(callbackCount, 1);
                equal(xhrCount, 1);

                var storedMsgStr = window.localStorage.getItem(Settings.JOB_UID),
                    storedMsg = JSON.parse(storedMsgStr)[0];

                ok(storedMsgStr);
                equal(storedMsg.test, value);

                $(document).off('onAjaxSend', onAjaxSend);

                window.localStorage.removeItem(Settings.JOB_UID);
                start();
            }, 200);
        });

        asyncTest('Do not double messages in store (WebKit)', function () {
            var Hammerhead = HammerheadClient.get('Hammerhead'),
                Settings = HammerheadClient.get('Settings'),
                Transport = HammerheadClient.get('Transport');

            Settings.JOB_UID = '%%%testUid%%%';

            var xhrCount = 0,
                callbackCount = 0,
                value = 'testValue';


            ok(!window.localStorage.getItem(Settings.JOB_UID));

            var onAjaxSend = function (event, jqXHR) {
                jqXHR.abort();
            };

            $(document).on('ajaxSend', onAjaxSend);

            var msg = {
                test: value
            };

            Transport.asyncServiceMsg(msg, function () {
                callbackCount++;
            });

            $(document).off('ajaxSend', onAjaxSend);

            Transport.asyncServiceMsg(msg, function () {
                callbackCount++;
            });

            window.setTimeout(function () {
                equal(callbackCount, 2);

                var storedMsgStr = window.localStorage.getItem(Settings.JOB_UID),
                    storedMsgArr = JSON.parse(storedMsgStr);

                equal(storedMsgArr.length, 1);

                window.localStorage.removeItem(Settings.JOB_UID);
                start();
            }, 200);
        });
    }
});
