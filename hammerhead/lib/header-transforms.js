'use strict';

var _Object$keys = require('babel-runtime/core-js/object/keys').default;

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default').default;

var _interopRequireWildcard = require('babel-runtime/helpers/interop-require-wildcard').default;

exports.__esModule = true;

var _requestTransforms;

exports.forRequest = forRequest;
exports.forResponse = forResponse;

var _url = require('url');

var _sharedConst = require('../shared/const');

var _sharedConst2 = _interopRequireDefault(_sharedConst);

var _url_util = require('./url_util');

var urlUtils = _interopRequireWildcard(_url_util);

// Skipping transform
function skip() {
    return void 0;
}

// Request headers
var requestTransforms = (_requestTransforms = {}, _requestTransforms['host'] = function (src, ctx) {
    return ctx.dest.host;
}, _requestTransforms['referer'] = function (src, ctx) {
    return ctx.dest.referer || void 0;
}, _requestTransforms['origin'] = function (src, ctx) {
    return ctx.dest.reqOrigin || src;
}, _requestTransforms['content-length'] = function (src, ctx) {
    return ctx.reqBody.length;
}, _requestTransforms['cookie'] = skip, _requestTransforms[_sharedConst2.default.XHR_REQUEST_MARKER_HEADER] = skip, _requestTransforms);

var requestForced = {
    'cookie': function (src, ctx, server) {
        return server.cookieShelf.getCookieHeader(ctx.jobInfo, ctx.dest.url) || void 0;
    },

    // NOTE: all browsers except Chrome doesn't send 'Origin'-header
    // in case of same domain XHR requests. So, if the destination request
    // is actually cross-domain we need to force 'Origin'-header to support CORS. (see: B234325)
    'origin': function (src, ctx) {
        var force = ctx.isXhr && !src && ctx.dest.domain !== ctx.dest.reqOrigin;
        return force ? ctx.dest.reqOrigin : src;
    }
};

// Response headers
var responseTransforms = {
    'set-cookie': function (src, ctx, server) {
        if (src) {
            var cookies = Array.isArray(src) ? src : [src];

            cookies = cookies.filter(function (cookieStr) {
                return !!cookieStr;
            });
            server.cookieShelf.setCookieByServer(ctx.jobInfo, ctx.dest.url, cookies);
        }

        // NOTE: delete header
        return void 0;
    },

    // NOTE: disable Content Security Policy (see http://en.wikipedia.org/wiki/Content_Security_Policy)
    'content-security-policy': skip,
    'content-security-policy-report-only': skip,
    'x-content-security-policy': skip,
    'x-content-security-policy-report-only': skip,
    'x-webkit-csp': skip,

    // NOTE: we perform CORS checks on our side, so we skip related headers
    'access-control-allow-origin': skip,

    // NOTE: change transform type if we have iFrame with image as src,
    // because it was transformed to the HTML with the image tag
    'content-type': function (src, ctx) {
        return ctx.contentInfo.isIFrameWithImageSrc ? 'text/html' : src;
    },
    'content-length': function (src, ctx) {
        return ctx.contentInfo.requireProcessing ? ctx.destResBody.length : src;
    },

    'location': function (src, ctx, server) {
        // NOTE: RFC 1945 standard requires location URL to be absolute.
        // However, most popular browsers will accept a relative URL.
        // We transform relative URLs to absolute to correctly handle this situation.

        var _parseUrl = (0, _url.parse)(src);

        var host = _parseUrl.host;

        if (!host) src = (0, _url.resolve)(ctx.dest.url, src);

        var isCrossDomain = ctx.contentInfo.isIFrame && !urlUtils.sameOriginCheck(ctx.dest.url, src);

        if (isCrossDomain) {
            return urlUtils.getCrossDomainIframeProxyUrl(src, server.hostname, server.crossDomainProxyPort, ctx.jobInfo.uid, ctx.jobInfo.ownerToken);
        }

        return server.getProxyUrl(src, ctx.jobInfo.uid, ctx.jobInfo.ownerToken, ctx.contentInfo.contentTypeUrlToken);
    }
};

// Transformation routine
function transformHeaders(srcHeaders, ctx, server, transforms, forced) {
    var destHeaders = {};

    var applyTransform = function (headerName, srcHeaders, transforms) {
        var src = srcHeaders[headerName];
        var transform = transforms[headerName];
        var dest = transform ? transform(src, ctx, server) : src;

        if (dest !== void 0) destHeaders[headerName] = dest;
    };

    _Object$keys(srcHeaders).forEach(function (headerName) {
        return applyTransform(headerName, srcHeaders, transforms);
    });

    if (forced) _Object$keys(forced).forEach(function (headerName) {
        return applyTransform(headerName, destHeaders, forced);
    });

    return destHeaders;
}

// API

function forRequest(ctx, server) {
    return transformHeaders(ctx.req.headers, ctx, server, requestTransforms, requestForced);
}

function forResponse(ctx, server) {
    return transformHeaders(ctx.destRes.headers, ctx, server, responseTransforms);
}
//# sourceMappingURL=header-transforms.js.map