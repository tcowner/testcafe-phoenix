import charsetEncoder from 'iconv-lite';
import Promise from 'promise';
import zlib from 'zlib';
import ERR from './server_errs';

var gzip       = Promise.denodeify(zlib.gzip);
var deflate    = Promise.denodeify(zlib.deflate);
var gunzip     = Promise.denodeify(zlib.gunzip);
var inflate    = Promise.denodeify(zlib.inflate);
var inflateRaw = Promise.denodeify(zlib.inflateRaw);

// Const
const PAGE_MIME_RE    = /(text\/html)|(application\/xhtml\+xml)|(application\/xml)|(application\/x-ms-application)/i;
const CHARSET_RE      = /(?:^|;)\s*charset=(.+)(?:;|$)/i;
const META_CHARSET_RE = /charset ?= ?['"]?([^ ;"']*)['"]?/i;
const JSON_MIME       = 'application/json';
const MANIFEST_MIME   = 'text/cache-manifest';
const CSS_MIME        = 'text/css';

const SCRIPT_MIMES = [
    'application/javascript',
    'text/javascript',
    'application/x-javascript'
];

const CHARSETS = [
    'iso-8859-1', 'iso-8859-2', 'iso-8859-3', 'iso-8859-4',
    'iso-8859-5', 'iso-8859-6', 'iso-8859-7', 'iso-8859-8',
    'iso-8859-9', 'iso-8859-10', 'iso-8859-11', 'iso-8859-12',
    'iso-8859-13', 'iso-8859-14', 'iso-8859-15', 'iso-8859-16',
    'windows-1250', 'windows-1251', 'windows-1252', 'windows-1253',
    'windows-1254', 'windows-1255', 'windows-1256', 'windows-1257',
    'windows-1258', 'windows-874', 'windows-866', 'koi8-r',
    'koi8-u', 'utf-8', 'utf-16', 'utf-32',
    'shift-jis', 'x-euc', 'big5', 'euc-kr'
];

const NORMALIZED_CHARSETS_MAP = CHARSETS.reduce((charsetMap, charset) => {
    charsetMap[getNormalizedCharsetMapKey(charset)] = charset;
    return charsetMap;
}, {});


const DEFAULT_CHARSET = 'iso-8859-1';   // NOTE: HTTP 1.1 specifies ISO-8859-1 as a default charset
                                        // (see: http://www.w3.org/International/O-HTTP-charset.en.php).


// Charset
function getNormalizedCharsetMapKey (charset) {
    return charset.replace(/-/g, '').toLowerCase();
}

function normalizeCharset (charset) {
    var key = charset ? getNormalizedCharsetMapKey(charset) : null;
    return NORMALIZED_CHARSETS_MAP[key] || DEFAULT_CHARSET;
}

export function parseCharset (contentTypeHeader) {
    var charsetMatch = contentTypeHeader && contentTypeHeader.match(CHARSET_RE);
    var charset      = charsetMatch ? charsetMatch[1] : null;
    return normalizeCharset(charset);
}

// NOTE: parsing charset from meta-tags
// www.whatwg.org/specs/web-apps/current-work/multipage/parsing.html#determining-the-character-encoding
// Each <meta> descriptor should contain values of the "http-equiv", "content" and "charset" attributes.
//TODO test it!!!!
export function parseCharsetFromMeta (metas) {
    var needPragma = null;
    var charset    = null;

    metas.forEach((attrs) => {
        var shouldParseFromContentAttr = needPragma !== false &&
                                         atts.content &&
                                         attrs.httpEquiv &&
                                         attrs.httpEquiv.toLowerCase() === 'content-type';

        if (shouldParseFromContentAttr) {
            var charsetMatch = attrs.content.match(META_CHARSET_RE);

            if (charsetMatch) {
                needPragma = true;
                charset    = charsetMatch[1];
            }
        }

        if (attrs.charset) {
            needPragma = false;
            charset    = attrs.charset;
        }
    });

    return normalizeCharset(charset);
}


// Content type
export function isPageMIME (header) {
    return header && PAGE_MIME_RE.test(header);
}

export function isCSSResource (contentTypeHeader, acceptHeader) {
    return contentTypeHeader.indexOf(CSS_MIME) > -1 || acceptHeader === CSS_MIME;
}

export function isScriptResource (contentTypeHeader, acceptHeader) {
    return SCRIPT_MIMES.some((mime) => contentTypeHeader.indexOf(mime) > -1) ||
           SCRIPT_MIMES.indexOf(acceptHeader) > -1;
}

export function isManifest (contentTypeHeader) {
    return contentTypeHeader.indexOf(MANIFEST_MIME) > -1;
}

export function isJSON (contentTypeHeader) {
    return contentTypeHeader.indexOf(JSON_MIME) > -1;
}

// Encoding / decoding

// NOTE: IIS bug has a bug then it sends 'raw deflate' compressed
// data for 'Deflate' Accept-Encoding header.
// (see: http://zoompf.com/2012/02/lose-the-wait-http-compression)
async function inflateWithFallback (data) {
    try {
        return await inflate(data);
    }
    catch (err) {
        if (err.code === 'Z_DATA_ERROR')
            return await inflateRaw(data);

        else
            throw err;
    }
}

export async function decodeContent (content, encoding, charset) {
    if (encoding === 'gzip')
        content = await gunzip(content);

    else if (encoding === 'deflate')
        content = await inflateWithFallback(content);

    return charsetEncoder.decode(content, charset);
}

export async function encodeContent (content, encoding, charset) {
    content = charsetEncoder.encode(content, charset);

    if (encoding === 'gzip')
        return gzip(content);

    if (encoding === 'deflate')
        return deflate(content);

    return content;
}