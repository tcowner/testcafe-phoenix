import domain from 'domain';
import http from 'http';
import https from 'https';
import { platform } from 'os';
import { EventEmitter } from 'events';
import { auth as requestWithAuth } from 'webauth';
import { assign as assignWindowsDomain } from './windows-domain';
import * as requestAgent from './request-agent';
import ERR from './server_errs';

const IS_WINDOWS = /^win/.test(platform());

// HACK: Ignore SSL auth. rejectUnauthorized https.request
// option doesn't work(see:  https://github.com/mikeal/request/issues/418)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ECONNRESET error handlers
var connectionResetHandler = domain.create();

connectionResetHandler.on('error', (err) => {
    if (err.code !== 'ECONNRESET') {
        connectionResetHandler.removeAllListeners('error');
        throw new Error(err);
    }
});

// Utils
function isDNSErr (err) {
    return err.message && err.message.indexOf('ENOTFOUND') > -1;
}

// DestinationRequest
export default class DestinationRequest extends EventEmitter {
    static TIMEOUT = 25 * 1000;

    constructor (opts) {
        super();

        this.req               = null;
        this.hasResponse       = false;
        this.opts              = opts;
        this.isHttps           = opts.protocol === 'https:';
        this.protocolInterface = this.isHttps ? https : http;

        // NOTE: ignore SSL auth
        if (this.isHttps)
            opts.rejectUnauthorized = false;

        requestAgent.assign(this.opts);
        this._send();
    }

    _send () {
        connectionResetHandler.run(() => {
            this.req = this.protocolInterface.request(this.opts);

            this.req.on('response', (res) => this._onResponse(res));
            this.req.on('error', (err) => this._onError(err));
            this.req.setTimeout(DestinationRequest.TIMEOUT, () => this._onTimeout());

            this.req.write(this.opts.body);
            this.req.end();
        });
    }

    _onResponse (res) {
        this.hasResponse = true;

        if (res.statusCode === 401)
            this._sendWithCredentials(res);

        else
            this.emit('response', res);
    }

    async _sendWithCredentials (res) {
        if (this.opts.credentials) {
            if (IS_WINDOWS)
                await assignWindowsDomain(this.opts.credentials);

            //TODO !!!
            requestWithAuth(this.opts, this.opts.credentials, [this.opts.body], (res) => {
                this.emit('response', res);
            }, this.isHttps, res);
        }
    }

    _onTimeout () {
        // NOTE: this handler is called if we get error
        // response(for example, 404). So, we should check
        // for the response presence before raising error.
        if (!this.hasResponse) {
            this.req.abort();

            this.emit('fatalError', {
                code:    ERR.PROXY_ORIGIN_SERVER_REQUEST_TIMEOUT,
                destUrl: this.opts.url
            });
        }
    }

    _onError (err) {
        if (requestAgent.shouldRegressHttps(err, this.opts)) {
            requestAgent.regressHttps(this.opts);
            this._send();
        }

        else if (isDNSErr(err)) {
            this.emit('fatalError', {
                code:    ERR.PROXY_CANT_RESOLVE_ORIGIN_URL,
                destUrl: this.opts.url
            });
        }
        else
            this.emit('error');
    }
}

