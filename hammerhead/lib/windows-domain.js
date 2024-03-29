'use strict';

var _regeneratorRuntime = require('babel-runtime/regenerator').default;

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default').default;

exports.__esModule = true;
exports.assign = assign;

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _promise = require('promise');

var _promise2 = _interopRequireDefault(_promise);

var exec = _promise2.default.denodeify(_child_process2.default.exec);
var cached = null;

function queryOSForCredential(cmd) {
    var credential;
    return _regeneratorRuntime.async(function queryOSForCredential$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                context$1$0.prev = 0;
                context$1$0.next = 3;
                return exec(cmd);

            case 3:
                credential = context$1$0.sent;
                return context$1$0.abrupt('return', credential.replace(/\s/g, ''));

            case 7:
                context$1$0.prev = 7;
                context$1$0.t0 = context$1$0['catch'](0);
                return context$1$0.abrupt('return', '');

            case 10:
            case 'end':
                return context$1$0.stop();
        }
    }, null, this, [[0, 7]]);
}

function assign(credentials) {
    return _regeneratorRuntime.async(function assign$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                if (cached) {
                    context$1$0.next = 8;
                    break;
                }

                context$1$0.next = 3;
                return queryOSForCredential('echo %userdomain%');

            case 3:
                context$1$0.t0 = context$1$0.sent;
                context$1$0.next = 6;
                return queryOSForCredential('hostname');

            case 6:
                context$1$0.t1 = context$1$0.sent;
                cached = {
                    domain: context$1$0.t0,
                    workstation: context$1$0.t1
                };

            case 8:

                credentials.domain = credentials.domain || cached.domain;
                credentials.workstation = credentials.workstation || cached.workstation;

            case 10:
            case 'end':
                return context$1$0.stop();
        }
    }, null, this);
}
//# sourceMappingURL=windows-domain.js.map