var Hammerhead = HammerheadClient.get('Hammerhead'),
    IFrameSandbox = HammerheadClient.get('DOMSandbox.IFrame'),
    $ = Hammerhead.$;

var documentReadyCalled = false;

Hammerhead.init();

document.ready = function() {
    documentReadyCalled = true;
};

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

module('Regression');

// At the end of event handlers chain jQuery tries to call method in event target with the same name as event's name.
// So, in our case, it tries to call 'document.ready()' method when 'ready' event is dispatched.
// Tested page may have 'document.ready' method which may not be expected to be called as a handler (expects some args, etc.),
// so such behavior causes JS errors on page. So we disable this behavior for ready event.
// Patched files:
// * hammerhead/client/sandboxed_jquery.js
// * vendor/jquery-1.7.2.js
// * test/qunit/vendor/jquery-1.7.2.js
test('T173577: TD_14_2 Uncaught TypeError: Cannot read property "call" of undefined - ikea.ru', function() {
    ok(!documentReadyCalled);
});

// The function "noConflict" in our jQuery clears the variable window.jQuery, binding undefined for it,
// but the user script checks the existence jQuery via operator "in"
asyncTest('T230756: TD15.1 - _ is not defined on tula.metro-cc.ru', function() {
    expect(1);

    $('<iframe id="test1"/>').load(function() {
        ok(!('jQuery' in this.contentWindow));
        start();
    }).appendTo('body');
});
