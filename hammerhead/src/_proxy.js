import http from 'http';
import path from 'path';
import fs from 'fs';
import URL from 'url';
import urlUtils from '../shared/url_util';
import { respond404, respond500, respondWithJSON, fetchBody } from './http-utils';
import { getFileInfo } from './form_data';
import Router from './router';
import PipelineContext from './pipeline-context';


// Const
const CLIENT_SCRIPT_FILE_PATH = path.join(__dirname, '../../_compiled_/hammerhead_client/hammerhead.js');
const CLIENT_SCRIPT           = fs.readFileSync(CLIENT_SCRIPT_FILE_PATH).toString();


// Static
function parseServiceMsg (body) {
    body = body.toString();

    try {
        return JSON.parse(body);
    }
    catch (err) {
        return null;
    }
}


// Proxy
export default class Proxy extends Router {
    constructor (hostname, port1, port2) {
        super();

        this.openSessions = {};

        var server1Info = {
            hostname:        hostname,
            port:            port1,
            crossDomainPort: port2
        };

        var server2Info = {
            hostname:        hostname,
            port:            port2,
            crossDomainPort: port1
        };

        this.server1 = http.createServer((req, res) => this._onRequest(req, res, server1Info));
        this.server2 = http.createServer((req, res) => this._onRequest(req, res, server2Info));

        this.server1.listen(port1);
        this.server2.listen(port2);
        this._registerServiceRoutes();
    }

    _registerServiceRoutes () {
        this.GET('/hammerhead.js', {
            contentType: 'application/x-javascript',
            content:     CLIENT_SCRIPT
        });

        this.POST('/messaging', (req, res) => this._onServiceMessage(req, res, serverInfo));
        this.POST('/ie9-file-reader-shim', (req, res) => this._ie9FileReaderShim(req, res));
        this.GET('/task.js', (req, res, serverInfo) => this._onTaskScriptRequest(req, res, serverInfo, false));
        this.GET('/iframe-task.js', (req, res, serverInfo) => this._onTaskScriptRequest(req, res, serverInfo, true))
    }


    async _onServiceMessage (req, res) {
        var body    = await fetchBody(req);
        var msg     = parseServiceMsg(body);
        var session = msg && this.openSession[msg.jobUid];

        if (session) {
            try {
                var result = await session.handleServiceMessage(msg, serverInfo);
                respondWithJSON(res, result);
            }
            catch (err) {
                respond500(res, err);
            }

        }
        else
            respond500(res);
    }

    // TODO move to formData (rename it to upload BTW)
    async _ie9FileReaderShim (req, res) {
        var body              = await fetchBody(req);
        var parsedUrl         = URL.parse(req.url);
        var contentTypeHeader = req.headers['content-type'];
        var inputName         = parsedUrl.query['input-name'];
        var filename          = parsedUrl.query['filename'];
        var info              = getFileInfo(contentTypeHeader, body, inputName, filename);

        // NOTE: we should skip content type, because IE9 can't
        // handle content with content-type "application/json"
        // and trying to download it as a file
        respondWithJSON(res, info, true);
    }

    _onTaskScriptRequest (req, res, serverInfo, isIFrame) {
        var referer         = req.headers['referer'];
        var refererDestInfo = referer && urlUtil.parseProxyUrl(referer);
        var session         = refererDestInfo && this.openSessions[refererDestInfo.jobInfo.uid];

        if (session) {
            res.setHeader('content-type', 'application/x-javascript');
            res.setHeader('cache-control', 'no-cache, no-store, must-revalidate');
            res.setHeader('pragma', 'no-cache');
            //TODO last param is withPayload
            res.end(session.getTaskScript(referer, serverInfo, isIFrame, true));
        }
        else
            respond500(res);
    }

    _onRequest (req, res, serverInfo) {
        //NOTE: skip browsers favicon requests which we can't process
        if (req.url === '/favicon.ico')
            respond404(res);

        else if (!this._route(req, res, serverInfo)) {
            // NOTE: not a service request, execute proxy pipeline
            var ctx = new PipelineContext(req, res, serverInfo);

            //TODO implement public dispatch
            if (ctx.dispatch(this.openSessions)) {
                // TODO call pipeline
            }
            else
                respond404(res);
        }
    }

    // API
    close () {
        this.server1.close();
        this.server2.close();
    }

    openSession (session) {
        session.proxy                 = this;
        this.openSessions[session.id] = session;
    }

    closeSession (session) {
        session.proxy = null;
        delete this.openSessions[session.id];
    }
}