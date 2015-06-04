var Hammerhead = HammerheadClient.get('Hammerhead'),
    SharedConst = HammerheadClient.get('Shared.Const'),
    UrlUtil = HammerheadClient.get('UrlUtil'),

    $ = Hammerhead.$,
    Util = Hammerhead.Util;

test('isDomElement', function () {
    ok(Util.isDomElement(document.body));
    ok(Util.isDomElement(document.createElement('span')));
    ok(Util.isDomElement(document.createElement('strong')));
    ok(Util.isDomElement(document.createElement('a')));
    ok(!Util.isDomElement(null));

     //T184805
    for(var p = Element.prototype; !!p;){
        ok(!Util.isDomElement(p));
        p = Object.getPrototypeOf(p);
    }
});

asyncTest('isDomElement for iframe Element.prototype chain', function(){
    $('<iframe src>').bind('load',function () {
        for(var p = this.contentWindow.Element.prototype; !!p;){
            ok(!Util.isDomElement(p));
            p = Object.getPrototypeOf(p);
        }

        $(this).remove();
        start();
    }).appendTo('body');
});

asyncTest('getTopSameDomainWindow', function () {
    var $iframe = $('<iframe>');

    $iframe.load(function() {
        equal(Util.getTopSameDomainWindow(window.top), window.top);
        equal(Util.getTopSameDomainWindow(this.contentWindow), window.top);

        $iframe.remove();
        start();
    });

    $iframe.appendTo('body');
});

test('isWindowInstance', function () {
    ok(Util.isWindowInstance(window));
    ok(!Util.isWindowInstance({top: ''}));
});

test('isNodeList', function () {
    ok(Util.isNodeList(document.body.childNodes));
});

test('isHTMLCollection', function () {
    ok(Util.isHTMLCollection(document.body.children));
});

module('isIframeWithoutSrc');

//NOTE: we've commented the following test because we don't process the following scenario now. When we will meet this case
//in a real site we will process it
/*asyncTest('isIframeWithoutSrc: changed location 1', function () {
    var handler = function () {
        $(this).unbind('load', handler);
        $(this).bind('load', function () {
            this[SharedConst.DOM_SANDBOX_PROCESSED_CONTEXT] = window;
            ok(UrlUtil.isIframeWithoutSrc(this));
            ok(!Util.isCrossDomainIframe(this));
            $(this).remove();

            start();
        });
        this.contentWindow.location = 'about:blank';
    };

    $('<iframe src="http://' + location.host + '/">').bind('load', handler).appendTo('body')[0];
});*/

asyncTest('isIframeWithoutSrc: changed location 2', function () {
    var handler = function () {
        $(this).unbind('load', handler);
        $(this).bind('load', function () {
            this[SharedConst.DOM_SANDBOX_PROCESSED_CONTEXT] = window;
            ok(!UrlUtil.isIframeWithoutSrc(this));
            ok(!Util.isCrossDomainIframe(this));
            $(this).remove();

            start();
        });
        this.contentWindow.location = 'http://' + location.host + '/';
    };

    $('<iframe src="about:blank">').bind('load', handler).appendTo('body')[0];
});

asyncTest('isIframeWithoutSrc: crossdomain src', function () {
    $('<iframe src="http://' + location.hostname + ':1336/simple_page.html">').bind('load',function () {
        this[SharedConst.DOM_SANDBOX_PROCESSED_CONTEXT] = window;
        ok(!UrlUtil.isIframeWithoutSrc(this));
        ok(Util.isCrossDomainIframe(this));
        $(this).remove();

        start();
    }).appendTo('body');
});

asyncTest('isIframeWithoutSrc: samedomain src', function () {
    $('<iframe src="http://' + location.host + '/">').bind('load',function () {
        this[SharedConst.DOM_SANDBOX_PROCESSED_CONTEXT] = window;
        ok(!UrlUtil.isIframeWithoutSrc(this));
        ok(!Util.isCrossDomainIframe(this));
        $(this).remove();

        start();
    }).appendTo('body');
});

asyncTest('isIframeWithoutSrc: without src attribute', function () {
    $('<iframe>').bind('load',function () {
        this[SharedConst.DOM_SANDBOX_PROCESSED_CONTEXT] = window;
        ok(UrlUtil.isIframeWithoutSrc(this));
        ok(!Util.isCrossDomainIframe(this));
        $(this).remove();
        start();
    }).appendTo('body');
});

asyncTest('isIframeWithoutSrc: about:blank', function () {
    $('<iframe src="about:blank">').bind('load',function () {
        this[SharedConst.DOM_SANDBOX_PROCESSED_CONTEXT] = window;
        ok(UrlUtil.isIframeWithoutSrc(this));
        ok(!Util.isCrossDomainIframe(this));
        $(this).remove();
        start();
    }).appendTo('body');
});

module('isCrossDomainIFrame');

asyncTest('isCrossDomainIFrame: location is changed to cross-domain', function () {
    var iteration = 0;
    expect(4);
    $('<iframe src="http://' + location.host + '/">').bind('load',function () {
        if (!iteration) {
            ok(!Util.isCrossDomainIframe(this));
            ok(!Util.isCrossDomainIframe(this, true));

            this.contentDocument.location.href = 'http://' + location.hostname + ':1336/simple_page.html';
            iteration++;
        }
        else {
            ok(Util.isCrossDomainIframe(this));
            ok(!Util.isCrossDomainIframe(this, true));
            $(this).remove();
            start();
        }
    }).appendTo('body');
});

asyncTest('isIframeWithoutSrc: empty src attribute', function () {
    $('<iframe src>').bind('load',function () {
        this[SharedConst.DOM_SANDBOX_PROCESSED_CONTEXT] = window;
        ok(UrlUtil.isIframeWithoutSrc(this));
        ok(!Util.isCrossDomainIframe(this));
        $(this).remove();
        start();
    }).appendTo('body');
});
