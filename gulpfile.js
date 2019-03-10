const gulp = require('gulp')
const sass = require('gulp-sass')
const postcss = require('gulp-postcss')
const autoprefixer = require('autoprefixer')
const gapProperties = require('postcss-gap-properties')
const csswring = require('csswring')
const { rollup } = require('rollup')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const { terser } = require('rollup-plugin-terser')

const isDev = process.env.NODE_ENV !== 'production'

const styles = () => {
  const sassStream = sass()

  if (isDev) {
    sassStream.on('error', sass.logError)
  }

  return gulp
    .src(['src/styles/*.scss', '!src/styles/_*.scss'], {
      sourcemaps: true,
    })
    .pipe(sassStream)
    .pipe(
      postcss(
        [
          autoprefixer({
            cascade: false,
          }),
          gapProperties({
            preserve: false,
          }),
          !isDev && csswring(),
        ].filter(Boolean),
      ),
    )
    .pipe(
      gulp.dest('src/build', {
        sourcemaps: '.',
      }),
    )
}

const scripts = async () => {
  const bundle = await rollup({
    input: 'src/scripts/main.mjs',
    plugins: [resolve(), commonjs(), !isDev && terser()].filter(Boolean),
  })
  await bundle.write({
    dir: 'src/build',
    format: 'esm',
    sourcemap: true,
  })
}

const build = gulp.parallel(styles, scripts)
exports.build = build

const watch = (done) => {
  const options = {
    delay: 0,
  }
  gulp.watch(['src/styles/**/*.scss'], styles, options)
  gulp.watch(['src/scripts/**/*.mjs'], scripts, options)
  done()
}

const start = gulp.series(gulp.parallel(styles, scripts), watch)
exports.default = start
