var Hammerhead = HammerheadClient.get('Hammerhead'),
    UrlUtil = HammerheadClient.get('UrlUtil'),
    Transport = HammerheadClient.get('Transport'),
    Settings = HammerheadClient.get('Settings'),
    CookieSandbox = HammerheadClient.get('DOMSandbox.Cookie'),
    $ = Hammerhead.$,
    JSProcessor = Hammerhead.JSProcessor,
    NativeMethods = Hammerhead.NativeMethods;

Hammerhead.init();

QUnit.done = function (test_results) {
    /*var tests = log.map(function (details) {
        return {
            name: details.name,
            result: details.result,
            expected: details.expected,
            actual: details.actual,
            source: details.source
        }
    });
    test_results.tests = tests;
*/
    // delaying results a bit cause in real-world
    // scenario you won't get them immediately
    //setTimeout(function () { window.global_test_results = test_results; }, 2000);

    window.global_test_results = test_results;
};

function setCookie(value) {
    return window[JSProcessor.SET_PROPERTY_METH_NAME](document, 'cookie', value);
}

function getCookie() {
    return window[JSProcessor.GET_PROPERTY_METH_NAME](document, 'cookie');
}

asyncTest('Form submit', function () {
    var form = $('<form>')[0],
        storedAsyncServiceMsg = Transport.asyncServiceMsg,
        asyncServiceMsgCallback = null,
        storedNativeSubmit = NativeMethods.formSubmit,
        msgReceived = false;

    Transport.asyncServiceMsg = function (msg, callback) {
        asyncServiceMsgCallback = callback;
    };

    NativeMethods.formSubmit = function () {
        ok(msgReceived);

        NativeMethods.formSubmit = storedNativeSubmit;
        Transport.asyncServiceMsg = storedAsyncServiceMsg;

        start();
    };

    CookieSandbox.setCookie(document, 'cookie=1');

    window[window.Hammerhead.DOM_SANDBOX_OVERRIDE_DOM_METHOD_NAME](form);

    form.submit();

    window.setTimeout(function () {
        msgReceived = true;
        asyncServiceMsgCallback();
    }, 500);
});

module('API');

test('Get - set cookie', function () {
    Settings.COOKIE = '';

    var savedQueuedAsyncServiceMsg = Transport.queuedAsyncServiceMsg,
        savedUrlUtilParseProxyUrl = UrlUtil.parseProxyUrl;

    UrlUtil.parseProxyUrl = function (url) {
        return {
            'originResourceInfo': UrlUtil.parseUrl(url)
        };
    };

    Transport.queuedAsyncServiceMsg = function () {
    };

    var cookieStrs = [
        'Test1=Basic; expires=Wed, 13-Jan-2021 22:23:01 GMT',
        'Test2=PathMatch; expires=Wed, 13-Jan-2021 22:23:01 GMT; path=/',
        'Test3=PathNotMatch; expires=Wed, 13-Jan-2021 22:23:01 GMT; path=/SomeUnknownPath/',
        'Test4=DomainMatch; expires=Wed, 13-Jan-2021 22:23:01 GMT; domain=.' + document.location.host.toString(),
        'Test5=DomainNotMatch; expires=Wed, 13-Jan-2021 22:23:01 GMT; domain=.cbf4e2d79.com',
        'Test6=HttpOnly; expires=Wed, 13-Jan-2021 22:23:01 GMT; path=/; HttpOnly',
        'Test7=Secure; expires=Wed, 13-Jan-2021 22:23:01 GMT; path=/; Secure',
        'Test8=Expired; expires=Wed, 13-Jan-1977 22:23:01 GMT; path=/',
        'Test9=Duplicate; One=More; expires=Wed, 13-Jan-2021 22:23:01 GMT; path=/'
    ];

    for (var i = 0; i < cookieStrs.length; i++)
        setCookie(cookieStrs[i]);

    strictEqual(getCookie(), 'Test1=Basic; Test2=PathMatch; Test4=DomainMatch; Test7=Secure; Test9=Duplicate');

    Transport.queuedAsyncServiceMsg = savedQueuedAsyncServiceMsg;
    UrlUtil.parseProxyUrl = savedUrlUtilParseProxyUrl;
});

module('Regression tests');

test('B239496 - Overwrite cookie', function () {
    Settings.COOKIE = '';

    var savedQueuedAsyncServiceMsg = Transport.queuedAsyncServiceMsg;
    var savedUrlUtilParseProxyUrl = UrlUtil.parseProxyUrl;

    UrlUtil.parseProxyUrl = function (url) {
        return {
            'originResourceInfo': UrlUtil.parseUrl(url)
        };
    };

    Transport.queuedAsyncServiceMsg = function () {
    };

    setCookie('TestKey1=TestVal1');
    setCookie('TestKey2=TestVal2');
    strictEqual(getCookie(), 'TestKey1=TestVal1; TestKey2=TestVal2');

    setCookie('TestKey1=AnotherValue');
    strictEqual(getCookie(), 'TestKey1=AnotherValue; TestKey2=TestVal2');

    setCookie('TestKey2=12;');
    strictEqual(getCookie(), 'TestKey1=AnotherValue; TestKey2=12');

    setCookie('TestKey1=NewValue');
    strictEqual(getCookie(), 'TestKey1=NewValue; TestKey2=12');

    Transport.queuedAsyncServiceMsg = savedQueuedAsyncServiceMsg;
    UrlUtil.parseProxyUrl = savedUrlUtilParseProxyUrl;
});

test('B239496 - Delete cookie', function () {
    Settings.COOKIE = '';

    var savedQueuedAsyncServiceMsg = Transport.queuedAsyncServiceMsg;
    var savedUrlUtilParseProxyUrl = UrlUtil.parseProxyUrl;

    UrlUtil.parseProxyUrl = function (url) {
        return {
            'originResourceInfo': UrlUtil.parseUrl(url)
        };
    };

    Transport.queuedAsyncServiceMsg = function () {
    };

    setCookie('CookieToDelete=DeleteMe');
    strictEqual(getCookie(), 'CookieToDelete=DeleteMe');

    setCookie('NotExistent=; expires=Thu, 01 Jan 1970 00:00:01 GMT;');
    strictEqual(getCookie(), 'CookieToDelete=DeleteMe');

    setCookie('CookieToDelete=; expires=Thu, 01 Jan 1970 00:00:01 GMT;');
    strictEqual(getCookie(), '');

    Transport.queuedAsyncServiceMsg = savedQueuedAsyncServiceMsg;
    UrlUtil.parseProxyUrl = savedUrlUtilParseProxyUrl;
});
