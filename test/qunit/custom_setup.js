(function () {
    /*TestCafeClient.define('Settings', function (require, exports) {
        exports.REFERER = 'https://example.com';
    });

    */HammerheadClient.define('Settings', function (require, exports) {
        exports.JOB_OWNER_TOKEN = 'ownerToken';
        exports.JOB_UID = 'jobUid';
    });

    var UrlUtil = HammerheadClient.get('UrlUtil');

    UrlUtil.OriginLocation.get = function () {
        return 'https://example.com';
    };
})();