var Hammerhead = HammerheadClient.get('Hammerhead'),
    DialogsAPI = TestCafeClient.get('TestRunner.API.Dialogs');

var unexpectedDialogErrors = [],
    wasNotExpectedDialogErrors = [],
    dialogsInfoChangedEvents = [];

QUnit.testStart = function () {
    unexpectedDialogErrors = [];
    wasNotExpectedDialogErrors = [];
    dialogsInfoChangedEvents = [];
};

function createDefaultDialogsInfo() {
    return {
        expectAlertCount: 0,
        expectConfirmCount: 0,
        expectPromptCount: 0,
        expectedConfirmRetValues: [],
        expectedPromptRetValues: [],
        expectBeforeUnload: false,
        alerts: [],
        confirms: [],
        prompts: [],
        beforeUnloadDialogAppeared: false
    };
}

DialogsAPI.on(DialogsAPI.UNEXPECTED_DIALOG_ERROR_EVENT, function (e) {
    unexpectedDialogErrors.push(e);
});

DialogsAPI.on(DialogsAPI.WAS_NOT_EXPECTED_DIALOG_ERROR_EVENT, function (e) {
    wasNotExpectedDialogErrors.push(e);
});

DialogsAPI.on(DialogsAPI.DIALOGS_INFO_CHANGED_EVENT, function (e) {
    dialogsInfoChangedEvents.push(e.info);
});

test('Dialogs info changed event (init without info)', function () {
    DialogsAPI.init();

    equal(dialogsInfoChangedEvents.length, 0);

    DialogsAPI.resetHandlers();
    equal(dialogsInfoChangedEvents.length, 1);
    deepEqual(dialogsInfoChangedEvents[0], createDefaultDialogsInfo());
});

test('Dialogs info changed event (init with info)', function () {
    var info = createDefaultDialogsInfo();
    info.expectAlertCount = 1;

    DialogsAPI.init(info);

    equal(dialogsInfoChangedEvents.length, 0);

    DialogsAPI.resetHandlers();
    equal(dialogsInfoChangedEvents.length, 1);
    deepEqual(dialogsInfoChangedEvents[0], createDefaultDialogsInfo());
});

test('Unexpected dialog errors', function () {
    DialogsAPI.init();

    window.alert();
    ok(typeof window.confirm() === 'undefined');
    ok(typeof window.prompt() === 'undefined');

    equal(unexpectedDialogErrors.length, 3);
});

test('Init with expected dialogs', function () {
    var info = createDefaultDialogsInfo();
    info.expectAlertCount = 1;
    info.expectConfirmCount = 2;
    info.expectPromptCount = 2;
    info.expectedConfirmRetValues = [true, false];
    info.expectedPromptRetValues = ['1', '2'];

    DialogsAPI.init($.extend({}, info));

    window.alert('Alert message');
    ok(window.confirm('Confirm message 1'));
    ok(!window.confirm('Confirm message 2'));
    equal(window.prompt('Prompt message 1'), '1');
    equal(window.prompt('Prompt message 2'), '2');

    DialogsAPI.checkExpectedDialogs();

    equal(unexpectedDialogErrors.length, 0);
    equal(wasNotExpectedDialogErrors.length, 0);
    equal(dialogsInfoChangedEvents.length, 5);

    info.alerts = ['Alert message'];
    info.confirms = ['Confirm message 1', 'Confirm message 2'];
    info.prompts = ['Prompt message 1', 'Prompt message 2'];

    deepEqual(dialogsInfoChangedEvents[4], info);
});

test('Handle dialogs', function () {
    var info = createDefaultDialogsInfo();

    DialogsAPI.init();

    DialogsAPI.handleAlert();
    DialogsAPI.handleConfirm(true);
    DialogsAPI.handleConfirm(false);
    DialogsAPI.handlePrompt('1');
    DialogsAPI.handlePrompt('2');

    window.alert('Alert message');
    ok(window.confirm('Confirm message 1'));
    ok(!window.confirm('Confirm message 2'));
    equal(window.prompt('Prompt message 1'), '1');
    equal(window.prompt('Prompt message 2'), '2');

    DialogsAPI.checkExpectedDialogs();

    equal(unexpectedDialogErrors.length, 0);
    equal(wasNotExpectedDialogErrors.length, 0);
    equal(dialogsInfoChangedEvents.length, 10);

    info.expectAlertCount = 1;
    info.expectConfirmCount = 2;
    info.expectPromptCount = 2;
    info.expectedConfirmRetValues = [true, false];
    info.expectedPromptRetValues = ['1', '2'];
    info.alerts = ['Alert message'];
    info.confirms = ['Confirm message 1', 'Confirm message 2'];
    info.prompts = ['Prompt message 1', 'Prompt message 2'];

    deepEqual(dialogsInfoChangedEvents[4], info);
});

test('Unexpected dialog error when there are several dialogs', function () {
    var info = createDefaultDialogsInfo();
    info.expectAlertCount = 1;

    DialogsAPI.init(info);

    window.alert();
    window.alert();

    equal(unexpectedDialogErrors.length, 1);

    DialogsAPI.checkExpectedDialogs();

    equal(unexpectedDialogErrors.length, 2);
    equal(wasNotExpectedDialogErrors.length, 0);
});

test('Was not expected dialog error', function () {
    var info = createDefaultDialogsInfo();
    info.expectAlertCount = 1;
    info.expectConfirmCount = 1;
    info.expectPromptCount = 1;

    DialogsAPI.init(info);

    DialogsAPI.checkExpectedDialogs();

    equal(wasNotExpectedDialogErrors.length, 3);
    equal(wasNotExpectedDialogErrors[0].dialog, 'alert');
    equal(wasNotExpectedDialogErrors[1].dialog, 'confirm');
    equal(wasNotExpectedDialogErrors[2].dialog, 'prompt');
});

test('Reset handlers', function () {
    var info = createDefaultDialogsInfo();
    info.expectAlertCount = 1;

    DialogsAPI.init(info);
    window.alert();

    equal(unexpectedDialogErrors.length, 0);
    equal(wasNotExpectedDialogErrors.length, 0);

    DialogsAPI.checkExpectedDialogs();
    DialogsAPI.resetHandlers();
    window.alert();

    equal(unexpectedDialogErrors.length, 1);
    equal(wasNotExpectedDialogErrors.length, 0);
});

test('Check unexpected dialogs', function () {
    DialogsAPI.init();

    window.alert('Alert message');
    window.confirm('Confirm message');
    window.prompt('Prompt message');

    equal(unexpectedDialogErrors.length, 3);
    unexpectedDialogErrors = [];

    DialogsAPI.checkExpectedDialogs();
    equal(unexpectedDialogErrors.length, 3);
    equal(unexpectedDialogErrors[0].message, 'Alert message');
    equal(unexpectedDialogErrors[1].message, 'Confirm message');
    equal(unexpectedDialogErrors[2].message, 'Prompt message');
});