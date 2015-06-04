var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    UrlUtil = HammerheadClient.get('UrlUtil'),
    XhrBarrier = TestCafeClient.get('ActionBarrier.Xhr'),
    HHSharedErrors = HammerheadClient.get('Shared.Errors'),
    SharedErrors = TestCafeClient.get('Shared.Errors');

Hammerhead.init();

var ENCODED_DESCRIPTOR_VALUES_SEPARATOR = encodeURI(UrlUtil.REQUEST_DESCRIPTOR_VALUES_SEPARATOR);

$.support.cors = true;

$(document).ready(function () {
    asyncTest('waitPageInitialRequests', function () {
        var completeReqCount = 0,
            reqCount = 4;

        expect(1);
        XhrBarrier.init();

        for (var i = 0; i < reqCount; i++) {
            $.get('/xhr-test/500', function () {
                completeReqCount++;
            });
        }

        XhrBarrier.waitPageInitialRequests(function () {
            strictEqual(completeReqCount, reqCount);
            start();
        });
    });

    asyncTest('barrier - Wait requests complete', function () {
        var completeReqCount = 0,
            reqCount = 2;

        expect(1);

        XhrBarrier.init();

        XhrBarrier.startBarrier(function () {
            strictEqual(completeReqCount, reqCount);
            start();
        });

        for (var i = 0; i < reqCount; i++) {
            $.get('/xhr-test/1000', function () {
                completeReqCount++;
            });
        }

        XhrBarrier.waitBarrier();
    });

    asyncTest('barrier - Skip TestCafeClient requests', function () {
        var jqxhr = null,
            TestCafeClientReqComplete = false;

        var Settings = HammerheadClient.get('Settings');

        expect(1);

        XhrBarrier.init();

        XhrBarrier.startBarrier(function () {
            ok(!TestCafeClientReqComplete);
            jqxhr.abort();
            Settings.SERVICE_MSG_URL = null;
            start();
        });

        Settings.SERVICE_MSG_URL = '/xhr-test/8000';

        var action = function (callback) {
            jqxhr = $.ajax(Settings.SERVICE_MSG_URL);

            jqxhr.always(function () {
                TestCafeClientReqComplete = true;
            });
            callback();
        };

        action(function () {
            XhrBarrier.waitBarrier();
        });
    });

    asyncTest('barrier - Timeout', function () {
        var jqxhr = null;

        expect(1);

        var savedTimeout = XhrBarrier.BARRIER_TIMEOUT;

        XhrBarrier.BARRIER_TIMEOUT = 0;
        XhrBarrier.init();

        var handler = function (err) {
            strictEqual(err.code, SharedErrors.XHR_REQUEST_TIMEOUT);
            XhrBarrier.events.off(XhrBarrier.XHR_BARRIER_ERROR, handler);
        };

        XhrBarrier.events.on(XhrBarrier.XHR_BARRIER_ERROR, handler);

        XhrBarrier.startBarrier(function () {
            XhrBarrier.BARRIER_TIMEOUT = savedTimeout;
            start();
        });

        jqxhr = $.get('/xhr-test/8000');

        window.setTimeout(function () {
            jqxhr.abort();
        }, 500);
        XhrBarrier.waitBarrier();
    });

    asyncTest('Redirect requests to proxy', function () {
        expect(3);

        XhrBarrier.init();

        XhrBarrier.startBarrier(function () {
            start();
        });

        var action = function (callback) {
            $.get('/xhr-test/100', function (url) {
                strictEqual(url, '/ownerToken!jobUid/https://example.com/xhr-test/100');
            });

            $.get('http://' + window.location.host + '/xhr-test/200', function (url) {
                strictEqual(url, '/ownerToken!jobUid/https://example.com/xhr-test/200');
            });

            $.get('https://example.com/xhr-test/300', function (url) {
                strictEqual(url, '/ownerToken!jobUid/https://example.com/xhr-test/300');
            });
            callback();
        };

        action(function () {
            XhrBarrier.waitBarrier();
        });
    });

    asyncTest('Unsupported protocol', function () {
        var jqxhr = null;

        expect(1);

        XhrBarrier.init();

        var handler = function (err) {
            strictEqual(err.code, HHSharedErrors.URL_UTIL_PROTOCOL_IS_NOT_SUPPORTED);
            XhrBarrier.events.off(XhrBarrier.XHR_BARRIER_ERROR, handler);
            start();
        };

        XhrBarrier.events.on(XhrBarrier.XHR_BARRIER_ERROR, handler);

        $.get('gopher:test.domain');
    });

    asyncTest('TC request in not processed by page processor', function () {
        var Settings = HammerheadClient.get('Settings');

        var ready = function () {
            if (this.readyState === this.DONE)
                ok(this.responseText.indexOf(Hammerhead.DOM_SANDBOX_STORED_ATTR_POSTFIX) === -1);
        };

        expect(1);

        XhrBarrier.init();

        XhrBarrier.startBarrier(function () {
            Settings.SERVICE_MSG_URL = null;
            start();
        });

        Settings.SERVICE_MSG_URL = '/wrap-responseText-test/json';

        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = ready;
        xhr.open('GET', Settings.SERVICE_MSG_URL, false);
        xhr.send(null);

        XhrBarrier.waitBarrier();
    });

    asyncTest('B238528 - Unexpected text modifying during typing text in the search input on the http://www.google.co.uk', function () {
        var timeout = 100;

        XhrBarrier.init();

        var ready = function () {
            if (this.readyState === this.DONE) {
                ok(syncActionExecuted);
                start();
            }
        };

        var syncActionExecuted = false,
            xhr = new XMLHttpRequest();

        xhr.onreadystatechange = ready;
        xhr.open('GET', '/xhr-test/' + timeout);
        xhr.send(null);

        syncActionExecuted = true;
    });

    asyncTest('T135542 - act.wait method works too-o-o-o long', function () {
        var firstRequestCompleted = false,
            secondRequestCompleted = false;

        var savedTimeout = XhrBarrier.BARRIER_TIMEOUT;

        XhrBarrier.init();

        $.get('/xhr-test/2000',function () {
            firstRequestCompleted = true;
        }).always(function () {
                start();
            });

        expect(2);

        window.setTimeout(function () {
            XhrBarrier.startBarrier(function () {
                XhrBarrier.BARRIER_TIMEOUT = savedTimeout;
                ok(!firstRequestCompleted);
                ok(secondRequestCompleted);
            });

            XhrBarrier.waitBarrier();
            $.get('/xhr-test/200', function () {
                secondRequestCompleted = true;
            });
        }, 100);
    });
});
