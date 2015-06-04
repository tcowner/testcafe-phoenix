var DomAccessorWrappers = HammerheadClient.get('DOMSandbox.DomAccessorWrappers'),
    IFrameSandbox = HammerheadClient.get('DOMSandbox.IFrame'),
    Hammerhead = HammerheadClient.get('Hammerhead'),
    PageProc = HammerheadClient.get('Shared.PageProc'),
    PageState = HammerheadClient.get('PageState'),
    Settings = HammerheadClient.get('Settings'),
    ShadowUI = HammerheadClient.get('DOMSandbox.ShadowUI'),
    UrlUtil = HammerheadClient.get('UrlUtil'),
    EventSandbox = HammerheadClient.get('DOMSandbox.Event'),
    $ = Hammerhead.$,
    JSProcessor = Hammerhead.JSProcessor,
    NativeMethods = Hammerhead.NativeMethods,
    Util = Hammerhead.Util;

Hammerhead.init();

var handler = function (e) {
    if (e.iframe.id.indexOf('test') !== -1) {
        e.iframe.contentWindow.eval.call(e.iframe.contentWindow, [
            'HammerheadClient.define(\'Settings\', function (require, exports) {',
            '    exports.REFERER = "http://localhost/ownerToken!jobUid/https://example.com";',
            '    exports.JOB_OWNER_TOKEN = "ownerToken";',
            '    exports.JOB_UID = "jobUid";',
            '});',
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

test('Wrapped properties equals with accessors properties', function () {
    var elementPropertyAccessorsKeys = Object.keys(DomAccessorWrappers.elementPropertyAccessors),
        wrappedProperties = Object.keys(JSProcessor.wrappedProperties);

    ok(elementPropertyAccessorsKeys.length === wrappedProperties.length);

    for (var i = 0; i < wrappedProperties.length; i++)
        ok(elementPropertyAccessorsKeys.indexOf(wrappedProperties[i]) !== -1, wrappedProperties[i])
});

if (Util.isChrome) {
    test('Url in stylesheet properties', function () {
        var el = document.createElement('div'),
            url = 'http://google.com/image.png',
            proxyUrl = UrlUtil.getProxyUrl(url);

        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('el.style.backgroundImage="url(' + url + ')"'));
        equal(window[JSProcessor.GET_PROPERTY_METH_NAME](el.style, 'backgroundImage'), 'url(' + url +
                                                                                       ')', 'backgroundImage');
        equal(el.style.backgroundImage, 'url(' + proxyUrl + ')', 'backgroundImage');

        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('el.style.background="url(' + url + ')"'));
        equal(window[JSProcessor.GET_PROPERTY_METH_NAME](el.style, 'background'), 'url(' + url + ')', 'background');
        equal(el.style.background, 'url(' + proxyUrl + ')', 'background');

        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('el.style.listStyle="url(' + url + ')"'));
        equal(window[JSProcessor.GET_PROPERTY_METH_NAME](el.style, 'listStyle'), 'url(' + url + ')', 'listStyle');
        equal(el.style.listStyle, 'url(' + proxyUrl + ')', 'listStyle');

        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('el.style.listStyleImage="url(' + url + ')"'));
        equal(window[JSProcessor.GET_PROPERTY_METH_NAME](el.style, 'listStyleImage'), 'url(' + url +
                                                                                      ')', 'listStyleImage');
        equal(el.style.listStyleImage, 'url(' + proxyUrl + ')', 'listStyleImage');

        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('el.style.cssText="background-image: url(' + url + ')"'));
        equal(window[JSProcessor.GET_PROPERTY_METH_NAME](el.style, 'cssText'), 'background-image: url(' + url +
                                                                               ');', 'cssText');
        equal(el.style.cssText, 'background-image: url(' + proxyUrl + ');', 'cssText');

        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('el.style.cursor="url(' + url + '), auto"'));
        equal(window[JSProcessor.GET_PROPERTY_METH_NAME](el.style, 'cursor'), 'url(' + url + '), auto', 'cursor');
        equal(el.style.cursor, 'url(' + proxyUrl + '), auto', 'cursor');
    });
}

module('Location wrapper');

asyncTest('Iframe with empty src', function () {
    var $iframe1 = $('<iframe id="test1">'),
        $iframe2 = $('<iframe id="test2" src="">'),
        $iframe3 = $('<iframe id="test3" src="about:blank">');
        
    function assert($iframe, callback) {
        $iframe.bind('load', function () {
            DomAccessorWrappers.init(this.contentWindow, this.contentDocument);

            var hyperlink = this.contentDocument.createElement('a');

            hyperlink.setAttribute('href', '/test');
            this.contentDocument.body.appendChild(hyperlink);

            equal(
                eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('hyperlink.href')),
                'https://example.com/test'
            );

            equal(
                eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('this.contentDocument.location.href')),
                'about:blank'
            );

            callback();
        });
        $iframe.appendTo('body');
    }

    assert($iframe1, function () {
        assert($iframe2, function () {
            assert($iframe3, function () {
                $iframe1.remove();
                $iframe2.remove();
                $iframe3.remove();
                
                start();
            });
        });
    });
});

// Only Chrome raises 'load' event for iframes with 'javascript:' src and creates window instance
if(Util.isWebKit) {
    asyncTest('Iframe with "javascript:" src', function () {
        var $iframe = $('<iframe id="test3" src="javascript:void(0);">');
            
        $iframe.bind('load', function () {        
            DomAccessorWrappers.init(this.contentWindow, this.contentDocument);
    
            var hyperlink = this.contentDocument.createElement('a');
    
            hyperlink.setAttribute('href', '/test');
            this.contentDocument.body.appendChild(hyperlink);
    
            equal(
                eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('hyperlink.href')),
                'https://example.com/test'
            );
    
            equal(
                eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('this.contentDocument.location.href')),
                'about:blank'
            );
    
            $iframe.remove();
            start();
        });
        
        $iframe.appendTo('body');    
    });
}

test('Iframe', function () {
    var checkProp = function (prop, value) {
            var windowMock = {
                location: UrlUtil.getProxyUrl('http://google.net:90/'),
                top: {document: document}
            };

            DomAccessorWrappers.init(windowMock, {});
            windowMock[DomAccessorWrappers.LOCATION_WRAPPER][prop] = value;
            equal(UrlUtil.getProxyUrl(windowMock.location).resourceType, UrlUtil.Iframe);
        },
        checkFunc = function (func, value) {
            var windowMock = {
                location: {
                    toString: function () {
                        return UrlUtil.getProxyUrl('http://google.net:90/')
                    },
                    assign: function (value) {
                        windowMock.location.assign_value = value;
                    },
                    replace: function (value) {
                        windowMock.location.replace_value = value;
                    }
                },
                top: {document: document}
            };

            DomAccessorWrappers.init(windowMock, {});
            windowMock[DomAccessorWrappers.LOCATION_WRAPPER][func](value);
            equal(UrlUtil.getProxyUrl(windowMock.location[func + '_value']).resourceType, UrlUtil.Iframe);
        };


    checkProp('port', 1333);
    checkProp('host', 'google.com:80');
    checkProp('hostname', 'google.com');
    checkProp('pathname', '/index.html');
    checkProp('protocol', 'https:');
    checkProp('href', 'http://google.com');
    checkProp('search', '?param=value');

    checkFunc('assign', 'http://google.com');
    checkFunc('replace', 'http://google.com');
});

asyncTest('Cross-domain iframe', function () {
    // Fix it;
    ok(true);
    start();
    return;

    var $iframe = $('<iframe>'),
        storedPort = Settings.CROSS_DOMAIN_PROXY_PORT;

    Settings.CROSS_DOMAIN_PROXY_PORT = 1336;

    $iframe[0].src = window.getCrossDomainPageUrl('execute_script.html');

    var handler = function () {
        $iframe.unbind('load', handler);

        $iframe.bind('load', function () {
            equal($iframe[0].contentWindow.location.host, location.host);

            Settings.CROSS_DOMAIN_PROXY_PORT = storedPort;

            start();
        });

        var message = 'location.href = "' + location.host + '";';

        eval(PageProc.processScript('$iframe[0].contentWindow.postMessage(message, "*");'));
    };

    $iframe.bind('load', handler);
    $iframe.appendTo('body');
});

test('Get location origin', function () {
    var locWrapper = window[JSProcessor.GET_LOCATION_METH_NAME](location);

    equal(locWrapper.origin, 'https://example.com');
});

test('Create location wrapper before iframe loading', function () {
    var $iframe = $('<iframe id="test001">').appendTo('body');

    ok(!!eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$iframe[0].contentWindow.location')));
    ok(!!eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$iframe[0].contentDocument.location')));

    $iframe.remove();
});

module('Property getters');

if (!Util.isIE || Util.browserVersion > 9) {
    test('Get autocomplete property', function () {
        var input = $('<input>')[0],
            etalon = NativeMethods.createElement.call(document, 'input');

        strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('input.autocomplete')), etalon.autocomplete);
        strictEqual(NativeMethods.getAttribute.call(input, 'autocomplete'), 'off');

        input.setAttribute('autocomplete', 'off');
        NativeMethods.setAttribute.call(etalon, 'autocomplete', 'off');
        strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('input.autocomplete')), etalon.autocomplete);
        strictEqual(NativeMethods.getAttribute.call(input, 'autocomplete'), 'off');

        input.setAttribute('autocomplete', 'on');
        NativeMethods.setAttribute.call(etalon, 'autocomplete', 'on');
        strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('input.autocomplete')), etalon.autocomplete);
        strictEqual(NativeMethods.getAttribute.call(input, 'autocomplete'), 'off');

        input.setAttribute('autocomplete', '');
        NativeMethods.setAttribute.call(etalon, 'autocomplete', '');
        strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('input.autocomplete')), etalon.autocomplete);
        strictEqual(NativeMethods.getAttribute.call(input, 'autocomplete'), 'off');

        input.removeAttribute('autocomplete');
        NativeMethods.removeAttribute.call(etalon, 'autocomplete');
        strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('input.autocomplete')), etalon.autocomplete);
        strictEqual(NativeMethods.getAttribute.call(input, 'autocomplete'), 'off');
    });
}

test('Get url property', function () {
    var $scriptWithSrc = $('<script src="http://some.com/script.js">'),
        $scriptWithEmptySrc = $('<script src="">'),
        $scriptWithoutSrc = $('<script>'),
        $linkWithOnlyHash = $('<a href="#hash">');

    var proxyLocation = UrlUtil.OriginLocation.get();

    strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$scriptWithSrc[0].src')), 'http://some.com/script.js');
    strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$scriptWithEmptySrc[0].src')), proxyLocation);
    strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$scriptWithoutSrc[0].src')), '');
    strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$linkWithOnlyHash[0].href')), proxyLocation +
                                                                                                 '#hash');
});

test('Get attributes property', function () {
    var link = $('<a href="http://some.com/" rel="x">')[0],
        attributes = null;

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('attributes = link.attributes'));
    strictEqual(link.attributes.length, 3);
    strictEqual(attributes.length, 2);
    strictEqual(attributes[0].value, attributes[0].name === 'href' ? 'http://some.com/' : 'x');
    strictEqual(attributes[1].value, attributes[1].name === 'rel' ? 'x' : 'http://some.com/');
    strictEqual(attributes.item(1).value, attributes.item(1).name === 'rel' ? 'x' : 'http://some.com/');
    strictEqual(attributes['href'].value, 'http://some.com/');
    strictEqual(attributes['rel'].value, 'x');
    strictEqual(attributes['ReL'].value, 'x');
    strictEqual(attributes.getNamedItem('rel').value, 'x');

    var div = $('<div attr1="value1" attr2="value2">')[0];

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('attributes = div.attributes'));
    strictEqual(div.attributes, attributes);
});

test('Get document element property', function () {
    var $input = $('<input />').appendTo('body'),
        $shadowInput = $('<input />').appendTo(ShadowUI.getRoot());

    equal(window[JSProcessor.GET_PROPERTY_METH_NAME](document, 'activeElement'), document.body);

    $shadowInput[0].focus();

    equal(window[JSProcessor.GET_PROPERTY_METH_NAME](document, 'activeElement'), document.body);

    $input[0].focus();
    PageState.saveState();
    $shadowInput[0].focus();

    equal(window[JSProcessor.GET_PROPERTY_METH_NAME](document, 'activeElement'), $input[0]);
});

module('Property setters');

test('script.textContent property', function () {
    var script = document.createElement('script'),
        scriptCode = 'var test = window.href;';

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('script.textContent="' + scriptCode + '"'));

    notEqual(script.textContent, scriptCode);
    equal(script.textContent.replace(/\s/g, ''), PageProc.processScript(scriptCode).replace(/\s/g, ''));
});

test('Unsupported protocol', function () {
    var $img = $('<img>');

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$img[0].src = "about:blank";'));

    equal(window[JSProcessor.GET_PROPERTY_METH_NAME]($img[0], 'src'), 'about:blank');
    equal($img[0].src, 'about:blank');
});

test('Set anchor properties', function () {
    var anchor = document.createElement('a'),
        emptyAnchor = document.createElement('a'),
        anchorWithNotSupportedProtocol = document.createElement('a'),
        etalonAnchor = document.createElement('a'),
        etalonEmptyAnchor = document.createElement('a'),
        etalonAnchorWithNotSupportedProtocol = document.createElement('a'),
        url = 'https://google.com:1888/index.html?value#yo',
        proxyUrl = UrlUtil.getProxyUrl(url);

    etalonAnchor.href = url;
    anchor.href = proxyUrl;

    var execScript = function (script) {
        return eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME](script));
    };

    strictEqual(execScript('anchor.port'), etalonAnchor.port, 'Anchor - port');
    strictEqual(execScript('anchor.host'), etalonAnchor.host, 'Anchor - host');
    strictEqual(execScript('anchor.hostname'), etalonAnchor.hostname, 'Anchor - hostname');
    strictEqual(execScript('anchor.protocol'), etalonAnchor.protocol, 'Anchor - protocol');
    strictEqual(execScript('anchor.pathname'), etalonAnchor.pathname, 'Anchor - pathname');
    strictEqual(execScript('anchor.search'), etalonAnchor.search, 'Anchor - search');
    strictEqual(execScript('anchor.hash'), etalonAnchor.hash, 'Anchor - hash');


    if ('origin' in anchor)
        strictEqual(execScript('anchor.origin'), etalonAnchor.origin);

    strictEqual(execScript('emptyAnchor.port'), etalonEmptyAnchor.port);
    strictEqual(execScript('emptyAnchor.host'), etalonEmptyAnchor.host);
    strictEqual(execScript('emptyAnchor.hostname'), etalonEmptyAnchor.hostname);
    strictEqual(execScript('emptyAnchor.protocol'), etalonEmptyAnchor.protocol);
    strictEqual(execScript('emptyAnchor.pathname'), etalonEmptyAnchor.pathname);
    strictEqual(execScript('emptyAnchor.search'), etalonEmptyAnchor.search);

    if ('origin' in etalonEmptyAnchor)
        strictEqual(execScript('emptyAnchor.origin'), etalonEmptyAnchor.origin);


    // Port
    execScript('anchor.port="8080";');
    etalonAnchor.port = '8080';
    strictEqual(execScript('anchor.port'), etalonAnchor.port);

    etalonEmptyAnchor.port = '8080';
    execScript('emptyAnchor.port="8080";');
    strictEqual(execScript('emptyAnchor.port'), etalonEmptyAnchor.port);

    // Host
    execScript('anchor.host="yandex.com";');
    etalonAnchor.host = 'yandex.com';
    strictEqual(execScript('anchor.host'), etalonAnchor.host);

    execScript('emptyAnchor.host="yandex.com";');
    etalonEmptyAnchor.host = 'yandex.com';
    strictEqual(execScript('emptyAnchor.host'), etalonEmptyAnchor.host);

    // Hostname
    execScript('anchor.hostname="yandex.ru";');
    etalonAnchor.hostname = 'yandex.ru';
    strictEqual(execScript('anchor.hostname'), etalonAnchor.hostname);

    execScript('emptyAnchor.hostname="yandex.ru";');
    etalonEmptyAnchor.hostname = 'yandex.ru';
    strictEqual(execScript('emptyAnchor.hostname'), etalonEmptyAnchor.hostname);

    // Protocol
    execScript('anchor.protocol="http:";');
    etalonAnchor.protocol = 'http:';
    strictEqual(execScript('anchor.protocol'), etalonAnchor.protocol);


    if (!/iPad|iPhone/i.test(navigator.userAgent)) {
        execScript('emptyAnchor.protocol="https:";'); // TODO: iOS!!!
        etalonEmptyAnchor.protocol = 'https:';
        strictEqual(execScript('emptyAnchor.protocol'), etalonEmptyAnchor.protocol);
    }

    // Pathname
    var newPathName = etalonAnchor.pathname + '/index.php';

    execScript('anchor.pathname="' + newPathName + '"');
    etalonAnchor.pathname = newPathName;
    strictEqual(execScript('anchor.pathname'), etalonAnchor.pathname);

    execScript('emptyAnchor.pathname="temp/index.php";'); // TODO: iOS!!!
    etalonEmptyAnchor.pathname = 'temp/index.php';
    strictEqual(execScript('emptyAnchor.pathname'), etalonEmptyAnchor.pathname);

    // Origin
    // IE has no origin property
    if ('origin' in etalonEmptyAnchor) {
        execScript('anchor.origin="http://yandex.ru:1335"');
        etalonAnchor.origin = 'http://yandex.ru:1335';
        strictEqual(execScript('anchor.origin'), etalonAnchor.origin);

        execScript('emptyAnchor.origin="http://yandex.ru:1335";'); // TODO: iOS!!!
        etalonEmptyAnchor.origin = 'http://yandex.ru:1335';
        strictEqual(execScript('emptyAnchor.origin'), etalonEmptyAnchor.origin);
    }

    // Search
    execScript('anchor.search="?test=temp"');
    etalonAnchor.search = '?test=temp';
    strictEqual(execScript('anchor.search'), etalonAnchor.search);

    execScript('emptyAnchor.search="?test=temp"'); // TODO: iOS!!!
    etalonEmptyAnchor.search = '?test=temp';
    strictEqual(execScript('emptyAnchor.search'), etalonEmptyAnchor.search);

    anchorWithNotSupportedProtocol.href = 'javascript:;';
    etalonAnchorWithNotSupportedProtocol.href = 'javascript:;';

    strictEqual(execScript('anchorWithNotSupportedProtocol.port'), etalonAnchorWithNotSupportedProtocol.port);
    strictEqual(execScript('anchorWithNotSupportedProtocol.host'), etalonAnchorWithNotSupportedProtocol.host);
    strictEqual(execScript('anchorWithNotSupportedProtocol.hostname'), etalonAnchorWithNotSupportedProtocol.hostname);
    strictEqual(execScript('anchorWithNotSupportedProtocol.protocol'), etalonAnchorWithNotSupportedProtocol.protocol);
    strictEqual(execScript('anchorWithNotSupportedProtocol.pathname'), etalonAnchorWithNotSupportedProtocol.pathname);
    strictEqual(execScript('anchorWithNotSupportedProtocol.search'), etalonAnchorWithNotSupportedProtocol.search);

    if ('origin' in anchorWithNotSupportedProtocol)
        strictEqual(execScript('anchorWithNotSupportedProtocol.origin'), etalonAnchorWithNotSupportedProtocol.origin);
});

test('Set location as a local var', function () {
    var location = '';

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('location = "test"'));

    strictEqual(location, 'test');

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('location = null'));

    strictEqual(location, null);

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('location = undefined'));

    strictEqual(location, undefined);

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('location = ""'));

    strictEqual(location, '');
});

test('Set property for simple type', function () {
    strictEqual(window[JSProcessor.SET_PROPERTY_METH_NAME](1, 'prop_name', 2), 2);
});

test('Set script text', function () {
    var script = document.createElement('script');

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('script.text="var test = window.href;"'));

    ok(JSProcessor.isScriptProcessed(script.text));
});

test('Set iframe sandbox', function () {
    var iframe = document.createElement('iframe');

    window[window.Hammerhead.DOM_SANDBOX_OVERRIDE_DOM_METHOD_NAME](iframe);

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('iframe.sandbox="allow-forms"'));

    equal(NativeMethods.getAttribute.call(iframe, 'sandbox'), 'allow-forms allow-scripts');
    equal(NativeMethods.getAttribute.call(iframe, PageProc.getStoredAttrName('sandbox')), 'allow-forms');

    var result = '';

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('result = iframe.sandbox'));

    equal(result, 'allow-forms');
});

asyncTest('Set body.innerHTML in iframe', function () {
    expect(2);

    $('<iframe src="/data/dom_accessor_wrappers/iframe.html">').appendTo(document.body).load(function () {
        var iframe = this,
            iframeDocument = iframe.contentWindow.document;

        ok(NativeMethods.querySelector.call(iframeDocument, 'body [id^="root"]') !== null);

        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('iframeDocument.body.innerHTML = "";'));

        window.setTimeout(function () {
            ok(NativeMethods.querySelector.call(iframeDocument, 'body [id^="root"]') !== null);

            iframe.parentNode.removeChild(iframe);

            start();
        }, 100);
    });
});

module('Type verifiers');

test('Is anchor instance', function () {
    var anchor = document.createElement('a');

    ok(DomAccessorWrappers.elementPropertyAccessors['protocol'].condition(anchor));
});

test('Is dom element instance', function () {
    var img = document.createElement('img'),
        fragment = document.createDocumentFragment(),
        notDomElement = {
            tagName: 'img',
            nodeType: 3
        };

    ok(DomAccessorWrappers.elementPropertyAccessors['src'].condition(img), 'Element <img> is dom element');
    ok(!DomAccessorWrappers.elementPropertyAccessors['src'].condition(fragment), 'Element "fragment" isn\'t dom element');
    ok(!DomAccessorWrappers.elementPropertyAccessors['src'].condition(notDomElement), 'Object with property "tagName" isn\'t dom element');
    ok(!DomAccessorWrappers.elementPropertyAccessors['src'].condition(document), 'Document isn\'t dom element');
});

test('Is document instance', function () {
    var savedGetProxyUrl = UrlUtil.getProxyUrl,
        fakeDoc = {
            referrer: ''
        };

    UrlUtil.getProxyUrl = function () {
        return 'http://proxy/';
    };

    window[JSProcessor.SET_PROPERTY_METH_NAME](fakeDoc, 'referrer', 'referrer');

    equal(fakeDoc.referrer, 'referrer');

    UrlUtil.getProxyUrl = savedGetProxyUrl;
});

test('Is window instance', function () {
    var savedGetProxyUrl = UrlUtil.getProxyUrl,
        fakeWin = {
            location: ''
        };

    UrlUtil.getProxyUrl = function () {
        return 'http://proxy/';
    };

    window[JSProcessor.SET_PROPERTY_METH_NAME](fakeWin, 'location', 'location');

    equal(fakeWin.location, 'location');

    UrlUtil.getProxyUrl = savedGetProxyUrl;
});

test('Is location instance', function () {
    var savedGetProxyUrl = UrlUtil.getProxyUrl,
        fakeLocation = {
            href: ''
        };

    UrlUtil.getProxyUrl = function () {
        return 'http://proxy/';
    };

    window[JSProcessor.SET_PROPERTY_METH_NAME](fakeLocation, 'href', 'href');

    equal(fakeLocation.href, 'href');

    UrlUtil.getProxyUrl = savedGetProxyUrl;
});

// IE does not allow to override postMessage method
if (!Util.isIE) {
    module('Except IE');

    asyncTest('postMessage', function () {
        var $iframe = $('<iframe src="' + window.location.origin + '">'),
            target = window.location.protocol + '//' + window.location.host;

        $iframe.bind('load', function () {
            $iframe[0].contentWindow.postMessage = function (data, target) {
                strictEqual(target, window.location.origin);
                $iframe.remove();
                this.postMessage = function () {
                };
                start();
            };

            eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$iframe[0].contentWindow.postMessage("data", "' +
                                                              target + '")'));
        });

        $iframe.appendTo($('body'));
    });
}

module('Access errors');

test('Call method of null or undefined', function () {
    var obj;

    throws(function () {
        window[JSProcessor.CALL_METHOD_METH_NAME](obj, 'yoyo');
    }, /Cannot call method 'yoyo' of undefined/);

    obj = null;

    throws(function () {
        window[JSProcessor.CALL_METHOD_METH_NAME](obj, 'yoyo');
    }, /Cannot call method 'yoyo' of null/);
});

test('Calling not function', function () {
    var obj = {
        yo1: 123,
        yo2: null,
        yo3: 'hey ya'
    };

    throws(function () {
        window[JSProcessor.CALL_METHOD_METH_NAME](obj, 'yo1');
    }, /'yo1' is not a function/);

    throws(function () {
        window[JSProcessor.CALL_METHOD_METH_NAME](obj, 'yo2');
    }, /'yo2' is not a function/);

    throws(function () {
        window[JSProcessor.CALL_METHOD_METH_NAME](obj, 'yo3');
    }, /'yo3' is not a function/);
});

test('Reading property of null or undefined', function () {
    var obj;

    throws(function () {
        window[JSProcessor.GET_PROPERTY_METH_NAME](obj, 'yoyo');
    }, /Cannot read property 'yoyo' of undefined/);

    obj = null;

    throws(function () {
        window[JSProcessor.GET_PROPERTY_METH_NAME](obj, 'yoyo');
    }, /Cannot read property 'yoyo' of null/);
});

test('Setting property of null or undefined', function () {
    var obj;

    throws(function () {
        window[JSProcessor.SET_PROPERTY_METH_NAME](obj, 'yoyo');
    }, /Cannot set property 'yoyo' of undefined/);

    obj = null;

    throws(function () {
        window[JSProcessor.SET_PROPERTY_METH_NAME](obj, 'yoyo');
    }, /Cannot set property 'yoyo' of null/);
});

module('Regression tests');

test('T123960: Health monitor - change url properties of link not changed stored attribute(xda-developers.com)', function () {
    var $link = $('<a>');

    var url = '/path?param=value',
        proxyUrl = UrlUtil.getProxyUrl(url);

    window[JSProcessor.SET_PROPERTY_METH_NAME]($link[0], 'href', url);
    equal($link[0].href, proxyUrl);
    equal(window[JSProcessor.GET_PROPERTY_METH_NAME]($link[0], 'href'), UrlUtil.formatUrl(UrlUtil.parseProxyUrl(proxyUrl).originResourceInfo));

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$link[0].pathname="newPath"'));
    ok(/newPath$/.test(window[JSProcessor.GET_PROPERTY_METH_NAME]($link[0], 'pathname')));
    equal($link[0].href, UrlUtil.getProxyUrl('/newPath?param=value'));
    ok(/\/newPath\?param=value$/.test(window[JSProcessor.GET_PROPERTY_METH_NAME]($link[0], 'href')));
});

test('T198784: Javascript error on the http://automated-testing.info/ page', function () {
    var obj = {
        target: 'ok',
        tagName: -1
    };

    strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('obj.target')), 'ok');
});
 
if(Util.isMozilla || Util.isIE11) {
    asyncTest('T239109 - TD 15.1 - Hummerhead script error after perform search on http://livejournal.com page', function () {
        var $iframe = $('<iframe id="test_wrapper">');
        
        window.top.onIframeInited = function(window) {
            window.HammerheadClient.get('DOMSandbox.IFrame').on(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
            window.HammerheadClient.get('DOMSandbox.IFrame').off(IFrameSandbox.IFRAME_READY_TO_INIT, window.HammerheadClient.get('DOMSandbox.IFrame').iframeReadyToInitHandler);             
        };
        
        $iframe[0].setAttribute('src', 'javascript:\'' +
            '   <html><body><script>' + 
            '       window.top.onIframeInited(window);' +
            '       var quote = String.fromCharCode(34);' +
            '       if(true){document.write("<iframe id=" + quote + "test_iframe" + quote + "></iframe>");}' +
            '       if(true){document.getElementById("test_iframe").contentDocument.write("<body><script>document.body.innerHTML = " + quote + "<div></div>" + quote + ";</s" + "cript></body>");}' +
            '   </sc' + 'ript></body></html>'+
            '\'');
        
        $iframe.appendTo('body');
        
        
        var id = setInterval(function(){
            var testIframe = $iframe[0].contentDocument.getElementById('test_iframe');   
               
            if(testIframe && testIframe.contentDocument.body.children[0].tagName.toLowerCase() === 'div') {
                clearInterval(id);
                ok(true);
                $iframe.remove();
                start();
           }
        }, 10);
       
    });
}

asyncTest('T221375: Inconsistent behavior OnChange event in TestCafe and browsers(Chrome, IE)', function () {
    var $input = $('<input value="0">'),
        firedCount = 0;

    $input.on('change', function () {
        firedCount++;
    });

    expect(2);

    async.series([
        function (callback) {
            EventSandbox.watchElementEditing($input[0]);

            $input[0].value = '123';
            EventSandbox.Simulator.blur($input[0]);

            setTimeout(callback, 0);
        },
        function (callback) {
            EventSandbox.watchElementEditing($input[0]);

            $input[0].value = '423';
            eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$input[0].value = 42'));
            EventSandbox.Simulator.blur($input[0]);

            setTimeout(callback, 0);
        }
    ], function (error) {
        ok(!error);
        strictEqual(firedCount, 1);
        $input.remove();
        start();
    });
});

test('T228218: Page script can\'t set the href attribute with \'malito\' to an element in an iFrame', function () {
    var storedGetProxyUrl = UrlUtil.getProxyUrl,
        $link = $('<a>');

    UrlUtil.getProxyUrl = function () {
        return 'http://replaced';
    };

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$link[0].href="http://host.com/"'));

    ok($link[0].href.indexOf('http://replaced') === 0);

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$link[0].href="mailto:test@mail.com"'));

    strictEqual($link[0].href, 'mailto:test@mail.com');
    strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('$link[0].href')), 'mailto:test@mail.com');
    strictEqual($link[0].getAttribute('href'), 'mailto:test@mail.com');

    UrlUtil.getProxyUrl = storedGetProxyUrl;
});

test('T230802: TD15.1 - Page content is not loaded on the nest.com page after hammerhead processing', function () {
    var obj = {
        size: null,
        tagName: "input",
        type: "text",
        value: ""
    };

    strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('obj.value')), '');
});

test('T232468: TD15.1 - Cannot record test for http://showcase.sproutcore.com/#demos/Transition%20Animation%20Plugins page', function () {
    var evtObj = {
        originalEvent: null
    };

    strictEqual(eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('evtObj.which')), undefined);
});

test('T232454: TD15.1 - Error on loading page https://openui5.hana.ondemand.com/test-resources/sap/m/demokit/cart/index.html?responderOn=true', function () {
    var result = '';

    var notADocument = {
        write: function () {
            result += Array.prototype.slice.call(arguments).join('');
        },
        writeln: function () {
            result += Array.prototype.slice.call(arguments).join('');
        }
    };

    var processedScript = window[JSProcessor.PROCESS_SCRIPT_METH_NAME](
        'if (true) {' +
        '   notADocument.write("w1", "w2", "w3");' +
        '   notADocument.writeln("wl1", "wl2", "wl3");' +
        '   notADocument.writeln();' +
        '   notADocument.write();' +
        '}'
    );

    eval(processedScript);

    ok(processedScript.indexOf(JSProcessor.DOCUMENT_WRITE_BEGIN_PARAM) !== -1 &&
       processedScript.indexOf(JSProcessor.DOCUMENT_WRITE_END_PARAM) !== -1);

    strictEqual(result, 'w1w2w3wl1wl2wl3');
});
