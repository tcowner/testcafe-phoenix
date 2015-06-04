import serviceCmd from './../shared/service_msg_cmd';
import Cookies from './cookies';
import { parseProxyUrl } from './url_util';
import { render as renderTaskScript } from './task-script';

// Global instance counter used to generate ID's
var instanceCount = 0;


// Session
export default class Session {
    constructor () {
        this.id      = ++instanceCount;
        this.cookies = new Cookies();
        this.proxy   = null;
    }

    async handleServiceMessage (msg) {
        if (this[msg.cmd])
            return await this[msg.cmd](msg);

        else
            throw new Error('Malformed service message or message handler is not implemented');
    }

    getTaskScript (referer, serverInfo, isIFrame, withPayload) {
        var cookies       = this.cookies.getClientString(refererDestInfo.originUrl);
        var payloadScript = '';

        if (withPayload)
            payloadScript = isIFrame ? this._getIFramePayloadScript() : this._getPayloadScript();

        return renderTaskScript({
            cookie:               cookies.replace(/'/g, "\\'"),
            jobUid:               this.id,
            jobOwnerToken:        '',
            //TODO don't use it as param
            serviceMsgUrl:        '/messaging',
            ie9FileReaderShimUrl: '/ie9-file-reader-shim',
            //TODO rename to crossDomainPort
            crossDomainPort:      serverInfo.crossDomainPort,
            // TODO rename from taskScript
            payloadScript:        payloadScript,
            referer:              referer
        });
    }

    _getIFramePayloadScript () {
        throw new Error('Not implemented');
    }


    _getPayloadScript () {
        throw new Error('Not implemented');
    }
}


// Service message handlers
var ServiceMessages = Isolate.prototype;

ServiceMessages[serviceCmd.SET_COOKIE] = function (msg) {
    var parsedUrl = parseProxyUrl(msg.url);
    var cookieUrl = parsedUrl ? parsedUrl.dest.url : msg.url;

    this.cookies.setByClient(originUrl, msg.cookie);

    return this.cookies.getClientString(cookieUrl);
};

ServiceMessages[serviceCmd.GET_IFRAME_TASK_SCRIPT] = function (msg, serverInfo) {
    var referer = msg.referer || '';

    return this.getTaskScript(referer, serverInfo, true, false);
};



