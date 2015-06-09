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

        /*var SAUCE_LABS_USERNAME = 'alexandermos';
        var SAUCE_LABS_PASSWORD = '3715e8f7-35de-431d-9c0e-6730b54f330f';*/

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
            console.log('Qunit-Farm variables:', SAUCE_LABS_USERNAME, SAUCE_LABS_PASSWORD, process.env.TRAVIS_BRANCH);

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
                var failedCount = false;

                console.log(JSON.stringify(results, null, 4));

                results.forEach(function (resultsByUrl) {
                    resultsByUrl.forEach(function (platformResults) {
                        if (platformResults.result.failed)
                            failedCount += platformResults.result.failed;
                    });
                });

                taskSucceed = !failedCount;

                if (!taskSucceed)
                    console.log(failedCount, 'test(s) are failed');
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

    gulp.task('Farm-Tests', process.env.TEST_TYPE ? [process.env.TEST_TYPE] : []);
})();

//Test pull-request - 1
