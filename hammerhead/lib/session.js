'use strict';

var _classCallCheck = require('babel-runtime/helpers/class-call-check').default;

var _regeneratorRuntime = require('babel-runtime/regenerator').default;

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default').default;

exports.__esModule = true;

var _sharedService_msg_cmd = require('./../shared/service_msg_cmd');

var _sharedService_msg_cmd2 = _interopRequireDefault(_sharedService_msg_cmd);

var _cookies = require('./cookies');

var _cookies2 = _interopRequireDefault(_cookies);

var _url_util = require('./url_util');

var _taskScript = require('./task-script');

// Global instance counter used to generate ID's
var instanceCount = 0;

// Session

var Session = (function () {
    function Session() {
        _classCallCheck(this, Session);

        this.id = ++instanceCount;
        this.cookies = new _cookies2.default();
        this.proxy = null;
    }

    Session.prototype.handleServiceMessage = function handleServiceMessage(msg) {
        return _regeneratorRuntime.async(function handleServiceMessage$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
                case 0:
                    if (!this[msg.cmd]) {
                        context$2$0.next = 6;
                        break;
                    }

                    context$2$0.next = 3;
                    return this[msg.cmd](msg);

                case 3:
                    return context$2$0.abrupt('return', context$2$0.sent);

                case 6:
                    throw new Error('Malformed service message or message handler is not implemented');

                case 7:
                case 'end':
                    return context$2$0.stop();
            }
        }, null, this);
    };

    Session.prototype.getTaskScript = function getTaskScript(referer, serverInfo, isIFrame, withPayload) {
        var cookies = this.cookies.getClientString(refererDestInfo.originUrl);
        var payloadScript = '';

        if (withPayload) payloadScript = isIFrame ? this._getIFramePayloadScript() : this._getPayloadScript();

        return (0, _taskScript.render)({
            cookie: cookies.replace(/'/g, '\\\''),
            jobUid: this.id,
            jobOwnerToken: '',
            //TODO don't use it as param
            serviceMsgUrl: '/messaging',
            ie9FileReaderShimUrl: '/ie9-file-reader-shim',
            //TODO rename to crossDomainPort
            crossDomainPort: serverInfo.crossDomainPort,
            // TODO rename from taskScript
            payloadScript: payloadScript,
            referer: referer
        });
    };

    Session.prototype._getIFramePayloadScript = function _getIFramePayloadScript() {
        throw new Error('Not implemented');
    };

    Session.prototype._getPayloadScript = function _getPayloadScript() {
        throw new Error('Not implemented');
    };

    return Session;
})();

exports.default = Session;

// Service message handlers
var ServiceMessages = Isolate.prototype;

ServiceMessages[_sharedService_msg_cmd2.default.SET_COOKIE] = function (msg) {
    var parsedUrl = (0, _url_util.parseProxyUrl)(msg.url);
    var cookieUrl = parsedUrl ? parsedUrl.dest.url : msg.url;

    this.cookies.setByClient(originUrl, msg.cookie);

    return this.cookies.getClientString(cookieUrl);
};

ServiceMessages[_sharedService_msg_cmd2.default.GET_IFRAME_TASK_SCRIPT] = function (msg, serverInfo) {
    var referer = msg.referer || '';

    return this.getTaskScript(referer, serverInfo, true, false);
};
module.exports = exports.default;
//# sourceMappingURL=session.js.map