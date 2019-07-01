const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const runSequence = require('run-sequence');
const del = require('del');
const assign = require('lodash/object/assign');
const browserify = require('browserify');
const watchify = require('watchify');
const babelify = require('babelify');
const hbsfy = require('hbsfy');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const mergeStream = require('merge-stream');

const args = process.argv.slice(3);

function createBundle(src) {
    if (!src.push) {
        src = [src];
    }
    const customOpts = {
        entries: src,
        debug: true
    };
    const opts = assign({}, watchify.args, customOpts)
    const b = watchify(browserify(opts));
    b.transform(babelify.configure({
        stage:3
    }));
    b.transform(hbsfy);
    b.on('log', plugins.util.log);
    return b;
}

function bundle(b, outputPath) {
    const splitPath = outputPath.split('/');
    const outputFile = splitPath[splitPath.length - 1];
    const outputDir = splitPath.slice(0, -1).join('/');

    return b.bundle()
      // log errors if they happen
      .on('error', plugins.util.log.bind(plugins.util, 'Browserify Error'))
      .pipe(source(outputFile))
      // optional, remove if you don't need to buffer file contents
      .pipe(buffer())
      // optional, remove if you dont want sourcemaps
      .pipe(plugins.sourcemaps.init({loadMaps: true})) // loads map from browserify file
         // Add transformation tasks to the pipeline here.
      .pipe(plugins.sourcemaps.write('./')) // writes .map file
      .pipe(gulp.dest('build/' + outputDir));
}

const jsBundles = {
    'js/dbhelper.js': createBundle('./js/dbhelper.js'),
    'js/dbpromise.js': createBundle('./js/dbpromise.js'),
    'js/main.js': createBundle('./js/main.js'),
    'js/restaurant_info.js': createBundle('./js/restaurant_info.js'),
    'js/sw_register.js': createBundle('./js/sw_register.js'),
    'sw.js': createBundle('./sw.js')
}

gulp.task('clean', function(done){
    del(['build'], done)
});

gulp.task('copy', function(){
    return mergeStream(
        gulp.src('app.js').pipe(gulp.dest('build/')),
        gulp.src('index.html').pipe(gulp.dest('build/')),
        gulp.src('restaurant.html').pipe(gulp.dest('build/')),
        gulp.src('manifest.json').pipe(gulp.dest('build/')),
        gulp.src('css/**/*').pipe(gulp.dest('build/css')),
        gulp.src('img/**/*').pipe(gulp.dest('build/img')),
        gulp.src('data/**/*').pipe(gulp.dest('build/data'))
    );
});

gulp.task('js:browser', function(){
    return mergeStream.apply(null,Object.keys(jsBundles).map(key => bundle(jsBundles[key], key)));
});

gulp.task('watch', function(){
    Object.keys(jsBundles).forEach(function(key) {
        var b = jsBundles[key];
        b.on('update', function() {
          return bundle(b, key);
        });
    });
});

gulp.task('server', function(){
    plugins.developServer.listen({
        path: './app.js',
        cwd: './build',
        args: args
    });

    gulp.watch([
        'build/**/*.js'
    ], plugins.developServer.restart);
});

gulp.task('serve', function(callback){
    runSequence('clean', ['js:browser', 'copy'], ['server', 'watch'],callback);
});