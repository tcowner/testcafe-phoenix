import { parse as parseUrl, resolve as resolveUrl } from 'url';
import SHARED_CONST from '../shared/const';
import * as urlUtils from './url_util';

// Skipping transform
function skip () {
    return void 0;
}


// Request headers
var requestTransforms = {
    'host':           (src, ctx) => ctx.dest.host,
    'referer':        (src, ctx) => ctx.dest.referer || void 0,
    'origin':         (src, ctx) => ctx.dest.reqOrigin || src,
    'content-length': (src, ctx) => ctx.reqBody.length,
    'cookie':         skip,

    [SHARED_CONST.XHR_REQUEST_MARKER_HEADER]: skip
};

var requestForced = {
    'cookie': (src, ctx, server) => server.cookieShelf.getCookieHeader(ctx.jobInfo, ctx.dest.url) || void 0,

    // NOTE: all browsers except Chrome doesn't send 'Origin'-header
    // in case of same domain XHR requests. So, if the destination request
    // is actually cross-domain we need to force 'Origin'-header to support CORS. (see: B234325)
    'origin': (src, ctx) => {
        var force = ctx.isXhr && !src && ctx.dest.domain !== ctx.dest.reqOrigin;
        return force ? ctx.dest.reqOrigin : src;
    }
};


// Response headers
var responseTransforms = {
    'set-cookie': (src, ctx, server) => {
        if (src) {
            var cookies = Array.isArray(src) ? src : [src];

            cookies = cookies.filter((cookieStr) => !!cookieStr);
            server.cookieShelf.setCookieByServer(ctx.jobInfo, ctx.dest.url, cookies);
        }

        // NOTE: delete header
        return void 0;
    },

    // NOTE: disable Content Security Policy (see http://en.wikipedia.org/wiki/Content_Security_Policy)
    'content-security-policy':               skip,
    'content-security-policy-report-only':   skip,
    'x-content-security-policy':             skip,
    'x-content-security-policy-report-only': skip,
    'x-webkit-csp':                          skip,

    // NOTE: we perform CORS checks on our side, so we skip related headers
    'access-control-allow-origin': skip,

    // NOTE: change transform type if we have iFrame with image as src,
    // because it was transformed to the HTML with the image tag
    'content-type':   (src, ctx) => ctx.contentInfo.isIFrameWithImageSrc ? 'text/html' : src,
    'content-length': (src, ctx) => ctx.contentInfo.requireProcessing ? ctx.destResBody.length : src,

    'location': (src, ctx, server) => {
        // NOTE: RFC 1945 standard requires location URL to be absolute.
        // However, most popular browsers will accept a relative URL.
        // We transform relative URLs to absolute to correctly handle this situation.
        var { host } = parseUrl(src);

        if (!host)
            src = resolveUrl(ctx.dest.url, src);

        var isCrossDomain = ctx.contentInfo.isIFrame && !urlUtils.sameOriginCheck(ctx.dest.url, src);

        if (isCrossDomain) {
            return urlUtils.getCrossDomainIframeProxyUrl(src, server.hostname, server.crossDomainProxyPort,
                ctx.jobInfo.uid, ctx.jobInfo.ownerToken);
        }

        return server.getProxyUrl(src, ctx.jobInfo.uid, ctx.jobInfo.ownerToken, ctx.contentInfo.contentTypeUrlToken);
    }
};


// Transformation routine
function transformHeaders (srcHeaders, ctx, server, transforms, forced) {
    var destHeaders = {};

    var applyTransform = function (headerName, srcHeaders, transforms) {
        var src       = srcHeaders[headerName];
        var transform = transforms[headerName];
        var dest      = transform ? transform(src, ctx, server) : src;

        if (dest !== void 0)
            destHeaders[headerName] = dest;
    };

    Object.keys(srcHeaders).forEach((headerName) => applyTransform(headerName, srcHeaders, transforms));

    if (forced)
        Object.keys(forced).forEach((headerName) => applyTransform(headerName, destHeaders, forced));

    return destHeaders;
}

// API
export function forRequest (ctx, server) {
    return transformHeaders(ctx.req.headers, ctx, server, requestTransforms, requestForced);
}

export function forResponse (ctx, server) {
    return transformHeaders(ctx.destRes.headers, ctx, server, responseTransforms);
}