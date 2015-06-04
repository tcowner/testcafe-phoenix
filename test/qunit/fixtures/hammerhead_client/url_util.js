var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    UrlUtil = HammerheadClient.get('UrlUtil'),
    SharedErrors = HammerheadClient.get('Shared.Errors'),
    Settings = HammerheadClient.get('Settings');

var PROXY_PORT = 1337,
    PROXY_HOSTNAME = '127.0.0.1',
    PROXY_HOST = PROXY_HOSTNAME + ':' + PROXY_PORT;


test('getCrossDomainProxyUrl method', function () {
    var storedCrossDomainport = Settings.CROSS_DOMAIN_PROXY_PORT;

    Settings.CROSS_DOMAIN_PROXY_PORT = 5555;

    strictEqual(UrlUtil.getCrossDomainProxyUrl(), 'http://' + location.hostname + ':5555/');

    Settings.CROSS_DOMAIN_PROXY_PORT = storedCrossDomainport;
});

test('sameOriginCheck method', function () {
    ok(UrlUtil.sameOriginCheck('http://proxy/token!uid/http://origin.com:111/index.html', 'http://origin.com:111/index.php'));
    ok(UrlUtil.sameOriginCheck('http://proxy/token!uid/http://origin.com:111/index.html', 'http://sub.origin.com:111/index.php'));
    ok(UrlUtil.sameOriginCheck('http://proxy/token!uid/http://origin.com:111/index.html', 'http://sub1.sub2.origin.com:111/index.php'));
    ok(UrlUtil.sameOriginCheck('http://proxy/token!uid/http://sub.origin.com:111/index.html', 'http://origin.com:111/index.php'));
    ok(UrlUtil.sameOriginCheck('http://proxy/token!uid/http://sub.origin.com:111/index.html', 'http://proxy/index.php'));
    ok(UrlUtil.sameOriginCheck('http://proxy/token!uid/http://www.origin.com/index.html', 'http://origin.com/'));
    ok(!UrlUtil.sameOriginCheck('http://proxy/token!uid/http://origin.com:111/index.html', 'http://origin.com/index.php'));
    ok(!UrlUtil.sameOriginCheck('http://proxy/token!uid/http://sub.origin.com:111/index.html', 'http://location:111/index.php'));
    ok(!UrlUtil.sameOriginCheck('http://proxy/token!uid/http://sub.origin.com:111/index.html', 'https://location/index.php'));
    ok(!UrlUtil.sameOriginCheck('http://proxy/token!uid/http://origin.com:111/index.html', 'http://origin.com:222/index.php'));
    ok(!UrlUtil.sameOriginCheck('http://proxy/token!uid/http://origin.com:111/index.html', 'https://origin.com:111/index.php'));
    ok(!UrlUtil.sameOriginCheck('http://proxy/token!uid/http://origin.com:111/index.html', 'http://origin2.com:111/index.php'));
});

test('resolveUrl', function () {
    equal(UrlUtil.resolveUrl('//domain.com/index.php'), 'https://domain.com/index.php');
    equal(UrlUtil.resolveUrl('//dom\n\tain.com/index.php'), 'https://domain.com/index.php');
    equal(UrlUtil.resolveUrl(location), location.toString());
});

test('resolveUrlAsOrigin', function () {
    equal(UrlUtil.resolveUrlAsOrigin('/index.html#hash'), 'https://example.com/index.html#hash');
    equal(UrlUtil.resolveUrlAsOrigin('javascript:0;'), 'javascript:0;');
    equal(UrlUtil.resolveUrlAsOrigin('/index.html?param=value#hash'), 'https://example.com/index.html?param=value#hash');
    equal(UrlUtil.resolveUrlAsOrigin('https://twitter.com/index.html?param=value#hash'), 'https://twitter.com/index.html?param=value#hash');
    equal(UrlUtil.resolveUrlAsOrigin('//twitter.com/index.html?param=value#hash'), 'https://twitter.com/index.html?param=value#hash');
    equal(UrlUtil.resolveUrlAsOrigin('http://g.tbcdn.cn/??kissy/k/1.4.2/seed-min.js'), 'http://g.tbcdn.cn/??kissy/k/1.4.2/seed-min.js');
});

test('Parse url with newline characters', function () {
    var url = 'http://exa\nmple.com/?par\n=val',
        parsingResult = UrlUtil.parseUrl(url);

    strictEqual(parsingResult.hostname, 'example.com');
    strictEqual(parsingResult.partAfterHost, '/?par=val');
});

test('Parse url with tabulation characters', function () {
    var url = 'http://exa\tmple.com/?par\t=val',
        parsingResult = UrlUtil.parseUrl(url);

    strictEqual(parsingResult.hostname, 'example.com');
    strictEqual(parsingResult.partAfterHost, '/?par=val');
});

test('Parse url with hash after host', function () {
    var url = '//test.example.com#42',
        parsingResult = UrlUtil.parseUrl(url);

    ok(!parsingResult.protocol);
    strictEqual(parsingResult.hostname, 'test.example.com');
    strictEqual(parsingResult.partAfterHost, '#42');

});

module('Get proxy url');

test('Origin with query, path, hash and host', function () {
    var originUrl = 'http://test.example.com/pa/th/Page?param1=value&param2=&param3#testHash',
        proxyUrl = UrlUtil.getProxyUrl(originUrl, PROXY_HOSTNAME, PROXY_PORT, 'MyUID', 'ownerToken');

    strictEqual(proxyUrl, 'http://' + PROXY_HOST + '/ownerToken!MyUID/' + originUrl);
});

test('Origin with host only', function () {
    var originUrl = 'http://test.example.com/',
        proxyUrl = UrlUtil.getProxyUrl(originUrl, PROXY_HOSTNAME, PROXY_PORT, 'MyUID', 'ownerToken');

    strictEqual(proxyUrl, 'http://' + PROXY_HOST + '/ownerToken!MyUID/' + originUrl);
});

test('Origin with https protocol', function () {
    var originUrl = 'https://test.example.com:53/',
        proxyUrl = UrlUtil.getProxyUrl(originUrl, PROXY_HOSTNAME, PROXY_PORT, 'MyUID', 'ownerToken');

    strictEqual(proxyUrl, 'http://' + PROXY_HOST + '/ownerToken!MyUID/' + originUrl);
});

test('Origin with non http or https protocol', function () {
    expect(2);

    var originUrl = 'someProtocol://test.example.com:53/';

    try {
        UrlUtil.getProxyUrl(originUrl, PROXY_HOSTNAME, PROXY_PORT)
    } catch (err) {
        strictEqual(err.code, SharedErrors.URL_UTIL_PROTOCOL_IS_NOT_SUPPORTED);
        strictEqual(err.originUrl.toLowerCase(), originUrl.toLowerCase());
    }
});

test('Relative path', function () {
    var originUrl = '/Image1.jpg',
        proxyUrl = UrlUtil.getProxyUrl(originUrl);

    strictEqual(proxyUrl, 'http://' + location.host + '/ownerToken!jobUid/https://example.com/Image1.jpg');

    var relativeUrl = 'share?id=1kjQMWh7IcHdTBbTv6otRvCGYr-p02q206M7aR7dmog0',
        parsedUrl = UrlUtil.parseUrl(relativeUrl);

    ok(!parsedUrl.hostname);
    ok(!parsedUrl.host);
    ok(!parsedUrl.hash);
    ok(!parsedUrl.port);
    ok(!parsedUrl.protocol);
    strictEqual(parsedUrl.partAfterHost, 'share?id=1kjQMWh7IcHdTBbTv6otRvCGYr-p02q206M7aR7dmog0');
});

test('Url contains successive question marks in query', function () {
    expect(1);

    var originUrl = 'http://test.example.com/??dirs/???files/',
        proxyUrl = UrlUtil.getProxyUrl(originUrl, '127.0.0.1', PROXY_PORT, 'MyUID', 'ownerToken');

    strictEqual(proxyUrl, 'http://' + PROXY_HOST + '/ownerToken!MyUID/' + originUrl);
});

test('Origin with port', function () {
    var originUrl = 'http://test.example.com:53/',
        proxyUrl = UrlUtil.getProxyUrl(originUrl, PROXY_HOSTNAME, PROXY_PORT, 'MyUID', 'ownerToken');

    strictEqual(proxyUrl, 'http://' + PROXY_HOST + '/ownerToken!MyUID/' + originUrl);
});

test('Url with value undefined or null', function () {
    var a = document.createElement('a'),
        proxyUrl = UrlUtil.getProxyUrl(null, PROXY_HOSTNAME, PROXY_PORT, 'MyUID', 'ownerToken');

    a.href = null;

    equal(proxyUrl, UrlUtil.getProxyUrl(a.href, PROXY_HOSTNAME, PROXY_PORT, 'MyUID', 'ownerToken'), 'null');

    proxyUrl = UrlUtil.getProxyUrl(undefined, PROXY_HOSTNAME, PROXY_PORT, 'MyUID', 'ownerToken');

    a.href = undefined;

    equal(proxyUrl, UrlUtil.getProxyUrl(a.href, PROXY_HOSTNAME, PROXY_PORT, 'MyUID', 'ownerToken'), 'undefined');
});

module('Parse proxy url');

test('Parse http URL', function () {
    var proxyUrl = 'http://' + PROXY_HOST + '/ownerToken!MyUID/http://test.example.com:53/PA/TH/?#testHash',
        parsingResult = UrlUtil.parseProxyUrl(proxyUrl);

    strictEqual(parsingResult.originUrl, 'http://test.example.com:53/PA/TH/?#testHash');
    strictEqual(parsingResult.originResourceInfo.protocol, 'http:');
    strictEqual(parsingResult.originResourceInfo.host, 'test.example.com:53');
    strictEqual(parsingResult.originResourceInfo.hostname, 'test.example.com');
    strictEqual(parsingResult.originResourceInfo.port, '53');
    strictEqual(parsingResult.originResourceInfo.partAfterHost, '/PA/TH/?#testHash');
    strictEqual(parsingResult.jobInfo.uid, 'MyUID');
    strictEqual(parsingResult.jobInfo.ownerToken, 'ownerToken');
});

test('Parse https URL', function () {
    var proxyUrl = 'http://' + PROXY_HOST + '/ownerToken!MyUID/https://test.example.com:53/PA/TH/?#testHash',
        parsingResult = UrlUtil.parseProxyUrl(proxyUrl);

    strictEqual(parsingResult.originUrl, 'https://test.example.com:53/PA/TH/?#testHash');
    strictEqual(parsingResult.originResourceInfo.protocol, 'https:');
    strictEqual(parsingResult.originResourceInfo.host, 'test.example.com:53');
    strictEqual(parsingResult.originResourceInfo.hostname, 'test.example.com');
    strictEqual(parsingResult.originResourceInfo.port, '53');
    strictEqual(parsingResult.originResourceInfo.partAfterHost, '/PA/TH/?#testHash');
    strictEqual(parsingResult.jobInfo.uid, 'MyUID');
    strictEqual(parsingResult.jobInfo.ownerToken, 'ownerToken');
});

test('Parse non-proxy URL', function () {
    var proxyUrl = 'http://' + PROXY_HOST + '/PA/TH/?someParam=value',
        originUrlInfo = UrlUtil.parseProxyUrl(proxyUrl);

    ok(!originUrlInfo);
});

test('Parse URL with successive question marks', function () {
    var proxyUrl = 'http://' + PROXY_HOST + '/ownerToken!MyUID/http://test.example.com:53??dirs/???files/&#testHash',
        parsingResult = UrlUtil.parseProxyUrl(proxyUrl);

    strictEqual(parsingResult.originUrl, 'http://test.example.com:53??dirs/???files/&#testHash');
    strictEqual(parsingResult.originResourceInfo.protocol, 'http:');
    strictEqual(parsingResult.originResourceInfo.host, 'test.example.com:53');
    strictEqual(parsingResult.originResourceInfo.hostname, 'test.example.com');
    strictEqual(parsingResult.originResourceInfo.port, '53');
    strictEqual(parsingResult.originResourceInfo.partAfterHost, '??dirs/???files/&#testHash');
    strictEqual(parsingResult.jobInfo.uid, 'MyUID');
    strictEqual(parsingResult.jobInfo.ownerToken, 'ownerToken');
});

test('Single question mark', function () {
    var url = 'http://ac-gb.marketgid.com/p/j/2865/11?',
        proxyUtrl = UrlUtil.getProxyUrl(url, 'hostname', 1111, 'MyUID', 'ownerToken');

    equal(url, UrlUtil.formatUrl(UrlUtil.parseProxyUrl(proxyUtrl).originResourceInfo));
});

test('Health monitor - question mark disappears', function () {
    var url = 'http://google.ru:345/path?',
        parsedUrl = UrlUtil.parseUrl(url);

    strictEqual(parsedUrl.partAfterHost, '/path?');
    strictEqual(UrlUtil.formatUrl(parsedUrl), url);

    url = 'http://yandex.ru:234/path';
    parsedUrl = UrlUtil.parseUrl(url);

    strictEqual(parsedUrl.partAfterHost, '/path');
    strictEqual(UrlUtil.formatUrl(parsedUrl), url);
});

module('Change proxy url');

test('Change origin URL part', function () {
    var proxyUrl = 'http://localhost:1337/ownerToken!MyUID/http://test.example.com:53/#testHash';

    var changed = UrlUtil.changeOriginUrlPart(proxyUrl, 'port', '34');
    strictEqual(changed, 'http://localhost:1337/ownerToken!MyUID/http://test.example.com:34/#testHash');

    changed = UrlUtil.changeOriginUrlPart(proxyUrl, 'host', 'newhost');
    strictEqual(changed, 'http://localhost:1337/ownerToken!MyUID/http://newhost:53/#testHash');

    changed = UrlUtil.changeOriginUrlPart(proxyUrl, 'hostname', 'newhostname');
    strictEqual(changed, 'http://localhost:1337/ownerToken!MyUID/http://newhostname:53/#testHash');

    changed = UrlUtil.changeOriginUrlPart(proxyUrl, 'protocol', 'https:');
    strictEqual(changed, 'http://localhost:1337/ownerToken!MyUID/https://test.example.com:53/#testHash');

    changed = UrlUtil.changeOriginUrlPart(proxyUrl, 'pathname', 'test1.html');
    strictEqual(changed, 'http://localhost:1337/ownerToken!MyUID/http://test.example.com:53/test1.html#testHash');

    changed = UrlUtil.changeOriginUrlPart(proxyUrl, 'hash', 'newHash');
    strictEqual(changed, 'http://localhost:1337/ownerToken!MyUID/http://test.example.com:53/#newHash');

    changed = UrlUtil.changeOriginUrlPart(proxyUrl, 'search', '?hl=ru&tab=wn');
    strictEqual(changed, 'http://localhost:1337/ownerToken!MyUID/http://test.example.com:53/?hl=ru&tab=wn#testHash');
});

module('Regression tests');

test('T106172 - Health monitor - cross-domain errors', function () {
    ok(UrlUtil.sameOriginCheck('http://www.example.com', 'http://money.example.com'));
});

test('Health monitor - remove unnecessary slashes form the begin of the url', function () {
    var proxy = UrlUtil.getProxyUrl('/////example.com', 'localhost', '5555', 'u', 't');

    strictEqual(proxy, 'http://localhost:5555/t!u/https://example.com/');
});
