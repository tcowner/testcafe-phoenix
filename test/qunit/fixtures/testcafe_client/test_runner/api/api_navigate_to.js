var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    TestIterator = TestCafeClient.get('TestRunner.TestIterator'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    ActionsAPI = TestCafeClient.get('TestRunner.API.Actions'),
    Util = Hammerhead.Util;

Hammerhead.init();

var testIterator = new TestIterator();
ActionsAPI.init(testIterator);

$(document).ready(function () {

        var asyncActionCallback,

            runAsyncTest = function (actions, assertions, timeout) {
                var callbackFunction = function () {
                    clearTimeout(timeoutId);
                    assertions();
                    start();
                };
                asyncActionCallback = function () {
                    callbackFunction();
                };
                actions();
                var timeoutId = setTimeout(function () {
                    callbackFunction = function () {
                    };
                    ok(false, 'Timeout is exceeded');
                    start();
                }, timeout);
            };

        TestIterator.prototype.asyncAction = function (action) {
            action(asyncActionCallback);
        };


        asyncTest('navigate to given url', function () {
            var savedSetProperty = window[Hammerhead.JSProcessor.SET_PROPERTY_METH_NAME],
                locationValue = null;

            window[Hammerhead.JSProcessor.SET_PROPERTY_METH_NAME] = function (owner, propName, value) {
                if (owner === window && propName === 'location')
                    locationValue = value;
            };

            runAsyncTest(
                function () {
                    ActionsAPI.navigateTo('http://my.site.url');
                },
                function () {
                    window[Hammerhead.JSProcessor.SET_PROPERTY_METH_NAME] = savedSetProperty;
                    strictEqual(locationValue, 'http://my.site.url');
                },
                2000
            );
        });
    }
);
