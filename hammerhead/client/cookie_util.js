HammerheadClient.define('CookieUtil', function (require, exports) {
    var $ = require('jQuery');

    //NOTE: The name/key cannot be empty but the value can
    var COOKIE_PAIR_REGEX = /^([^=;]+)\s*=\s*(("?)[^\n\r\0]*\3)/,
        TRAILING_SEMICOLON_REGEX = /;+$/;


    //Exports
    //-------------------------------------------------------------------------------------
    exports.parse = function (str) {
        str = $.trim(str);

        var trailingSemicolonCheck = TRAILING_SEMICOLON_REGEX.exec(str);

        if (trailingSemicolonCheck)
            str = str.slice(0, trailingSemicolonCheck.index);

        var firstSemicolonIdx = str.indexOf(';'),
            keyValueString = firstSemicolonIdx > -1 ? str.substr(0, firstSemicolonIdx) : str,
            keyValueParsingResult = COOKIE_PAIR_REGEX.exec(keyValueString);

        if (!keyValueParsingResult)
            return null;

        var parsedCookie = {
            key: keyValueParsingResult[1],
            value: keyValueParsingResult[2]
        };

        parsedCookie.key = $.trim(parsedCookie.key);
        parsedCookie.value = $.trim(parsedCookie.value);

        if (firstSemicolonIdx === -1)
            return parsedCookie;

        var attributesString = $.trim(str.slice(firstSemicolonIdx).replace(/^\s*;\s*/, ''));

        if (attributesString.length === 0)
            return parsedCookie;

        var attrValStrings = attributesString.split(/\s*;\s*/);

        while (attrValStrings.length) {
            var attrValueStr = attrValStrings.shift();

            var separatorIdx = attrValueStr.indexOf('='),
                key = null,
                value = null;

            if (separatorIdx === -1)
                key = attrValueStr;
            else {
                key = attrValueStr.substr(0, separatorIdx);
                value = $.trim(attrValueStr.substr(separatorIdx + 1));
            }

            key = $.trim(key.toLowerCase());

            switch (key) {
                case 'expires':
                case 'max-age':
                case 'path':
                    parsedCookie[key] = value;
                    break;

                case 'secure':
                case 'httponly':
                    parsedCookie[key] = true;
                    break;

                case 'domain':
                    //NOTE: remove leading '.'
                    parsedCookie.domain = $.trim(value.replace(/^\./, ''));
                    break;

                default:
                    break;
            }
        }

        return parsedCookie;
    };

    exports.format = function (parsedCookie) {
        var cookieStr = parsedCookie.key;

        if (parsedCookie.value !== null)
            cookieStr += '=' + parsedCookie.value;

        cookieStr += ';';

        for (var attrName in parsedCookie) {
            if (parsedCookie.hasOwnProperty(attrName)) {
                if (attrName !== 'key' && attrName !== 'value') {
                    cookieStr += attrName;

                    //NOTE: skip attrs without value and boolean attrs (e.g. Secure)
                    if (typeof parsedCookie[attrName] !== 'undefined' && parsedCookie[attrName] !== true)
                        cookieStr += '=' + parsedCookie[attrName];

                    cookieStr += ';';
                }
            }
        }

        return cookieStr;
    };

    exports.get = function (document, name) {
        var cookies = document.cookie.split(';');

        for (var i = 0; i < cookies.length; i++) {
            var cookie = $.trim(cookies[i]);

            if (cookie.indexOf(name + '=') === 0 || cookie === name)
                return cookie;
        }

        return null;
    };

    exports['delete'] = function (document, name) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    };
});