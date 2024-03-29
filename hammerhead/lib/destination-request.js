'use strict';

var _inherits = require('babel-runtime/helpers/inherits').default;

var _createClass = require('babel-runtime/helpers/create-class').default;

var _classCallCheck = require('babel-runtime/helpers/class-call-check').default;

var _regeneratorRuntime = require('babel-runtime/regenerator').default;

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default').default;

var _interopRequireWildcard = require('babel-runtime/helpers/interop-require-wildcard').default;

exports.__esModule = true;

var _domain = require('domain');

var _domain2 = _interopRequireDefault(_domain);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _os = require('os');

var _events = require('events');

var _webauth = require('webauth');

var _windowsDomain = require('./windows-domain');

var _requestAgent = require('./request-agent');

var requestAgent = _interopRequireWildcard(_requestAgent);

var _server_errs = require('./server_errs');

var _server_errs2 = _interopRequireDefault(_server_errs);

var IS_WINDOWS = /^win/.test((0, _os.platform)());

// HACK: Ignore SSL auth. rejectUnauthorized https.request
// option doesn't work(see:  https://github.com/mikeal/request/issues/418)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ECONNRESET error handlers
var connectionResetHandler = _domain2.default.create();

connectionResetHandler.on('error', function (err) {
    if (err.code !== 'ECONNRESET') {
        connectionResetHandler.removeAllListeners('error');
        throw new Error(err);
    }
});

// Utils
function isDNSErr(err) {
    return err.message && err.message.indexOf('ENOTFOUND') > -1;
}

// DestinationRequest

var DestinationRequest = (function (_EventEmitter) {
    function DestinationRequest(opts) {
        _classCallCheck(this, DestinationRequest);

        _EventEmitter.call(this);

        this.req = null;
        this.hasResponse = false;
        this.opts = opts;
        this.isHttps = opts.protocol === 'https:';
        this.protocolInterface = this.isHttps ? _https2.default : _http2.default;

        // NOTE: ignore SSL auth
        if (this.isHttps) opts.rejectUnauthorized = false;

        requestAgent.assign(this.opts);
        this._send();
    }

    _inherits(DestinationRequest, _EventEmitter);

    DestinationRequest.prototype._send = function _send() {
        var _this = this;

        connectionResetHandler.run(function () {
            _this.req = _this.protocolInterface.request(_this.opts);

            _this.req.on('response', function (res) {
                return _this._onResponse(res);
            });
            _this.req.on('error', function (err) {
                return _this._onError(err);
            });
            _this.req.setTimeout(DestinationRequest.TIMEOUT, function () {
                return _this._onTimeout();
            });

            _this.req.write(_this.opts.body);
            _this.req.end();
        });
    };

    DestinationRequest.prototype._onResponse = function _onResponse(res) {
        this.hasResponse = true;

        if (res.statusCode === 401) this._sendWithCredentials(res);else this.emit('response', res);
    };

    DestinationRequest.prototype._sendWithCredentials = function _sendWithCredentials(res) {
        return _regeneratorRuntime.async(function _sendWithCredentials$(context$2$0) {
            var _this2 = this;

            while (1) switch (context$2$0.prev = context$2$0.next) {
                case 0:
                    if (!this.opts.credentials) {
                        context$2$0.next = 5;
                        break;
                    }

                    if (!IS_WINDOWS) {
                        context$2$0.next = 4;
                        break;
                    }

                    context$2$0.next = 4;
                    return (0, _windowsDomain.assign)(this.opts.credentials);

                case 4:

                    //TODO !!!
                    (0, _webauth.auth)(this.opts, this.opts.credentials, [this.opts.body], function (res) {
                        _this2.emit('response', res);
                    }, this.isHttps, res);

                case 5:
                case 'end':
                    return context$2$0.stop();
            }
        }, null, this);
    };

    DestinationRequest.prototype._onTimeout = function _onTimeout() {
        // NOTE: this handler is called if we get error
        // response(for example, 404). So, we should check
        // for the response presence before raising error.
        if (!this.hasResponse) {
            this.req.abort();

            this.emit('fatalError', {
                code: _server_errs2.default.PROXY_ORIGIN_SERVER_REQUEST_TIMEOUT,
                destUrl: this.opts.url
            });
        }
    };

    DestinationRequest.prototype._onError = function _onError(err) {
        if (requestAgent.shouldRegressHttps(err, this.opts)) {
            requestAgent.regressHttps(this.opts);
            this._send();
        } else if (isDNSErr(err)) {
            this.emit('fatalError', {
                code: _server_errs2.default.PROXY_CANT_RESOLVE_ORIGIN_URL,
                destUrl: this.opts.url
            });
        } else this.emit('error');
    };

    _createClass(DestinationRequest, null, [{
        key: 'TIMEOUT',
        value: 25 * 1000,
        enumerable: true
    }]);

    return DestinationRequest;
})(_events.EventEmitter);

exports.default = DestinationRequest;
module.exports = exports.default;
//# sourceMappingURL=destination-request.js.map