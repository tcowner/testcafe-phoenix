var DomSandboxUtil = HammerheadClient.get('DOMSandbox.Util'),
    Hammerhead = HammerheadClient.get('Hammerhead'),
    PageProc = HammerheadClient.get('Shared.PageProc'),
    SandboxUtil = HammerheadClient.get('DOMSandbox.Util'),
    Settings = HammerheadClient.get('Settings'),
    SharedConst = HammerheadClient.get('Shared.Const'),
    IFrameSandbox = HammerheadClient.get('DOMSandbox.IFrame'),
    UrlUtil = HammerheadClient.get('UrlUtil');

var $ = Hammerhead.$,
    JSProcessor = Hammerhead.JSProcessor,
    NativeMethods = Hammerhead.NativeMethods;

Hammerhead.init();

var handler = function (e) {
    if (e.iframe.id.indexOf('test') !== -1) {
        e.iframe.contentWindow.eval.call(e.iframe.contentWindow, [
            'HammerheadClient.define(\'Settings\', function (require, exports) {',
            '    exports.REFERER = "http://localhost/ownerToken!jobUid/https://example.com";',
            '});',
            'HammerheadClient.get(\'Hammerhead\').init();'
        ].join(''));
    }
};

QUnit.testStart = function () {
    // 'window.open' method uses in the QUnit
    window.open = NativeMethods.windowOpen;
    IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);
};


QUnit.testDone = function () {
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
};

test('Process iframe sandbox', function () {
    var iframe = $('<iframe sandbox="allow-forms">')[0];

    PageProc.processElement(iframe);

    equal(NativeMethods.getAttribute.call(iframe, 'sandbox'), 'allow-forms allow-scripts');
    equal(NativeMethods.getAttribute.call(iframe, PageProc.getStoredAttrName('sandbox')), 'allow-forms');
});

test('Process link in iframe', function () {
    var $iframe = $('<iframe id="test1">').appendTo('body'),
        iframeBody = $iframe[0].contentDocument.body,
        $link = $('<a href="/index.html">').appendTo('body');

    // HACK: IE
    if (!iframeBody) {
        $iframe[0].contentDocument.write('<body></body>')
        iframeBody = $iframe[0].contentDocument.body;
    }

    iframeBody.innerHTML = '<a href="/index.html"></a>';

    PageProc.processElement(iframeBody.childNodes[0], UrlUtil.convertToProxyUrl);
    PageProc.processElement($link[0], UrlUtil.convertToProxyUrl);

    equal(UrlUtil.parseProxyUrl(iframeBody.childNodes[0].href).resourceType, 'iframe');
    ok(!UrlUtil.parseProxyUrl($link[0].href).resourceType);

    $iframe.remove();
    $link.remove();
});

test('Process script text', function () {
    var $div = $('<div>').appendTo($('body')),
        script = 'var host = location.host',
        processedScript = PageProc.processScript(script);

    $div[0].innerHTML = '\<script\>' + script + '\</script\>';

    PageProc.processElement($div.find('script')[0]);

    ok(script !== processedScript && $div[0].innerHTML.replace(/\s/g, '') === ('\<script\>' + processedScript + '\</script\>').replace(/\s/g, ''));

    $div.remove();
});

test('Process script: comments', function () {
    var testScript = function (scriptText) {
        var script = NativeMethods.createElement.call(document, 'script');

        script.text = scriptText;
        PageProc.processElement(script);
        NativeMethods.appendChild.call(document.head, script);

        equal(NativeMethods.getAttribute.call(window.commentTest, 'href'), UrlUtil.getProxyUrl('http://google.com'));

        NativeMethods.removeAttribute.call(window.commentTest, 'href');
        document.head.removeChild(script);
    };

    window.commentTest = document.createElement('a');

    testScript('\<!-- Begin comment\n' + 'window.commentTest.href = "http://google.com";\n' + '//End comment -->');
    testScript('\<!-- Begin comment\n' + 'window.commentTest.href = "http://google.com";\n' + ' -->');
});

test('Process attribute value', function () {
    var html =
            '<p class="location test"></p>' +
                '<p data-w="dslkfe"></p>' +
                '<p ' + window.Hammerhead.DOM_SANDBOX_STORED_ATTR_KEY_PREFIX + 'test="location"></p>' +
                '<div id="URL"></div>' +
                '<div attr=""></div>' +
                '<div data-wrap="{simbols: -904, action: data}"></div>' +
                '<span class="Client"></span>' +
                '<span test="sdk"></span>' +
                '<span id="href"></span>' +
                '<div data-src="test"></div>',

        expectedHTML =
            '<p class="location test"></p>' +
                '<p data-w="dslkfe"></p>' +
                '<p ' + window.Hammerhead.DOM_SANDBOX_STORED_ATTR_KEY_PREFIX + 'test="location"></p>' +
                '<div id="URL"></div>' +
                '<div attr=""></div>' +
                '<div data-wrap="{simbols: -904, action: data}"></div>' +
                '<span class="Client"></span>' +
                '<span test="sdk"></span>' +
                '<span id="href"></span>' +
                '<div data-src="test"></div>',

        container = document.createElement('div');

    container.innerHTML = html;

    $(container).find('*').each(function () {
        PageProc.processElement(this);
    });

    strictEqual(container.innerHTML, expectedHTML);
});

test('Process script src', function () {
    var storedJobUid = Settings.JOB_UID,
        storedOwnerToken = Settings.JOB_OWNER_TOKEN;

    Settings.JOB_UID = 'uid';
    Settings.JOB_OWNER_TOKEN = 'token';

    var script = document.createElement('script');

    script.src = 'http://google.com';

    PageProc.processElement(script, UrlUtil.convertToProxyUrl);

    equal(UrlUtil.parseProxyUrl(script.src).resourceType, UrlUtil.SCRIPT);

    Settings.JOB_UID = storedJobUid;
    Settings.JOB_OWNER_TOKEN = storedOwnerToken;
});

test('Precess event attributes', function () {
    var div = NativeMethods.createElement.call(document, 'div'),
        attrValue = 'window.location="test";',
        processedValue = JSProcessor.process(attrValue);

    notEqual(processedValue, attrValue);

    NativeMethods.setAttribute.call(div, 'onclick', attrValue);

    PageProc.processElement(div, function () {
    });

    equal(NativeMethods.getAttribute.call(div, 'onclick'), processedValue);
    equal(NativeMethods.getAttribute.call(div, PageProc.getStoredAttrName('onclick')), attrValue);
});

test('Precess "javascript:" attributes', function () {
    var link = NativeMethods.createElement.call(document, 'a'),
        attrValue = 'javascript:window.location="test";',
        processedValue = 'javascript:' + JSProcessor.process(attrValue.replace('javascript:', ''));

    notEqual(processedValue, attrValue);

    NativeMethods.setAttribute.call(link, 'onclick', attrValue);
    NativeMethods.setAttribute.call(link, 'href', attrValue);

    PageProc.processElement(link, function () {
    });

    equal(NativeMethods.getAttribute.call(link, 'onclick'), processedValue);
    equal(NativeMethods.getAttribute.call(link, 'href'), processedValue);
    equal(NativeMethods.getAttribute.call(link, PageProc.getStoredAttrName('onclick')), attrValue);
    equal(NativeMethods.getAttribute.call(link, PageProc.getStoredAttrName('href')), attrValue);
});

test('Precess anchor with target attribute', function () {
    var anchor = NativeMethods.createElement.call(document, 'a'),
        url = 'http://url.com/',
        proxyUrl = UrlUtil.getProxyUrl(url, null, null, null, null, 'iframe');

    NativeMethods.setAttribute.call(anchor, 'href', url);
    NativeMethods.setAttribute.call(anchor, 'target', 'iframeName');

    PageProc.processElement(anchor, function (url, resourceType) {
        return UrlUtil.getProxyUrl(url, null, null, null, null, resourceType);
    });

    equal(NativeMethods.getAttribute.call(anchor, 'href'), proxyUrl);
    equal(NativeMethods.getAttribute.call(anchor, PageProc.getStoredAttrName('href')), url);
});

test('Precess autocomplete attr', function () {
    var input1 = NativeMethods.createElement.call(document, 'input'),
        input2 = NativeMethods.createElement.call(document, 'input'),
        input3 = NativeMethods.createElement.call(document, 'input'),
        input4 = NativeMethods.createElement.call(document, 'input');

    NativeMethods.setAttribute.call(input1, 'autocomplete', 'on');
    NativeMethods.setAttribute.call(input2, 'autocomplete', 'off');
    NativeMethods.setAttribute.call(input3, 'autocomplete', '');

    PageProc.processElement(input1);
    PageProc.processElement(input2);
    PageProc.processElement(input3);
    PageProc.processElement(input4);

    var storedAutocompleteAttr = PageProc.getStoredAttrName('autocomplete');

    strictEqual(NativeMethods.getAttribute.call(input1, 'autocomplete'), 'off');
    strictEqual(NativeMethods.getAttribute.call(input1, storedAutocompleteAttr), 'on');

    strictEqual(NativeMethods.getAttribute.call(input2, 'autocomplete'), 'off');
    strictEqual(NativeMethods.getAttribute.call(input2, storedAutocompleteAttr), 'off');

    strictEqual(NativeMethods.getAttribute.call(input3, 'autocomplete'), 'off');
    strictEqual(NativeMethods.getAttribute.call(input3, storedAutocompleteAttr), '');

    strictEqual(NativeMethods.getAttribute.call(input4, 'autocomplete'), 'off');
    strictEqual(NativeMethods.getAttribute.call(input4, storedAutocompleteAttr), 'none');
});

module('Cross-domain');

test('Cross-domain src', function () {
    var url = "http://cross.domain.com/",
        proxyUrl = UrlUtil.getProxyUrl(url, location.hostname, 1336, null, null, 'iframe'),
        storedCrossDomainPort = Settings.CROSS_DOMAIN_PROXY_PORT;

    Settings.CROSS_DOMAIN_PROXY_PORT = 1336;

    var processed = DomSandboxUtil.processHtml('<iframe src="' + url + '"></iframe>');

    ok(processed.indexOf('src="' + proxyUrl) !== -1);
    ok(processed.indexOf('src' + Hammerhead.DOM_SANDBOX_STORED_ATTR_POSTFIX + '="' + url + '"') !== -1);

    Settings.CROSS_DOMAIN_PROXY_PORT = storedCrossDomainPort;
});

module('Stylesheet processing');

test('Process stylesheet', function () {
    var urlReplacer = function () {
            return 'replaced';
        },
        check = function (css, expected) {
            equal(PageProc.processStylesheet(css, urlReplacer), expected);
        };

    check('a:hover {}', 'a[' + Hammerhead.TEST_CAFE_HOVER_PSEUDO_CLASS_ATTR + '] {}');
    check('div { background-image: url(""); }', 'div { background-image: url(""); }');
    check('div { background-image: url(\'\'); }', 'div { background-image: url(\'\'); }');
    check('div { background-image: url(); }', 'div { background-image: url(); }');
    check('div { background-image: url("/image.png"); }', 'div { background-image: url("replaced"); }');
    check('div { background-image: url(\'/image.png\'); }', 'div { background-image: url(\'replaced\'); }');
    check('div { background-image: url(/image.png); }', 'div { background-image: url(replaced); }');
    check('@import "/image.png"', '@import "replaced"');
    check('@import \'/image.png\'', '@import \'replaced\'');
    check('@import ""', '@import ""');
    check('@import \'\'', '@import \'\'');
});

test('Clean up stylesheet', function () {
    var url = 'http://google.com/image.png',
        proxyUrl = UrlUtil.getProxyUrl(url),
        check = function (css, expected) {
            equal(PageProc.cleanUpStylesheet(css, UrlUtil.parseProxyUrl, UrlUtil.formatUrl), expected);
        };

    check('a[' + Hammerhead.TEST_CAFE_HOVER_PSEUDO_CLASS_ATTR + '] {}', 'a:hover {}');
    check('div { background-image: url(""); }', 'div { background-image: url(""); }');
    check('div { background-image: url(\'\'); }', 'div { background-image: url(\'\'); }');
    check('div { background-image: url(); }', 'div { background-image: url(); }');
    check('div { background-image: url("' + proxyUrl + '"); }', 'div { background-image: url("' + url + '"); }');
    check('div { background-image: url(\'' + proxyUrl + '\'); }', 'div { background-image: url(\'' + url + '\'); }');
    check('div { background-image: url(' + proxyUrl + '); }', 'div { background-image: url(' + url + '); }');
    check('@import "' + proxyUrl + '"', '@import "' + url + '"');
    check('@import \'' + proxyUrl + '\'', '@import \'' + url + '\'');
    check('@import ""', '@import ""');
    check('@import \'\'', '@import \'\'');
});

test('Process stylesheet after innerHTML', function() {
    var div = $('<div/>').appendTo('body')[0],
        style = $('<style/>')[0],
        check = function(cssText) {
            strictEqual(cssText.indexOf(SharedConst.IS_STYLESHEET_PROCESSED_RULE), 0);
            strictEqual(cssText.indexOf(SharedConst.IS_STYLESHEET_PROCESSED_RULE, 1), -1);
            strictEqual(cssText.replace(/^[\s\S]+url\(([\s\S]+)\)[\s\S]+$/, '$1'), UrlUtil.getProxyUrl('http://test.ru'));
        };

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('div.innerHTML = "<style>.rule { background: url(http://test.ru) }</style>";'));

    check(div.children[0].innerHTML);

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('div.innerHTML = div.innerHTML;'));

    check(div.children[0].innerHTML);

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('style.innerHTML = ".rule { background: url(http://test.ru) }";'));

    check(style.innerHTML);

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('style.innerHTML = style.innerHTML;'));

    check(style.innerHTML);
});

module('Regression');

test('T135513 - Html code like as <iframe src="javascript:\'<html>....</html>\'"> not processed (http://www.tripadvisor.com/).', function () {
    var iframe = NativeMethods.createElement.call(document, 'iframe'),
        src = 'javascript:"<html><body><a id=\'test\' data-attr=\"123\">link</a></body></html>"';

    NativeMethods.setAttribute.call(iframe, 'src', src);

    PageProc.processElement(iframe, function(url){ return url; });

    var srcAttr = NativeMethods.getAttribute.call(iframe, 'src'),
        storedSrcAttr = NativeMethods.getAttribute.call(iframe, 'src' + Hammerhead.DOM_SANDBOX_STORED_ATTR_POSTFIX );

    notEqual(srcAttr, src);
    equal(srcAttr, 'javascript:\'' + SandboxUtil.processHtml('<html><body><a id=\'test\' data-attr="123">link</a></body></html>') + '\'');
    equal(storedSrcAttr, src);
});

module('Regression tests');

asyncTest('T216999 - TestCafe playback - act.click doesn\'t work in an iframe', function() {
    expect(1);

    $('<iframe src="/data/page_processor/iframe.html">').appendTo('body').load(function() {
        var iframe = this,
            link = NativeMethods.getElementById.call(iframe.contentDocument, 'link');

        strictEqual(NativeMethods.getAttribute.call(link, PageProc.getStoredAttrName('href')), '/index.html');

        this.parentNode.removeChild(iframe);
        start();
    });
});
