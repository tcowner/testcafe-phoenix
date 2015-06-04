var Hammerhead = HammerheadClient.get('Hammerhead'),
    $ = Hammerhead.$,
    Transport = TestCafeClient.get('Base.Transport'),
    PlaybackRunner = TestCafeClient.get('Recorder.PlaybackRunner'),
    SharedErrors = TestCafeClient.get('Shared.Errors'),
    ActionBarrier = TestCafeClient.get('ActionBarrier'),
    ModalBackground = TestCafeClient.get('UI.ModalBackground');

Hammerhead.init();

Transport.batchUpdate = function (callback) {
    callback();
};
Transport.startInactivityMonitor = function () {
};
Transport.stopInactivityMonitor = function () {
};
ModalBackground.hide = function () {
};
ActionBarrier.waitPageInitialization = function (callback) {
    callback();
};
$.fn.load = function (callback) {
    callback();
};
PlaybackRunner.prototype._onNextStepStarted = function (e) {
    e.callback();
};


QUnit.testStart = function () {
    lastError = null;
};

asyncTest('test failed event', function () {
    var playbackRunner = new PlaybackRunner(),
        stepNames = ['1.Step name'],
        testSteps = [function() {
            playbackRunner.act.click('#nonexistentElement');
        }];

    playbackRunner.act._start(stepNames, testSteps, 0);

    playbackRunner.on(playbackRunner.TEST_FAILED_EVENT, function (err) {
        ok(err);
        start();
    });
});