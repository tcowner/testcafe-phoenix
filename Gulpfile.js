var gulp            = require('gulp'),
    concat          = require('gulp-concat'),
    del             = require('del');

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
    //Public tasks
    //---------------------------------------------------------------------------
    gulp.task('Hammerhead-QUnit', ['Hammerhead-Build'], function () {
        gulp.watch('hammerhead/client/**', ['Hammerhead-Build']);

        require('./test/qunit/server.js').start();

        return HangPromise;
    });

    gulp.task('Farm-Hammerhead-QUnit', ['Hammerhead-Build'], function () {
        gulp.watch('hammerhead/client/**', ['Hammerhead-Build']);

        require('./test/qunit/server.js').start();

        return HangPromise;
    });
})();