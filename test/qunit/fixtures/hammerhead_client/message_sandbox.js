var Hammerhead = HammerheadClient.get('Hammerhead'),
    IFrameSandbox = HammerheadClient.get('DOMSandbox.IFrame'),
    MessageSandbox = HammerheadClient.get('DOMSandbox.Message'),
    PageProc = HammerheadClient.get('Shared.PageProc'),
    Settings = HammerheadClient.get('Settings'),
    UrlUtil = HammerheadClient.get('UrlUtil'),

    $ = Hammerhead.$,
    JSProcessor = Hammerhead.JSProcessor,
    Util = Hammerhead.Util;

Hammerhead.init();

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
    IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);
};

QUnit.testDone = function () {
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
};

asyncTest('onmessage event', function () {
    var $iframe = $('<iframe>'),
        storedCrossDomainPort = Settings.CROSS_DOMAIN_PROXY_PORT,
        count = 0;

    Settings.CROSS_DOMAIN_PROXY_PORT = 1336;

    $iframe[0].src = window.getCrossDomainPageUrl('get_message.html');
    $iframe.appendTo('body');

    var onMessageHandler = function (evt) {
        var data = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;

        equal(evt.origin, 'http://origin_iframe_host');
        equal(data.msg, 'https://example.com');

        count++;

        if (count === 2) {
            Settings.CROSS_DOMAIN_PROXY_PORT = storedCrossDomainPort;
            $iframe.remove();
            window.removeEventListener('message', onMessageHandler);
            start();
        }
    };

    $iframe.bind('load', function () {
        eval(PageProc.processScript("window.onmessage = onMessageHandler;"));
        window.addEventListener("message", onMessageHandler);
        eval(PageProc.processScript("this.contentWindow.postMessage('', '*')"));
    });
});

asyncTest('target url', function () {
    expect(0);

    var $iframe = $('<iframe>');

    $iframe[0].src = window.getCrossDomainPageUrl('target_url.html');
    $iframe.appendTo('body');

    var result = 0,
        checkResult = function () {
            if (result === 4) {
                $iframe.remove();
                window.removeEventListener('message', onMessageHandler);
                start();
            }
        };

    var onMessageHandler = function (e) {
        if (parseInt(e.data))
            result++;

        checkResult();
    };

    eval(PageProc.processScript("window.onmessage = onMessageHandler;"));
});

asyncTest('message types', function () {
    var checkValue = function (value, callback, test) {
        var onMessageHandler = function (e) {
            if (test)
                ok(test(e.data));
            else
                strictEqual(e.data, value);

            callback();
        };
        eval(PageProc.processScript("window.onmessage = onMessageHandler;"));
        eval(PageProc.processScript("window.postMessage(value, '*');"));
    };

    if (Util.isIE && Util.browserVersion < 10) {
        checkValue('test', function () {
            start();
        });
    } else {
        checkValue(true, function () {
            checkValue(0, function () {
                checkValue('', function () {
                    checkValue([0], function () {
                        checkValue({a: 0}, function () {
                            checkValue(null, function () {
                                checkValue(undefined, function () {
                                    checkValue('{a:0}', function () {
                                        start();
                                    });
                                });
                            });
                        }, function (a) {
                            return a.a === 0;
                        });
                    }, function (a) {
                        return a.length === 1 && a[0] === 0;
                    });
                });
            });
        });
    }
});

module('Service messages');

asyncTest('Clone service message arguments', function () {
    var $iframe = $('<iframe id="test006">');

    $iframe.bind('load', function () {
        var sourceObj = {testObject: true};

        this.contentWindow.Hammerhead.MessageSandbox.on(MessageSandbox.SERVICE_MSG_RECEIVED, function (e) {
            ok(e.message.testObject);
            e.message.modified = true;
            ok(!sourceObj.modified);
            $iframe.remove();

            start();
        });

        MessageSandbox.sendServiceMsg(sourceObj, this.contentWindow);
    });

    $iframe.appendTo('body');
});

asyncTest('Message', function () {
    var $iframe = $('<iframe>'),
        storedCrossDomainPort = Settings.CROSS_DOMAIN_PROXY_PORT;

    Settings.CROSS_DOMAIN_PROXY_PORT = 1336;

    $iframe[0].src = window.getCrossDomainPageUrl('service_message.html');
    $iframe.appendTo('body');

    var serviceMsgReceived = false;

    function serviceMsgHandler() {
        serviceMsgReceived = true;
    }

    $iframe.bind('load', function () {
        MessageSandbox.on(MessageSandbox.SERVICE_MSG_RECEIVED, serviceMsgHandler);
        MessageSandbox.sendServiceMsg('service_msg', this.contentWindow);

        window.setTimeout(function () {
            ok(serviceMsgReceived);

            Settings.CROSS_DOMAIN_PROXY_PORT = storedCrossDomainPort;
            $iframe.remove();

            MessageSandbox.off(MessageSandbox.SERVICE_MSG_RECEIVED, serviceMsgHandler);

            start();
        }, 200);
    });
});

asyncTest('Service message handler should not call other handlers', function () {
    var $iframe = $('<iframe>'),
        storedCrossDomainPort = Settings.CROSS_DOMAIN_PROXY_PORT;

    Settings.CROSS_DOMAIN_PROXY_PORT = 1336;

    $iframe[0].src = window.getCrossDomainPageUrl('service_message_with_handlers.html');
    $iframe.appendTo('body');

    var windowHandlerExecuted = false;

    var windowMessageHandler = function (evt) {
        windowHandlerExecuted = true;
    };

    var serviceMsgHandler = function (evt) {
        window.setTimeout(function () {
            ok(!windowHandlerExecuted);
            equal(evt.message, 'successfully');

            Settings.CROSS_DOMAIN_PROXY_PORT = storedCrossDomainPort;
            $iframe.remove();

            window.removeEventListener('message', windowMessageHandler);
            MessageSandbox.off(MessageSandbox.SERVICE_MSG_RECEIVED, serviceMsgHandler);

            start();
        }, 100);
    };

    $iframe.bind('load', function () {
        eval(PageProc.processScript("window.onmessage = windowMessageHandler;"));
        window.addEventListener("message", windowMessageHandler);
        MessageSandbox.on(MessageSandbox.SERVICE_MSG_RECEIVED, serviceMsgHandler);
        MessageSandbox.sendServiceMsg('service_msg', this.contentWindow);
    });
});

module('Ping window');

asyncTest('Ping', function () {
    var $iframe = $('<iframe>'),
        iFrameResponseReceived = false;

    var onMessageHandler = function (evt) {
        if (evt.data === 'ready') {
            ok(iFrameResponseReceived);

            window.removeEventListener("message", onMessageHandler);
            $iframe.remove();
            start();
        }
    };

    window.addEventListener("message", onMessageHandler);

    MessageSandbox.pingIFrame($iframe[0], 'pingCmd', function () {
        iFrameResponseReceived = true;
    });

    $iframe[0].src = window.getCrossDomainPageUrl('wait_loading.html');
    $iframe.appendTo('body');
});

asyncTest('Timeout', function () {
    var $iframe = $('<iframe>'),
        timeoutExceededError = false,
        storedDelay = MessageSandbox.PING_IFRAME_TIMEOUT;

    MessageSandbox.PING_IFRAME_TIMEOUT = 5;

    $iframe[0].src = 'http://cross.domain.com/';
    $iframe.appendTo('body');

    MessageSandbox.pingIFrame($iframe[0], 'pingCmd', function (timeoutExceeded) {
        timeoutExceededError = timeoutExceeded;
    });

    window.setTimeout(function () {
        ok(timeoutExceededError);
        $iframe.load(function () {
            $iframe.remove();
        });
        MessageSandbox.PING_IFRAME_TIMEOUT = storedDelay;

        start();
    }, 20);
});

