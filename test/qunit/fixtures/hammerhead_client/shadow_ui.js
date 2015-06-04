var Hammerhead = HammerheadClient.get('Hammerhead'),
    IFrameSandbox = HammerheadClient.get('DOMSandbox.IFrame'),
    Settings = HammerheadClient.get('Settings'),
    SharedConst = HammerheadClient.get('Shared.Const'),

    $ = Hammerhead.$,
    JSProcessor = Hammerhead.JSProcessor,
    NativeMethods = Hammerhead.NativeMethods,
    ShadowUI = Hammerhead.ShadowUI,
    Util = Hammerhead.Util;

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
    $('#testDiv').empty();
    ShadowUI.getRoot().empty();
    $('.test-class').remove();
    IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);
};

QUnit.testDone = function () {
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
};

test('Add UI class and get UI element with selector', function () {
    var $uiElem = $('<div>').attr('id', 'uiElem');

    ShadowUI.addClass($uiElem, 'ui-elem-class');
    $('#testDiv').append($uiElem);
    $uiElem = ShadowUI.select('div.ui-elem-class');

    strictEqual($uiElem.attr('id'), 'uiElem');
    
    $uiElem.remove();
});

if(window.MutationObserver) {
    asyncTest('Shadow MutationObserver', function () {
        var $uiEl = $('<div>'),
            el = NativeMethods.createElement.call(document, 'div');

        ShadowUI.addClass($uiEl, 'ui-elem-class');
        NativeMethods.insertBefore.call(document.body, $uiEl[0], document.body.children[0]);

        var observer = new window.MutationObserver(function(mutations) {
            equal(mutations.length, 1);
            equal(mutations[0].addedNodes[0], el);
            observer.disconnect();
            $uiEl.remove();
            $(el).remove();
            start();
        });

        observer.observe(document.body, { childList: true });

        NativeMethods.appendChild.call(document.body, $uiEl[0]);
        NativeMethods.appendChild.call(document.body, el);
    });
}

test('Get root', function () {
    var $root = ShadowUI.getRoot();

    $root.attr('id', 'uiRoot');
    strictEqual($root.length, 1);

    strictEqual(ShadowUI.select('#uiRoot').length, 1);
    
    $root.remove();
});

module('childNodes, children getter');

test('body.childNodes', function () {
    var root = ShadowUI.getRoot()[0];

    var found = false,
        childNodes = document.body.childNodes,
        childNodesLength = eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('childNodes.length'));

    equal(childNodesLength, childNodes.length - 1);

    for (var i = 0; i < childNodesLength; i++) {
        if (childNodes[i] === root)
            found = true;
    }

    ok(!found);
});

test('body.children', function () {
    var $root = ShadowUI.getRoot();

    var found = false,
        children = document.body.children,
        childrenLength = eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('children.length'));

    equal(childrenLength, children.length - 1);

    for (var i = 0; i < childrenLength; i++) {
        if (children[i] === $root[0])
            found = true;
    }

    ok(!found);
});

test('head.children', function () {
    var shadowUIElementsCount = 0;

    for (var i = 0; i < document.head.children.length; i++)
        shadowUIElementsCount += Util.isShadowUIElement(document.head.children[i]) ? 1 : 0;

    var found = false,
        $link1 = $('<link>').attr({
            rel: "stylesheet",
            href: "/test.css",
            type: "text/css",
            class: SharedConst.TEST_CAFE_UI_STYLESHEET_FULL_CLASSNAME
        }).prependTo('head'),
        $link2 = $('<link>').attr({
            rel: "stylesheet",
            href: "/test.css",
            type: "text/css",
            class: SharedConst.TEST_CAFE_UI_STYLESHEET_FULL_CLASSNAME
        }).prependTo('head');

    var children = document.head.children,
        childrenLength = eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('children.length'));

    equal(childrenLength, children.length - 2 - shadowUIElementsCount);

    for (var i = 0; i < childrenLength; i++) {
        if (children[i] === $link1[0] || children[i] === $link2[0])
            found = true;
    }

    $link1.remove();
    $link2.remove();

    ok(!found, 'check that document.head.children does not return TestCafe elements');
});

test('head.childNodes', function () {
    var shadowUIElementsCount = 0;

    for (var i = 0; i < document.head.childNodes.length; i++)
        shadowUIElementsCount += Util.isShadowUIElement(document.head.childNodes[i]) ? 1 : 0;

    var found = false,
        $link1 = $('<link>').attr({
            rel: "stylesheet",
            href: "/test.css",
            type: "text/css",
            class: SharedConst.TEST_CAFE_UI_STYLESHEET_FULL_CLASSNAME
        }).prependTo('head'),
        $link2 = $('<link>').attr({
            rel: "stylesheet",
            href: "/test.css",
            type: "text/css",
            class: SharedConst.TEST_CAFE_UI_STYLESHEET_FULL_CLASSNAME
        }).prependTo('head');

    var childNodes = document.head.childNodes,
        childNodesLength = eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('childNodes.length'));

    equal(childNodesLength, childNodes.length - 2 - shadowUIElementsCount);

    for (var i = 0; i < childNodesLength; i++) {
        if (childNodes[i] === $link1[0] || childNodes[i] === $link2[0])
            found = true;
    }

    $link1.remove();
    $link2.remove();

    ok(!found, 'check that document.head.childNodes does not return TestCafe elements');
});

test('detect collection', function () {
    var $el = $('<div>').prependTo('body'),
        collection = $('body *');

    equal(collection[0], $el[0]);
    ok(!ShadowUI.isShadowContainerCollection(collection));
});

test('HTMLCollection.item, HTMLCollection.namedItem methods emulation', function () {
    var $input = $('<input name="testInput">').appendTo('body'),
        children = NativeMethods.elementGetElementsByTagName.call(document.body, '*'),
        wrappedChildren = document.body.getElementsByTagName('*');

    equal(wrappedChildren.length, children.length - 1);
    equal(wrappedChildren.item(0), children[0]);
    equal(wrappedChildren.item(-1), null);
    equal(wrappedChildren.item(10000), null);
    equal(wrappedChildren.namedItem('testInput'), $input[0]);

    $input.remove();
});

module('Element methods');

var testElem = document.documentElement.childNodes[0];

if (testElem.getElementsByClassName) {
    test('body.getElementsByClassName', function () {
        var $root = ShadowUI.getRoot();

        var $uiElem = $('<div>').attr('id', 'uiChild').addClass('test-class').appendTo($root),
            $pageElem = $('<div>').attr('id', 'pageElem').addClass('test-class').appendTo(document.body);

        var elems = document.body.getElementsByClassName('test-class');

        strictEqual(elems.length, 1);
        strictEqual(elems[0].id, 'pageElem');
    });
}

if (testElem.getElementsByTagName) {
    test('body.getElementsByTagName', function () {
        var $root = ShadowUI.getRoot();

        var $uiElem = $('<textarea>').attr('id', 'uiChild').addClass('test-class').appendTo($root),
            $pageElem = $('<textarea>').attr('id', 'pageElem').addClass('test-class').appendTo(document.body);

        var elems = document.body.getElementsByTagName('TEXTAREA');

        strictEqual(elems.length, 1);
        strictEqual(elems[0].id, 'pageElem');
    });

    test('head.getElementsByTagName', function () {
        var found = false,
            $link = $('<link>').attr({
                rel: "stylesheet",
                href: "/test.css",
                type: "text/css",
                class: SharedConst.TEST_CAFE_UI_STYLESHEET_FULL_CLASSNAME
            }).appendTo('head'),

            children = document.head.getElementsByTagName('link');

        for (var i = 0; i < children.length; i++) {
            if (children[i] === $link[0])
                found = true;
        }

        $link.remove();
        ok(!found, 'check that document.head.getElementsByTagName does not return TestCafe elements');
    });
}

if (testElem.querySelector) {
    test('body.querySelector', function () {
        var $root = ShadowUI.getRoot();

        var $uiElem = $('<div>').attr('id', 'uiChild').addClass('test-class cl1').appendTo($root),
            $pageElem = $('<div>').attr('id', 'pageElem').addClass('test-class cl2').appendTo(document.body);

        var uiElem = document.body.querySelector('.cl1'),
            pageElem = document.body.querySelector('.cl2');

        ok(!uiElem);
        strictEqual(pageElem.id, 'pageElem');
    });
}

if (testElem.querySelectorAll) {
    test('body.querySelectorAll', function () {
        var $root = ShadowUI.getRoot();

        $('<div>').attr('id', 'uiChild').addClass('test-class').appendTo($root);
        $('<div>').attr('id', 'pageElem').addClass('test-class').appendTo(document.body);

        var elems = document.body.querySelectorAll('.test-class');

        strictEqual(elems.length, 1);
        strictEqual(elems[0].id, 'pageElem');
    });
}

module('Document methods');

test('document.getElementById', function () {
    var $testDiv = $('#testDiv'),
        $uiRoot = $('<div>').appendTo($testDiv);

    $('<div>').attr('id', 'uiChild').appendTo($uiRoot);
    $('<div>').attr('id', 'pageElem').appendTo($testDiv);

    ShadowUI.addClass($uiRoot, 'root');

    var uiElem = document.getElementById('uiChild'),
        pageElem = document.getElementById('pageElem');

    ok(!uiElem);
    strictEqual(pageElem.id, 'pageElem');
});

test('document.getElementsByName', function () {
    var $testDiv = $('#testDiv'),
        $uiRoot = $('<div>').appendTo($testDiv);

    $('<input>').attr('id', 'uiChild').attr('name', 'test-name').appendTo($uiRoot);
    $('<input>').attr('id', 'pageElem').attr('name', 'test-name').appendTo($testDiv);

    ShadowUI.addClass($uiRoot, 'root');

    var elems = document.getElementsByName('test-name');

    strictEqual(elems.length, 1);
    strictEqual(elems[0].id, 'pageElem');
});

test('document.getElementsByTagName', function () {
    var $testDiv = $('#testDiv'),
        $uiRoot = $('<div>').appendTo($testDiv);

    $('<div>').attr('id', 'uiChild').appendTo($uiRoot);
    $('<div>').attr('id', 'pageElem').appendTo($testDiv);

    ShadowUI.addClass($uiRoot, 'root');

    var elems = document.getElementsByTagName('DIV');

    $.each(elems, function () {
        notEqual(this.id, 'uiChild');
    });
});

if (document.getElementsByClassName) {
    test('document.getElementsByClassName', function () {
        var $testDiv = $('#testDiv'),
            $uiRoot = $('<div>').appendTo($testDiv);

        $('<div>').attr('id', 'uiChild').addClass('test-class').appendTo($uiRoot);
        $('<div>').attr('id', 'pageElem').addClass('test-class').appendTo($testDiv);

        ShadowUI.addClass($uiRoot, 'root');

        var elems = document.getElementsByClassName('test-class');

        strictEqual(elems.length, 1);
        strictEqual(elems[0].id, 'pageElem');
    });
}

if (document.querySelector) {
    test('document.querySelector', function () {
        var $testDiv = $('#testDiv'),
            $uiRoot = $('<div>').appendTo($testDiv);

        $('<div>').attr('id', 'uiChild').addClass('ui-class').appendTo($uiRoot);
        $('<div>').attr('id', 'pageElem').addClass('page-class').appendTo($testDiv);

        ShadowUI.addClass($uiRoot, 'root');

        var uiElem = document.querySelector('.ui-class'),
            pageElem = document.querySelector('.page-class');

        ok(!uiElem);
        strictEqual(pageElem.id, 'pageElem');
    });
}

if (document.querySelectorAll) {
    test('document.querySelectorAll', function () {
        var $testDiv = $('#testDiv'),
            $uiRoot = $('<div>').appendTo($testDiv);

        $('<div>').attr('id', 'uiChild').addClass('test-class').appendTo($uiRoot);
        $('<div>').attr('id', 'pageElem').addClass('test-class').appendTo($testDiv);

        ShadowUI.addClass($uiRoot, 'root');

        var elems = document.querySelectorAll('.test-class');

        strictEqual(elems.length, 1);
        strictEqual(elems[0].id, 'pageElem');
    });
}

module('Regression');
test('T239689 - TD 15.1 - TestCafe recorder toolbar is not top most for images popup (http://moscow.auto.ru)', function() {
       var $root = ShadowUI.getRoot(),
           bodyChildrenCount = document.body.children.length;
       
       equal(document.body.children[bodyChildrenCount - 1], $root[0]);
       
       var $newElement = $('<div>'); 
       
       document.body.appendChild($newElement[0]);
       
       equal(document.body.children.length, bodyChildrenCount + 1);
       equal(document.body.children[bodyChildrenCount - 1], $newElement[0]);
       equal(document.body.children[bodyChildrenCount], $root[0]);  
       
       $newElement.remove();
});

test('T195358 - CSS selector is working too slow from jquery 1.9', function () {
    var doc = {},
        nativeMethRegEx = /^[^{]+\{\s*\[native \w/;

    ShadowUI.init(null, doc);

    ok(nativeMethRegEx.test(doc.getElementsByClassName));
    ok(nativeMethRegEx.test(doc.querySelectorAll));
});

asyncTest('T212476: Cross-domain error in Hammerhead when an array contains cross-domain iframes', function () {
    var storedCrossDomainPort = Settings.CROSS_DOMAIN_PROXY_PORT;

    Settings.CROSS_DOMAIN_PROXY_PORT = 1336;

    var $crossDomainIframe = $('<iframe src="' + window.getCrossDomainPageUrl('get_message.html') +'">').appendTo('body');

    $crossDomainIframe.load(function(){
        ok(!ShadowUI.isShadowContainerCollection([this.contentWindow]));
        
        $crossDomainIframe.remove();
        Settings.CROSS_DOMAIN_PROXY_PORT = storedCrossDomainPort;
        start();
    });
});

asyncTest('T225944: 15.1 Testing - Recorder: JavaScriptExecutor can not be initialized (http://brumm.github.io/react-flexbox-playground/)', function () {
    var $iframe = $('<iframe id="test001">');

    $iframe.load(function(){
        var $root = this.contentWindow.Hammerhead.ShadowUI.getRoot();

        equal($root.parent().parent().parent()[0], this.contentDocument);

        this.contentDocument.body.innerHTMl = '';

        $root = this.contentWindow.Hammerhead.ShadowUI.getRoot();

        equal($root.parent().parent().parent()[0], this.contentDocument);

        $iframe.remove();
        start();
    });

    $iframe.appendTo('body');
});



