var IFrameSandbox = HammerheadClient.get('DOMSandbox.IFrame'),
    Hammerhead = HammerheadClient.get('Hammerhead'),
    Util = HammerheadClient.get('Util'),
    $ = Hammerhead.$;

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
    IFrameSandbox.on(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, IFrameSandbox.iframeReadyToInitHandler);
};

QUnit.testDone = function () {
    IFrameSandbox.off(IFrameSandbox.IFRAME_READY_TO_INIT, handler);
};

asyncTest('isCrossDomainWindows method', function () {
    var $crossDomainIframe = $('<iframe id="test1">'),
        $ifrmaeWithEmptySrc = $('<iframe id="test2">'),
        $iframeAboutBlank = $('<iframe id="test3">');

    ok(!Util.isCrossDomainWindows(window, window));

    $ifrmaeWithEmptySrc[0].src = '';
    $ifrmaeWithEmptySrc.appendTo('body');

    ok(!Util.isCrossDomainWindows(window, $ifrmaeWithEmptySrc[0].contentWindow));

    $iframeAboutBlank[0].src = 'about:blank';
    $iframeAboutBlank.appendTo('body');

    ok(!Util.isCrossDomainWindows(window, $iframeAboutBlank[0].contentWindow));

    $crossDomainIframe[0].src = window.getCrossDomainPageUrl('get_message.html');
    $crossDomainIframe.appendTo('body');

    $crossDomainIframe.bind('load', function () {
        ok(Util.isCrossDomainWindows(window, $crossDomainIframe[0].contentWindow));

        $crossDomainIframe.remove();
        $ifrmaeWithEmptySrc.remove();
        $iframeAboutBlank.remove();

        start();
    })
});
