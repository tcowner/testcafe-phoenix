var CMD = HammerheadClient.get('Shared.ServiceCommands'),
    EventSandbox = HammerheadClient.get('DOMSandbox.Event'),
    Hammerhead = HammerheadClient.get('Hammerhead'),
    HiddenInfo = HammerheadClient.get('DOMSandbox.Upload.HiddenInfo'),
    InfoManager = HammerheadClient.get('DOMSandbox.Upload.InfoManager'),
    JSProcessor = HammerheadClient.get('Shared.JSProcessor'),
    PageProc = HammerheadClient.get('Shared.PageProc'),
    SandboxedJQuery = HammerheadClient.get('SandboxedJQuery'),
    Transport = HammerheadClient.get('Transport'),
    UploadSandbox = HammerheadClient.get('DOMSandbox.Upload'),
    Util = HammerheadClient.get('Util'),

    $ = Hammerhead.$,
    NativeMethods = Hammerhead.NativeMethods;

Hammerhead.init();

// ----- Server api mock ---------
// virtual file system:
//   - file.txt
//   - folder
//      - file.png

var files = [
    {
        paths: ['file.txt', './file.txt'],
        file: {
            data: 'dGVzdA==',
            info: {
                lastModifiedDate: Date.now(),
                name: 'file.txt',
                type: 'text/plain'
            }
        }
    },
    {
        paths: ['./folder/file.png', 'folder/file.png'],
        file: {
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPRyoQAAAAxJREFUGFdj+L99OwAFJgJueSUNaAAAAABJRU5ErkJggg==',
            info: {
                lastModifiedDate: Date.now(),
                name: 'file.png',
                type: 'image/png'
            }
        }
    }
];

var storedAsyncServiceMsg = Transport.asyncServiceMsg;

QUnit.testStart = function () {
    Transport.asyncServiceMsg = overridedAsyncServiceMsg;
};

QUnit.testDone = function () {
    Transport.asyncServiceMsg = storedAsyncServiceMsg;
};

function overridedAsyncServiceMsg(msg, callback) {
    switch (msg.cmd) {
        case CMD.GET_UPLOADED_FILES:
            callback(getFilesInfo(msg.filePaths));
            break;
        case CMD.UPLOAD_FILES:
            callback(uploadFiles(msg.data, msg.fileNames));
            break;
        default:
            return storedAsyncServiceMsg.call(Transport, msg, callback);
    }
}

function uploadFiles(data, filePaths) {
    var result = [];

    for (var i = 0; i < filePaths.length; i++) {
        if (filePaths[i] === 'error')
            result.push({ code: 34 });
        else {
            result.push({
                paths: [filePaths[i]],
                file: data[i]
            });
        }
    }

    files = files.concat(result);

    return result;
}

function getFilesInfo(filePaths) {
    var result = [];

    for (var i = 0; i < filePaths.length; i++) {
        var res = null;

        for (var j = 0; j < files.length; j++) {
            if (files[j].paths.indexOf(filePaths[i]) !== -1)
                res = files[j].file;
        }

        result.push(res || { code: 34 });
    }

    return result;
}
// -------------------------------

function getFileWrapper(name) {
    var res = new Blob([], {type: 'image/png'});

    res.name = name;
    res.lastModifiedDate = Date.now();

    return res;
}

function getInputWrapper(fileNames) {
    var value = fileNames.join(',');

    var fileWrappers = fileNames.map(function (name) {
        return getFileWrapper(name);
    });

    var fileListWrapper = {
        length: fileWrappers.length,
        item: function (index) {
            return this[index];
        }
    };

    for (var i = 0; i < fileWrappers.length; i++)
        fileListWrapper[i] = fileWrappers[i];

    var result = $('<input type="file">').appendTo('body')[0];

    Object.defineProperty(result, 'value', {
        get: function () {
            return value;
        }
    });

    Object.defineProperty(result, 'files', {
        get: function () {
            return fileListWrapper;
        }
    });

    return result;
}

var isIE9 = $.browser.msie && $.browser.version === '9.0';

function getFiles(filesInfo) {
    var files = [];

    for (var i = 0; i < filesInfo.length; i++) {
        files.push({
            base64: filesInfo[i].data,
            type: filesInfo[i].info.type,
            name: filesInfo[i].info.name
        });
    }

    return files;
}

module('Hidden info');

test('Get/set upload info', function () {
    var fileInputWithoutForm = $('<input type="file">')[0],
        fileInputWithForm = $('<form><input type="file"></form>').children()[0],
        form = fileInputWithForm.parentNode;

    HiddenInfo.setFormInfo(fileInputWithoutForm, [
        { fileProperties: 'value' }
    ]);
    HiddenInfo.setFormInfo(fileInputWithForm, [
        { otherFileProperties1: 'otherValue1' },
        { otherFileProperties2: 'otherValue2' }
    ]);

    var uploadInfoWithoutForm = HiddenInfo.getFormInfo(fileInputWithoutForm),
        uploadInfoWithForm = HiddenInfo.getFormInfo(fileInputWithForm);

    strictEqual(uploadInfoWithoutForm, null);
    strictEqual(uploadInfoWithForm.length, 2);
    strictEqual(uploadInfoWithForm[0].otherFileProperties1, 'otherValue1');
    strictEqual(uploadInfoWithForm[1].otherFileProperties2, 'otherValue2');

    HiddenInfo.setFormInfo($('<input type="file">').appendTo(form)[0], [
        { otherFileProperties3: 'otherValue3' }
    ]);

    uploadInfoWithForm = HiddenInfo.getFormInfo(fileInputWithForm);

    strictEqual(uploadInfoWithForm.length, 1);
    strictEqual(uploadInfoWithForm[0].otherFileProperties3, 'otherValue3');
    strictEqual(form.children.length, 3);
    strictEqual(form.querySelectorAll('[type="hidden"]').length, 1);
    strictEqual(form.querySelectorAll('[type="hidden"]')[0].value, JSON.stringify(uploadInfoWithForm));
});

test('Add/remove input info', function () {
    var form = $([
            '<form>',
            '    <input type="file" name="test1" id="id1">',
            '    <input type="file" name="test2" id="id2">',
            '</form>'
        ].join('')),
        fileInput1 = form.children()[0],
        fileInput2 = form.children()[1],
        formInfo = HiddenInfo.getFormInfo(fileInput1);

    strictEqual(formInfo.length, 2);
    strictEqual(formInfo[0].files.length, 0);
    strictEqual(formInfo[1].files.length, 0);

    HiddenInfo.addInputInfo(fileInput1, getFiles(getFilesInfo(['file.txt', 'folder/file.png'])), 'file.txt');
    HiddenInfo.addInputInfo(fileInput2, getFiles(getFilesInfo(['folder/file.png'])), 'file.png');

    formInfo = HiddenInfo.getFormInfo(fileInput1);

    strictEqual(formInfo.length, 2);
    strictEqual(formInfo[0].value, 'file.txt');
    strictEqual(formInfo[0].name, 'test1');
    strictEqual(formInfo[0].files.length, 2);
    strictEqual(formInfo[0].files[0].name, 'file.txt');
    strictEqual(formInfo[0].files[1].name, 'file.png');
    strictEqual(formInfo[1].value, 'file.png');
    strictEqual(formInfo[1].name, 'test2');
    strictEqual(formInfo[1].files.length, 1);
    strictEqual(formInfo[1].files[0].name, 'file.png');

    HiddenInfo.removeInputInfo(fileInput1);

    formInfo = HiddenInfo.getFormInfo(fileInput1);

    strictEqual(formInfo.length, 1);
    strictEqual(formInfo[0].value, 'file.png');
    strictEqual(formInfo[0].name, 'test2');
    strictEqual(formInfo[0].files.length, 1);
    strictEqual(formInfo[0].files[0].name, 'file.png');

    HiddenInfo.removeInputInfo(fileInput2);

    formInfo = HiddenInfo.getFormInfo(fileInput1);

    strictEqual(formInfo.length, 0);
});

asyncTest('Transfer input element between forms', function() {
    var formEl1 = $('<form><input type="file"></form>')[0],
        formEl2 = $('<form>')[0],
        inputEl = formEl1.firstChild,
        div = document.createElement('div'),
        hiddenInfo = null,
        parsedHiddenInfo = null;

    expect(20);

    strictEqual(formEl1.children.length, 2, 'Hidden input in form1 is present');
    strictEqual(formEl2.children.length, 0, 'Hidden input in form2 is missing');

    UploadSandbox.upload(inputEl, ['./file.txt'], function () {
        hiddenInfo = formEl1.children[1].value;
        parsedHiddenInfo = JSON.parse(hiddenInfo);

        strictEqual(parsedHiddenInfo[0].files.length, 1, 'Hidden info contains 1 file');
        strictEqual(parsedHiddenInfo[0].files[0].name, 'file.txt', 'File name is "file.txt"');
        strictEqual(parsedHiddenInfo[0].files[0].type, 'text/plain', 'File type is "text/plain"');
        strictEqual(formEl2.children.length, 0, 'Hidden input in form2 is missing');

        formEl1.removeChild(inputEl);

        strictEqual(formEl1.children[0].value, '[]', 'Hidden info in form1 is empty');
        strictEqual(formEl2.children.length, 0, 'Hidden input in form2 is missing');

        formEl2.appendChild(inputEl);

        strictEqual(formEl1.children[0].value, '[]', 'Hidden info in form1 is empty');
        strictEqual(formEl2.children[1].value, hiddenInfo, 'Hidden input in form2 contains file info');

        formEl2.removeChild(inputEl);

        strictEqual(formEl1.children[0].value, '[]', 'Hidden info in form1 is empty');
        strictEqual(formEl2.children[0].value, '[]', 'Hidden info in form2 is empty');

        formEl1.insertBefore(inputEl, formEl1.firstChild);

        strictEqual(formEl1.children[1].value, hiddenInfo, 'Hidden input in form1 contains file info');
        strictEqual(formEl2.children[0].value, '[]', 'Hidden info in form2 is empty');

        formEl1.removeChild(inputEl);
        div.appendChild(inputEl);

        strictEqual(formEl1.children[0].value, '[]', 'Hidden info in form1 is empty');
        strictEqual(formEl2.children[0].value, '[]', 'Hidden info in form2 is empty');

        formEl1.insertBefore(div, formEl1.firstChild);

        strictEqual(formEl1.children[1].value, hiddenInfo, 'Hidden input in form1 contains file info');
        strictEqual(formEl2.children[0].value, '[]', 'Hidden info in form2 is empty');

        formEl1.removeChild(div);

        strictEqual(formEl1.children[0].value, '[]', 'Hidden info in form1 is empty');
        strictEqual(formEl2.children[0].value, '[]', 'Hidden info in form2 is empty');

        start();
    });
});

module('Info manager');

test('Set/clear info', function () {
    var form = $([
            '<form>',
            '    <input type="file" name="test1" id="id1">',
            '    <input type="file" name="test2" id="id2">',
            '</form>'
        ].join('')),
        fileInput1 = form.children()[0],
        fileInput2 = form.children()[1],
        textFileInfo = getFilesInfo(['file.txt']),
        imageFileInfo = getFilesInfo(['folder/file.png']);

    strictEqual(InfoManager.getUploadInfo(fileInput1), null);
    strictEqual(InfoManager.getUploadInfo(fileInput2), null);

    InfoManager.setUploadInfo(fileInput1, imageFileInfo, 'file.png');

    strictEqual(JSON.stringify(InfoManager.getUploadInfo(fileInput1).files), JSON.stringify(imageFileInfo));
    strictEqual(InfoManager.getUploadInfo(fileInput2), null);

    InfoManager.setUploadInfo(fileInput1, textFileInfo, 'file.txt');

    strictEqual(JSON.stringify(InfoManager.getUploadInfo(fileInput1).files), JSON.stringify(textFileInfo));
    strictEqual(InfoManager.getUploadInfo(fileInput2), null);

    InfoManager.setUploadInfo(fileInput2, imageFileInfo, 'file.png');

    strictEqual(JSON.stringify(InfoManager.getUploadInfo(fileInput1).files), JSON.stringify(textFileInfo));
    strictEqual(JSON.stringify(InfoManager.getUploadInfo(fileInput2).files), JSON.stringify(imageFileInfo));

    InfoManager.clearUploadInfo(fileInput2);

    strictEqual(JSON.stringify(InfoManager.getUploadInfo(fileInput1).files), JSON.stringify(textFileInfo));
    strictEqual(InfoManager.getUploadInfo(fileInput2).files.length, 0);

    InfoManager.clearUploadInfo(fileInput1);

    strictEqual(InfoManager.getUploadInfo(fileInput1).files.length, 0);
    strictEqual(InfoManager.getUploadInfo(fileInput2).files.length, 0);
});

test('Format value', function () {
    var formatValueOnceFile = InfoManager.formatValue(['text.pdf']),
        formatValueMultiFile = InfoManager.formatValue(['text.txt', 'doc.doc']);

    if ($.browser.msie || $.browser.webkit)
        strictEqual(formatValueOnceFile, 'C:\\fakepath\\text.pdf');
    else
        strictEqual(formatValueOnceFile, 'text.pdf');

    if ($.browser.msie)
        strictEqual(formatValueMultiFile, 'C:\\fakepath\\text.txt, C:\\fakepath\\doc.doc');
    else if ($.browser.webkit)
        strictEqual(formatValueMultiFile, 'C:\\fakepath\\text.txt');
    else
        strictEqual(formatValueMultiFile, 'text.txt');
});

module('Server errs');

asyncTest('Upload error', function () {
    var input = $('<input type="file">')[0];

    UploadSandbox.upload(input, './err_file.txt', function (errs) {
        strictEqual(errs.length, 1);
        strictEqual(errs[0].code, 34);

        UploadSandbox.upload(input, ['./err_file1.txt', './file.txt', './err_file2.txt'], function (errs) {
            strictEqual(errs.length, 2);
            strictEqual(errs[0].code, 34);
            strictEqual(errs[1].code, 34);

            start();
        });
    });
});

if(!Util.isIE && !/iPad|iPhone/i.test(navigator.userAgent)) {
    asyncTest('Get uploaded file error: single file', function () {
        var stFiles = files,
            inputWrapper = getInputWrapper(['error']),
            ev = document.createEvent('Events'),
            eventHandler = function (fileNames, input, callback) {
                callback(function (err) {
                    equal(err.length, 1);
                    equal(err[0].code, 34);

                    $(inputWrapper).remove();
                    UploadSandbox.off(UploadSandbox.FILE_UPLOADING_EVENT, eventHandler);
                    files = stFiles;

                    start();
                });
            };

        UploadSandbox.on(UploadSandbox.FILE_UPLOADING_EVENT, eventHandler);

        ev.initEvent('change', true, true);
        NativeMethods.dispatchEvent.call(inputWrapper, ev);
    });

    asyncTest('Get uploaded file error: multi file', function () {
        var stFiles = files,
            inputWrapper = getInputWrapper(['file1.txt', 'error', 'file2.txt']),
            ev = document.createEvent('Events'),
            eventHandler = function (fileNames, input, callback) {
                callback(function (err) {
                    equal(err.length, 3);
                    equal(err[1].code, 34);
                    ok(!err[0].code);
                    ok(!err[2].code);

                    $(inputWrapper).remove();
                    UploadSandbox.off(UploadSandbox.FILE_UPLOADING_EVENT, eventHandler);
                    files = stFiles;

                    start();
                });
            };

        UploadSandbox.on(UploadSandbox.FILE_UPLOADING_EVENT, eventHandler);

        ev.initEvent('change', true, true);
        NativeMethods.dispatchEvent.call(inputWrapper, ev);
    });
}

module('Upload');

test('Set value', function () {
    var fileInput = $('<input type="file">')[0];

    strictEqual(fileInput.value, '');

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('fileInput.value = "d:/text.test"'));

    strictEqual(fileInput.value, '');
});

asyncTest('Set empty value', function () {
    var fileInput = $('<input type="file" name="test" id="id">')[0],
        value = '',
        files = null;

    eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('value = fileInput.value; files = fileInput.files'));

    strictEqual(value, '');
    if (isIE9)
        strictEqual(typeof files, 'undefined');
    else
        strictEqual(files.length, 0);

    UploadSandbox.upload(fileInput, ['./file.txt'], function () {
        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('value = fileInput.value; files = fileInput.files'));

        if ($.browser.webkit || $.browser.msie)
            strictEqual(value, 'C:\\fakepath\\file.txt');
        else
            strictEqual(value, 'file.txt');

        if (isIE9)
            strictEqual(typeof files, 'undefined');
        else
            strictEqual(files.length, 1);

        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('fileInput.value = "";value = fileInput.value; files = fileInput.files'));

        strictEqual(value, '');

        if (isIE9)
            strictEqual(typeof files, 'undefined');
        else
            strictEqual(files.length, 0);

        start();
    });
});

asyncTest('Repeated select file', function () {
    var fileInput = $('<input type="file" name="test" id="id">')[0],
        value = '',
        files = null;

    expect(4);

    UploadSandbox.upload(fileInput, './file.txt', function () {
        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('value = fileInput.value; files = fileInput.files'));

        if ($.browser.webkit || $.browser.msie)
            strictEqual(value, 'C:\\fakepath\\file.txt');
        else
            strictEqual(value, 'file.txt');

        if (isIE9)
            strictEqual(typeof files, 'undefined');
        else
            strictEqual(files[0].name, 'file.txt');

        UploadSandbox.upload(fileInput, 'folder/file.png', function () {
            eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('value = fileInput.value; files = fileInput.files'));

            if ($.browser.webkit || $.browser.msie)
                strictEqual(value, 'C:\\fakepath\\file.png');
            else
                strictEqual(value, 'file.png');

            if (isIE9)
                strictEqual(typeof files, 'undefined');
            else
                strictEqual(files[0].name, 'file.png');

            start();
        });
    });
});

asyncTest('Change event', function () {
    var fileInput = $('<input type="file" name="test" id="777">')[0];

    expect(2);

    fileInput.onchange = function () {
        var value = '',
            files = null;

        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('value = fileInput.value; files = fileInput.files'));

        if ($.browser.webkit || $.browser.msie)
            strictEqual(value, 'C:\\fakepath\\file.txt');
        else
            strictEqual(value, 'file.txt');

        if (isIE9)
            strictEqual(typeof files, 'undefined');
        else
            strictEqual(files.length, 1);

        start();
    };

    UploadSandbox.upload(fileInput, './file.txt', function () { });
});

asyncTest('Multi-select files', function () {
    var fileInput = $('<input type="file" name="test" id="id">')[0],
        value = '',
        files = null;

    expect(2);

    UploadSandbox.upload(fileInput, ['./file.txt', 'folder/file.png'], function () {
        eval(window[JSProcessor.PROCESS_SCRIPT_METH_NAME]('value = fileInput.value; files = fileInput.files'));

        if ($.browser.msie)
            strictEqual(value, 'C:\\fakepath\\file.txt, C:\\fakepath\\file.png');
        else if ($.browser.webkit)
            strictEqual(value, 'C:\\fakepath\\file.txt');
        else
            strictEqual(value, 'file.txt');

        if (isIE9)
            strictEqual(typeof files, 'undefined');
        else
            strictEqual(files.length, 2);

        start();
    });
});

asyncTest('Get file info from iframe', function() {
    var fileInput = $('<input type="file" id="uploadTestIFrame" name="test">').appendTo(document.body);

    expect(isIE9 ? 1 : 4);

    UploadSandbox.upload(fileInput[0], './file.txt', function () {
        window.addEventListener('message', function(e) {
            var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;

            if (!isIE9) {
                strictEqual(data.filesLength, 1);
                strictEqual(data.fileName, 'file.txt');
                strictEqual(data.fileType, 'text/plain');
            }

            if ($.browser.webkit || $.browser.msie)
                strictEqual(data.value, 'C:\\fakepath\\file.txt');
            else
                strictEqual(data.value, 'file.txt');

            start();
        });

        $('<iframe src="/data/upload/iframe.html">').appendTo(document.body)[0];
    });
});

module('Sandboxed jquery');

asyncTest('input.value getter', function () {
    var fileInput = $('<input type="file" name="test" id="id">')[0];

    UploadSandbox.upload(fileInput, ['./file.txt'], function () {
        ok(SandboxedJQuery.jQuery(fileInput).val().indexOf('file.txt') !== -1);
        start();
    });
});


