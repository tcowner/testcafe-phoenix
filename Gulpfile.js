//Test developer commit 1

var gulp    = require('gulp'),
    concat  = require('gulp-concat'),
    del     = require('del'),
    Promise = require('promise');

var sourcemaps = require('gulp-sourcemaps');
var babel      = require('gulp-babel');

var BABEL_TRANSFORMS = [
    'es6.arrowFunctions',
    'es6.classes',
    'es6.properties.computed',
    'es6.constants',
    'es6.blockScoping',
    'es6.destructuring',
    'es6.modules',
    'es6.parameters.default',
    'es6.templateLiterals',
    'regenerator',
    'runtime',
    'strict',
    'es7.asyncFunctions',
    'es7.classProperties'
];

//Promises
//---------------------------------------------------------------------------
function makePromise (fn) {
    return { then: fn };
}

var HangPromise = makePromise(function () {
    //Never resolves =)
});

//============================================================================================================

(function SETUP_GULP () {
    //Force Gulp to exit process when all tasks are done
    //---------------------------------------------------------------------------
    gulp.on('stop', function () {
        setTimeout(function () {
            process.exit();
        });
    });

    gulp.on('err', function () {
        setTimeout(function () {
            process.exit(1);
        });
    });
})();

//============================================================================================================

(function HAMMERHEAD () {
    var OUTPUT_DIR = '_compiled_/hammerhead_client';

    //Internal tasks
    //---------------------------------------------------------------------------
    gulp.task('Hammerhead-Clean', function () {
        return makePromise(function (done) {
            del([OUTPUT_DIR], done);
        });
    });

    gulp.task('Hammerhead-JsTemplates', ['Hammerhead-Clean'], function () {
        return gulp
            .src('hammerhead/client/templates/*.jstmpl', { silent: false })
            .pipe(gulp.dest(OUTPUT_DIR));
    });

    gulp.task('Hammerhead-Scripts', ['Hammerhead-Clean'], function () {
        var task = gulp
            .src([
                'vendor/mods.js',
                'hammerhead/client/pre.jspart',
                'vendor/jquery-1.7.2.js',
                'vendor/async.js',
                'hammerhead/client/**/*.js',
                'hammerhead/shared/**/*.js',
                'hammerhead/client/post.jspart'
            ])
            .pipe(concat('hammerhead.js'));

        return task.pipe(gulp.dest(OUTPUT_DIR));
    });

    gulp.task('Hammerhead-ES6', function () {
        return gulp.src('hammerhead/src/*.js')
            .pipe(sourcemaps.init())
            .pipe(babel({
                whitelist: BABEL_TRANSFORMS,
                loose:     BABEL_TRANSFORMS
            }))
            .pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: '../src' }))
            .pipe(gulp.dest('hammerhead/lib/'));
    });


    //Public tasks
    //---------------------------------------------------------------------------
    gulp.task('Hammerhead-Build', [
        'Hammerhead-JsTemplates',
        'Hammerhead-Scripts',
        'Hammerhead-ES6'
    ]);
})();

//============================================================================================================

(function TESTING () {
    var nodeunit = function () {
        var a = require('gulp-nodeunit');

        return a();
    };

    //Public tasks
    //---------------------------------------------------------------------------
    gulp.task('Hammerhead-QUnit', ['Hammerhead-Build'], function () {
        gulp.watch('hammerhead/client/**', ['Hammerhead-Build']);

        require('./test/qunit/server.js').start();

        return HangPromise;
    });

    (function SAUCE_LABS_QUNIT_TESTING () {
        var SauceTunnel = require('sauce-tunnel');
        var QUnitRunner = require('./test/qunit/sauce-labs-qunit-runner');
        var gulpConnect = require('gulp-connect');

        var SAUCE_LABS_USERNAME = process.env.SAUCE_LABS_USERNAME || '';
        var SAUCE_LABS_PASSWORD = process.env.SAUCE_LABS_PASSWORD || '';
        var BROWSERS            = [
            {
                browserName: "chrome",
                platform:    "Windows 7"
            }/*,
             {
             browserName: "firefox",
             platform:    "Windows 8"
             }*/];

        var tunnelIdentifier  = Math.floor((new Date()).getTime() / 1000 - 1230768000).toString();
        var sauceTunnel       = null;
        var sauceTunnelOpened = false;
        var taskSucceed       = true;
        var qUnitServerUrl    = null;

        gulp.task('open-connect', function () {
            gulpConnect.server({
                root: '',
                port: 1335
            });
        });

        gulp.task('sauce-start', function () {
            return new Promise(function (resolve, reject) {
                sauceTunnel = new SauceTunnel(SAUCE_LABS_USERNAME, SAUCE_LABS_PASSWORD, tunnelIdentifier, true);

                sauceTunnel.start(function (isCreated) {
                    if (!isCreated)
                        reject('Failed to create Sauce tunnel');
                    else {
                        sauceTunnelOpened = true;
                        resolve('Connected to Sauce Labs');
                    }
                });
            });
        });

        gulp.task('run-tests', ['Hammerhead-Build', 'run-qunit-server', 'sauce-start'], function (callback) {
            var runner = new QUnitRunner({
                username:         SAUCE_LABS_USERNAME,
                key:              SAUCE_LABS_PASSWORD,
                build:            process.env.TRAVIS_JOB_ID || '',
                browsers:         BROWSERS,
                tunnelIdentifier: tunnelIdentifier,
                urls:             [qUnitServerUrl + '/run-dir?dir=fixtures/hammerhead_client'],
                tags:             [process.env.TRAVIS_BRANCH || 'master']
            });

            runner.runTests(function (results) {
                function bold (text) {
                    return '\033[1m' + text + '\033[22m';
                }

                function red (text) {
                    return '\033[31m' + text + '\033[39m';
                }

                function green (text) {
                    return '\033[32m' + text + '\033[39m';
                }

                var errors = [];

                results[0].forEach(function (platformResults) {
                    var msg      = [];
                    var platform = [platformResults.platform[0], platformResults.platform[1], platformResults.platform[2] ||
                                                                                              ''].join(' ');

                    msg.push(bold(platformResults.result.failed ? red('FAILURES:') : green('OK:')));
                    msg.push(platform);
                    msg.push(bold('Total:'), platformResults.result.total);
                    msg.push(bold('Failed:'), platformResults.result.failed);

                    console.log(msg.join(' '));

                    platformResults.result.errors.forEach(function (error) {
                        error.platform = platform;
                        errors.push(error);
                    });

                });

                taskSucceed = !errors.length;

                if (!taskSucceed) {
                    console.log(bold(red('ERRORS:')));

                    errors.forEach(function (error) {
                        console.log(bold(error.platform + ' - ' + error.testPath));
                        console.log(bold('Test: ' + error.testName));

                        if (error.customMessage)
                            console.log('message: ' + error.customMessage);

                        if(error.expected) {
                            console.log('expected: ' + error.expected);
                            console.log('actual: ' + error.actual);
                        }

                        console.log('-------------------------------------------');
                        console.log();
                    });
                }

                callback();
            });
        });

        gulp.task('sauce-end', ['run-tests'], function (callback) {
            sauceTunnelOpened = false;
            sauceTunnel.stop(callback);
        });

        gulp.task('close-connect', ['run-tests'], function () {
            gulpConnect.serverClose();
        });

        gulp.task('run-qunit-server', function () {
            qUnitServerUrl = require('./test/qunit/server.js').start(true);
        });

        gulp.task('Qunit-Farm', ['Hammerhead-Build', 'run-tests', 'sauce-end'], function () {
            if (!taskSucceed)
                process.exit(1);
        });

        gulp.on('err', function () {
            if (sauceTunnelOpened)
                sauceTunnel.stop(new Function());
        });


    })();

    gulp.task('Nodeunit', ['Hammerhead-Build'], function () {
        return gulp
            .src('test/nodeunit/**/*_test.js')
            .pipe(nodeunit());
    });

    gulp.task('Farm-Tests', [process.env.GULP_TASK]);
})();
