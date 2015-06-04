var Path         = require('path'),
    Fs           = require('fs'),
    Express      = require('express'),
    EventEmitter = require('events').EventEmitter,
    Process      = require('child_process'),
    Url          = require('url'),
    uuid         = require('node-uuid'),
    http         = require('http');

//Const
var PORT                = 1335,
    CROSS_DOMAIN_PORT   = 1336,
    BASE_PATH           = __dirname,
    FIXTURES_PATH       = Path.join(BASE_PATH, '/fixtures'),
    SANDBOX_PATH        = Path.join(BASE_PATH, '/sandbox'),
    MARKUP_PATH         = Path.join(BASE_PATH, '/markup'),
    SANDBOX_MARKUP_PATH = Path.join(BASE_PATH, '/markup/sandbox'),
    VIEWS_PATH          = Path.join(BASE_PATH, '/views'),
    CUSTOM_SETUP_PATH   = Path.join(BASE_PATH, '/custom_setup.js'),
    COMPILED_PATH       = Path.join(BASE_PATH, '../../_compiled_'),

    TEST_PAGE_VIEW      = './test_page_template.ejs',
    SANDBOX_PAGE_VIEW   = './sandbox_page_template.ejs',
    DIR_LIST_VIEW       = './dir.ejs',
    TASK_REPORT_VIEW    = './task_report.ejs',

    TEST_SETUP_FILE     = Path.join(BASE_PATH, 'test_page_setup.js'),
    SANDBOX_SETUP_FILE  = Path.join(BASE_PATH, 'sandbox_page_setup.js');

//Globals
var appServer   = null,
    pageSetupJs = null;

var contentType = {
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.html': 'text/html',
    '':      'text/html'
};

//Utils
function fileExists (path) {
    try {
        Fs.statSync(path);
        return true;
    } catch (x) {
        return false;
    }
}

function isDir (path) {
    return Fs.statSync(path).isDirectory();
}

function isHiddenFile (path) {
    path = Path.basename(path);

    return path[0] == '_' || path[0] == '.';
}

function isTestFile (path) {
    var isFixtureDirectory = path.indexOf(FIXTURES_PATH) > -1;

    path = Path.basename(path);

    return isFixtureDirectory && /\.js$/i.test(path);
}

function isSandboxTestFile (path) {
    var isSandboxDirectory = path.indexOf(SANDBOX_PATH) > -1;

    path = Path.basename(path);

    return isSandboxDirectory && /\.js$/i.test(path);
}

function getTests (path) {
    var tasks = [],
        i     = 0;

    var res = readDir(path);

    for (i = 0; i < res.files.length; i++) {
        tasks.push(Path.join(path, res.files[i]));
    }

    for (i = 0; i < res.dirs.length; i++) {
        tasks = tasks.concat(getTests(Path.join(path, res.dirs[i])));
    }

    return tasks;
}

function readDir (path) {
    var result = {
        dirs:  [],
        files: []
    };

    Fs.readdirSync(path).forEach(function (entry) {
        var subpath = Path.join(path, entry);

        if (isDir(subpath)) {
            result.dirs.push(entry);
        }

        if (isTestFile(subpath) || isSandboxTestFile(subpath)) {
            result.files.push(entry);
        }
    });

    result.dirs.sort();
    result.files.sort();

    return result;
}

function pathToUrl (path) {
    return path.substr(BASE_PATH.length).replace(/\\/g, '/');
}

function urlToPath (url) {
    return Path.join(BASE_PATH, url);
}

function getFileData (filename) {
    return Fs.readFileSync(filename).toString();
}

function getTestMarkUp (path) {
    var markUpPath = path.replace(FIXTURES_PATH, MARKUP_PATH).replace('.js', '.html');

    return fileExists(markUpPath) ?
           getFileData(markUpPath) :
           ''
}

function getSandboxMarkUp (path) {
    var markUpPath = path.replace(SANDBOX_PATH, SANDBOX_MARKUP_PATH).replace('.js', '.html');

    return fileExists(markUpPath) ?
           getFileData(markUpPath) :
           ''
}

function getCustomSetupJs () {
    return fileExists(CUSTOM_SETUP_PATH) ?
           getFileData(CUSTOM_SETUP_PATH) :
           ''
}

//Tasks
var tasks = {};

function createTask (path) {
    var tests = getTests(path),
        uid   = uuid.v4();

    var task = {
        uid:       uid,
        path:      path,
        tests:     tests,
        total:     tests.length,
        completed: 0,
        failed:    0,
        passed:    0,
        reports:   [],
        results:   []
    };

    tasks[uid] = task;

    return task;
}

function onTestComplete (res, testReport, taskUid, userAgent) {
    var task = tasks[taskUid];

    //NOTE: check task have already completed
    if (task.completed === task.total) {
        res.set('Location', pathToUrl(task.path));
        res.send(302);
        return;
    }

    task.results.push({
        name:   task.tests[task.completed],
        result: testReport
    });

    task.reports.push(testReport);
    task.completed++;

    if (testReport.errReport && testReport.errReport.report) {
        task.failed++;
    }
    else {
        task.passed++;
    }

    var nextTestUrl = task.completed === task.total ? null : pathToUrl(task.tests[task.completed]);

    //NOTE: This route is necessary for use of server.js as module. This route is taking tests report and send for further processing.
    if (!nextTestUrl) {
        appServer.emit('tests_complete', task, userAgent);
    }

    res.send(nextTestUrl || '/get-report');
}

function getReport (taskUid) {
    var task           = tasks[taskUid],

        preparedReport = {
            uid:       taskUid,
            path:      pathToUrl(task.path),
            total:     task.total,
            completed: task.completed,
            success:   task.passed,
            failed:    []
        };

    for (var i = 0; i < task.reports.length; i++) {
        var taskReport = task.reports[i];

        if (taskReport.errReport && taskReport.errReport.report) {
            for (var j = 0; j < taskReport.errReport.report.length; j++) {
                var report = taskReport.errReport.report[j];

                report.testPath = pathToUrl(task.tests[i]);
                preparedReport.failed.push(report);
            }
        }
    }

    return preparedReport;
}

function runTests (res, path) {
    var task = createTask(path);

    if (task.tests.length) {
        runTest(res, task.tests[0], task.uid);
    }
    else {
        res.set('Location', pathToUrl(path));
        res.send(302);
    }
}

function runTest (res, path, taskUid) {
    var data = {
        testPageSetup:       pageSetupJs,
        testMarkup:          getTestMarkUp(path),
        testFixture:         getFileData(path),
        customTestPageSetup: getCustomSetupJs(),
        taskUid:             taskUid
    };

    res.render(TEST_PAGE_VIEW, data);
}

function runSandbox (res, path, taskUid) {
    var data = {
        testPageSetup:       '',
        testMarkup:          getSandboxMarkUp(path),
        testFixture:         getFileData(path),
        customTestPageSetup: getFileData(SANDBOX_SETUP_FILE),
        taskUid:             taskUid
    };

    res.render(SANDBOX_PAGE_VIEW, data);
}

//NOTE: Url rewrite proxied requests (e.g. for iframes), so they will hit our server
function urlRewriteProxyRequest (req, res, next) {
    var proxiedUrlPartRegExp = /^\/\S+?\/(https?:)/;

    if (proxiedUrlPartRegExp.test(req.url)) {
        // NOTE: store original URL so we can sent it back for testing purposes (see GET xhr-test route).
        req.originalUrl = req.url;

        var url = req.url.replace(proxiedUrlPartRegExp, '$1');
        //NOTE: create host-relative URL
        var parsedUrl      = Url.parse(url);
        parsedUrl.host     = null;
        parsedUrl.hostname = null;
        parsedUrl.port     = null;
        parsedUrl.protocol = null;
        parsedUrl.slashes  = false;
        req.url            = Url.format(parsedUrl);
    }
    next();
}

var start = function () {
    runCrossDomainServer();

    var app        = Express(),
        currentDir = FIXTURES_PATH;

    appServer = http.createServer(app);

    EventEmitter.call(appServer);

    pageSetupJs = getFileData(TEST_SETUP_FILE);

    app.set('views', VIEWS_PATH);
    app.use(urlRewriteProxyRequest);
    app.use(Express.bodyParser());
    app.use('/testcafe_client', Express.static(Path.join(COMPILED_PATH, './testcafe_client')));
    app.use('/hammerhead_client', Express.static(Path.join(COMPILED_PATH, './hammerhead_client')));

    //Prevent caching
    app.get('/*', function (req, res, next) {
        res.set('cache-control', 'no-cache, no-store, must-revalidate');
        next();
    });


    // Test purposes api
    app.get('/xhr-test/:delay', function (req, res) {
        var delay = req.params.delay || 0;

        setTimeout(function () {
            res.send(req.originalUrl);
        }, delay);
    });

    app.get('/xhr-large-response',function(req, res){
        var data = new Array(1000);
        res.send(data);
    });

    app.post('/xhr-test/:delay', function (req, res) {
        var delay = req.params.delay || 0;

        setTimeout(function () {
            res.send('');
        }, delay);
    });

    app.get('/wrap-responseText-test/:isJSON', function (req, res) {
        var isJSON       = !!(req.params.isJSON === 'json'),
            responseText = isJSON ?
                           '{tag: "a", location: "location", attribute: {src: "example.com"}}' :
                           '<a href="example.com"><img src="img.png"></a>';

        res.send(responseText);
    });

    app.get('/iframe-test/:delay', function (req, res) {
        var delay = req.params.delay || 0;

        setTimeout(function () {
            res.send('');
        }, delay);
    });

    app.get('/get-script/:script', function (req, res) {
        var script = req.params.script || '';

        res.send(script);
    });

    app.post('/service-msg/:delay', function (req, res) {
        var delay = req.params.delay || 0;

        setTimeout(function () {
            res.send(delay);
        }, delay);
    });

    // Initialization


    app.all('/run-next-test', function (req, res) {
        onTestComplete(res, req.body.report, req.body.taskUid, req.headers['user-agent']);
    });

    app.all('/run-dir', function (req, res) {
        runTests(res, urlToPath(req.query.dir));
    });

    app.all('/get-report', function (req, res) {
        var taskUid = req.query.taskUid;

        res.render(TASK_REPORT_VIEW, getReport(taskUid));
    });

    app.all('/*', function (req, res) {
        var page    = req.params[0],
            path    = Path.join(BASE_PATH, page),
            taskUid = req.query.taskUid;

        path = path.replace(/[\\\/]+$/, '');

        res.header('Cache-Control', 'no-cache');

        if (!fileExists(path)) {
            res.send(404);
            return;
        }

        if (!page) {
            res.set('Location', '/fixtures');
            res.send(302);
        }
        else if (isDir(path)) {
            var data = readDir(path);

            data.currentDir = currentDir = Path.basename(path);
            data.currentUrl = pathToUrl(path);
            data.fixtures   = /^\/fixtures(\/|$)/i.test(data.currentUrl);

            res.render(DIR_LIST_VIEW, data);

        }
        else {
            if (isTestFile(path)) {
                runTest(res, path, taskUid);
            }
            else if (isSandboxTestFile(path)) {
                runSandbox(res, path, taskUid);
            }
            else {
                res.set('Content-Type', contentType[Path.extname(path)]);
                res.send(Fs.readFileSync(path, 'utf8'));
            }
        }
    });

    appServer.listen(PORT);
    console.log('Server listens on port ' + PORT);
    Process.exec('start http://localhost:' + PORT);

    return appServer;
};

function runCrossDomainServer () {
    var app = Express();

    appServer = http.createServer(app);

    app.use(urlRewriteProxyRequest);
    app.use('/testcafe_client', Express.static(Path.join(COMPILED_PATH, './testcafe_client')));
    app.use('/hammerhead_client', Express.static(Path.join(COMPILED_PATH, './hammerhead_client')));

    //Prevent caching
    app.get('/*', function (req, res, next) {
        res.set('cache-control', 'no-cache, no-store, must-revalidate');
        next();
    });


    app.get('/xhr-test/:delay', function (req, res) {
        var delay = req.params.delay || 0;

        setTimeout(function () {
            res.send(req.url);
        }, delay);
    });

    app.get('/*', function (req, res) {
        var path = Path.join(BASE_PATH, 'data/cross_domain', req.path);

        path = path.replace(/[\\\/]+$/, '');

        res.header('Cache-Control', 'no-cache');

        if (!fileExists(path)) {
            res.send(404);

            return;
        }

        res.set('Content-Type', 'text/html');
        res.send(Fs.readFileSync(path, 'utf8'));
    });

    appServer.listen(CROSS_DOMAIN_PORT);
}

exports.start = start;