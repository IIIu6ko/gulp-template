/* eslint-disable arrow-body-style */
import gulp from 'gulp'; // Подключает сам gulp
import browserSync from 'browser-sync'; // Автоматическая перезагрузка страницы
import del from 'del'; // Удаляет что либо
import path from 'path'; // Манипуляции с путями
import Yargs from 'yargs'; // Проверяет наличие флага -production в консоли
import gulpif from 'gulp-if'; // Условия
import combine from 'stream-combiner2'; // Комбинирует пайпы. Для gulp-if
import revReplace from 'gulp-rev-replace';
import rev from 'gulp-rev';
import notify from 'gulp-notify'; // Уведомления

// html
import htmlhint from 'gulp-htmlhint'; // HTML линтер
import beautify from 'gulp-beautify'; // Форматирует HTML после сборки
import nunjucks from 'gulp-nunjucks-render';
import nunjucksInheritance from 'gulp-nunjucks-inheritance';
import EmbedTag from 'nunjucks-embed';
import cached from 'gulp-cached';

// css
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import postcss from 'gulp-postcss';
import cssnano from 'cssnano';
import mqpacker from 'node-css-mqpacker'; // Группирует медиазапросы
import sortCSSmq from 'sort-css-media-queries'; // Кастомный метод сортировки
import autoprefixer from 'gulp-autoprefixer';
import sourcemaps from 'gulp-sourcemaps'; // Создаёт soursemaps
import sassInheritance from 'gulp-sass-inheritance';
import gulpStylelint from '@ronilaukkarinen/gulp-stylelint'; // CSS линтер

// js
import webpackStream from 'webpack-stream'; // Webpack
import ESLintPlugin from 'eslint-webpack-plugin'; // Eslint для Webpack
import plumber from 'gulp-plumber'; // Обработка ошибок

// Работа с изображениями
import webp from 'gulp-webp'; // Конвертирует изображение в webp
import imagemin, { mozjpeg, optipng } from 'gulp-imagemin'; // Сжатие изображений
import filter from 'gulp-filter'; // Проверка на формат изображений
import rename from 'gulp-rename'; // Изменение путей

// Работа с SVG-спрайтами
import svgSprite from 'gulp-svg-sprite'; // Спрайты из SVG
import cheerio from 'gulp-cheerio'; // Удаляет из SVG атрибуты
import replace from 'gulp-replace'; // Заменяет одно на другое

// Переменные
const args = Yargs(process.argv.slice(2)).argv;
const sass = gulpSass(dartSass);
const combiner = combine.obj;

// Флаги
const { dist } = args; // gulp --dist

// Пути
const buildHtml = 'build';
const buildCss = 'build/css';
const buildJs = 'build/js';
const buildImgs = 'build/images';
const buildFonts = 'build/fonts';
const buildSvg = 'build/images';
const buildResources = 'build/resources';

// Настройки
const distMin = true;
const distRev = true;
const distImgMin = false;
const webpImg = false;
const webpack = true;

const manageEnvironment = (environment) => {
  environment.addExtension('EmbedTag', new EmbedTag());
};

export const browserSyncTask = (cb) => {
  if (!dist) {
    browserSync.init({
      server: {
        baseDir: 'build',
      },
      directory: false,
      notify: false,
      ghostMode: false,
    });
  } else {
    cb(); // Вызывает callback, чтобы gulp не ругался
  }
};

export const html = () => {
  return gulp.src('src/**/*.html')

    // Обработчик ошибок и вывод уведомления
    .pipe(plumber({
      errorHandler: notify.onError({
        title: 'HTML',
      }),
    }))

    // Nunjucks
    .pipe(nunjucksInheritance({ base: 'src' })) // Ищем изменения в зависимостях
    // Компилируем в HTML
    .pipe(nunjucks({
      path: 'src',
      envOptions: {
        autoescape: false, // Нужно для работы embed
      },
      manageEnv: manageEnvironment,
    }))
    .pipe(cached('njk'))

    // Убираем из потока файлы из папки components
    .pipe(filter(['**', '!src/components/**/*.*']))

    // Форматируем HTML после компиляции Nunjucks
    .pipe(beautify.html({
      indent_size: 2,
      indent_char: ' ',
      max_preserve_newlines: -1,
      preserve_newlines: false,
      keep_array_indentation: false,
      break_chained_methods: false,
      indent_scripts: 'normal',
      brace_style: 'collapse',
      space_before_conditional: true,
      unescape_strings: false,
      jslint_happy: false,
      end_with_newline: false,
      wrap_line_length: 0,
      indent_inner_html: true,
      comma_first: false,
      e4x: false,
      indent_empty_lines: false,
    }))

    // HTML линтер
    .pipe(htmlhint({ htmlhintrc: '.htmlhintrc' }))
    .pipe(htmlhint.reporter())
    .pipe(htmlhint.failReporter({ suppress: true }))

    // Манифест
    // Если флаг --dist без --norev
    .pipe(gulpif(dist, gulpif(distRev, revReplace({
      manifest: gulp.src('manifest/manifest.json', { allowEmpty: true }),
    }))))

    // Убираем папку pages из пути, чтобы выгружать всё в корень build
    .pipe(rename((renamePath) => {
      renamePath.dirname = '.';
    }))

    // Выгрузка
    .pipe(gulp.dest(buildHtml))

    // browserSync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist
};

export const css = () => {
  function isStyles(file) {
    return file.basename === 'styles.css' || file.basename === 'styles.scss';
  }

  function isLibs(file) {
    return file.basename === 'libs.css' || file.basename === 'libs.scss';
  }

  return gulp.src(
    [
      'src/styles.scss',
      'src/libs.scss',
      'src/components/**/*.scss',
      'src/services/**/*.scss',
    ],
  )

    // Обработчик ошибок и вывод уведомления
    .pipe(plumber({
      errorHandler: notify.onError({
        title: 'CSS',
      }),
    }))

    // Если нет флага --dist и styles.scss, то делаем Sourcmaps
    .pipe(gulpif(!dist, gulpif(isStyles, sourcemaps.init())))

    // SASS
    .pipe(sassInheritance({ dir: 'src/components/' })) // Ищем изменения в зависимостях

    // Stylelint
    .pipe(gulpStylelint({
      customSyntax: 'postcss-scss',
      reporters: [{
        formatter: 'string',
        console: true,
      }],
    }))

    // Убираем всё, кроме style.scss и libs.scss
    .pipe(filter((file) => {
      return file.basename === 'styles.scss' || file.basename === 'libs.scss';
    }))

    .pipe(sass({ outputStyle: 'expanded' }))

    // Если флаг --dist, то минифицируем
    .pipe(gulpif(dist, gulpif(distMin, postcss([
      cssnano({
        preset: 'default',
      }),
    ]))))

    // Группируем медиазапросы
    .pipe(postcss([
      mqpacker({
        sort: sortCSSmq.desktopFirst, // Кастомный метод сортировки
      }),
    ]))

    // Минифицируем если libs.scss
    .pipe(gulpif(isLibs, postcss([
      cssnano({
        preset: 'default',
      }),
    ])))

    // autoprefixer
    .pipe(gulpif(isStyles, autoprefixer({
      cascade: false,
    })))

    // Приписывает хэш в конце файла(styles-004da46867.css)
    // Чтобы при обновлении сайта не приходилось очищать кэш
    // Если флаг --dist и настройка distRev = true
    .pipe(gulpif(dist, gulpif(distRev, rev())))

    // Если нет флага --dist и styles.scss, то делаем Sourcmaps
    .pipe(gulpif(!dist, gulpif(isStyles, sourcemaps.write())))

    // Выгрузка.
    .pipe(gulp.dest(buildCss))

    // Если флаг --dist и настройка distRev = true
    .pipe(gulpif(dist, gulpif(distRev, combiner(
      // Создаёт манифест с новым названием
      rev.manifest('manifest/manifest.json', {
        base: 'manifest', // Базовый каталог для manifest.json. Можно было бы и обойтись без этой опции, но без неё не работает merge
        merge: true, // Чтобы манифесты не перезаписывались, а соединялись в один
      }),

      // Выгружает файл манифеста в папку manifest
      gulp.dest('manifest'),
    ))))

    // Browsersync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist
};

export const js = () => {
  let webpackDevtool;
  let webpackMode;
  let webpackMinimize;

  if (dist) {
    webpackDevtool = false;
    webpackMode = 'production';
    webpackMinimize = true;
  } else {
    webpackDevtool = 'eval';
    webpackMode = 'development';
    webpackMinimize = false;
  }

  const webpackConfig = {
    mode: webpackMode,
    devtool: webpackDevtool,
    output: {
      filename: 'scripts.js',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
      ],
    },
    plugins: [
      new ESLintPlugin(),
    ],
    optimization: {
      minimize: webpackMinimize,
    },
    performance: {
      hints: false,
    },
  };

  return gulp.src('src/scripts.js')

    // Обработчик ошибок и вывод уведомления
    .pipe(plumber({
      errorHandler: notify.onError({
        title: 'JS',
        message: 'Check your terminal',
      }),
    }))

    // Webpack
    .pipe(gulpif(webpack, webpackStream(webpackConfig)))

    // Приписывает хэш в конце файла(styles-004da46867.css)
    // Чтобы при обновлении сайта не приходилось очищать кэш
    // Если флаг --dist и настройка distRev = true
    .pipe(gulpif(dist, gulpif(distRev, rev())))

    // Выгрузка
    .pipe(gulp.dest(buildJs))

    // Если флаг --dist и настройка distRev = true
    // Создаёт манифест с новым названием
    // Выгружает файл манифеста в папку manifest
    .pipe(gulpif(dist, gulpif(distRev, combiner(rev.manifest('manifest/manifest.json', {
      base: 'manifest', // Базовый каталог для manifest.json. Можно было бы и обойтись без этой опции, но без неё не работает merge
      merge: true, // Чтобы манифесты не перезаписывались, а соединялись в один
    }), gulp.dest('manifest')))))

    // Browsersync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist
};

export const images = () => {
  const imageminFilter = filter('**/*.{jpg,jpeg,png}', { restore: true });
  const webpFilter = filter('**/*.{jpg,jpeg,png,gif,ico}', { restore: true });

  return gulp.src('src/components/**/assets/*.{jpg,jpeg,png,gif,ico,svg}')

    // Убираем папку assets и вида компонента из пути
    .pipe(rename((renamePath) => {
      const dirs = renamePath.dirname.split(path.sep).slice(1, 2);
      renamePath.dirname = dirs.join(path.sep);
    }))

    // Сжимает изображения, если есть флаг --dist и настройка distImgMin = true
    .pipe(gulpif(dist, gulpif(distImgMin, imageminFilter))) // Фильтруем поток
    .pipe(gulpif(dist, gulpif(distImgMin, imagemin([
      mozjpeg({ quality: 95, progressive: true }),
      optipng({ optimizationLevel: 5 }),
    ], {
      verbose: true,
    }))))
    .pipe(gulpif(dist, gulpif(distImgMin, imageminFilter.restore))) // Восстанавливаем поток

    // Выгрузка изначальных изображений, если webp включен
    .pipe(gulpif(webpImg, gulp.dest(buildImgs)))

    // webp
    .pipe(gulpif(webpImg, webpFilter))
    .pipe(gulpif(webpImg, webp({
      quality: 85,
    })))
    .pipe(gulpif(webpImg, webpFilter.restore))

    // Выгрузка
    .pipe(gulp.dest(buildImgs))

    // Browsersync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist
};

export const svg = () => {
  /* Собирает все svg файлы и сохраняет их в файл svg-sprite.svg
  <svg class=""><use xlink:href="images/sprite.svg#"></use></svg>
  https://www.youtube.com/watch?v=ihAHwkl0KAI и https://habrahabr.ru/post/272505/ */

  return gulp.src('src/services/svg-sprite/*.svg')

    // Удаляет атрибуты из svg файлов, чтобы можно было их менять с помощью css
    .pipe(cheerio({
      run: ($) => {
        $('[fill]').removeAttr('fill');
        $('[fill-opacity]').removeAttr('fill-opacity');
        $('[stroke]').removeAttr('stroke');
        $('[stroke-dasharray]').removeAttr('stroke-dasharray');
        $('[stroke-dashoffset]').removeAttr('stroke-dashoffset');
        $('[stroke-linecap]').removeAttr('stroke-linecap');
        $('[stroke-linejoin]').removeAttr('stroke-linejoin');
        $('[stroke-miterlimit]').removeAttr('stroke-miterlimit');
        $('[stroke-opacity]').removeAttr('stroke-opacity');
        $('[stroke-width]').removeAttr('stroke-width');
        $('[font-family]').removeAttr('font-family');
        $('[font-size]').removeAttr('font-size');
        $('[font-size-adjust]').removeAttr('font-size-adjust');
        $('[font-stretch]').removeAttr('font-stretch');
        $('[font-style]').removeAttr('font-style');
        $('[font-variant]').removeAttr('font-variant');
        $('[font-weight]').removeAttr('font-weight');
        $('[style]').removeAttr('style');
      },
      parserOptions: { xmlMode: true },
    }))

    // У cheerio есть один баг — иногда он преобразовывает символ '>' в кодировку '&gt;'
    .pipe(replace('&gt;', '>'))

    // Делаем спрайт
    .pipe(svgSprite({
      mode: {
        symbol: {
          sprite: 'sprite.svg',
          dest: './', // Убираем папку с названием мода
        },
      },
      shape: { // Убирает префикс с путями
        id: {
          generator: (name) => {
            return path.basename(name, '.svg');
          },
        },
      },
    }))

    // Выгрузка
    .pipe(gulp.dest(buildSvg))

    // browserSync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist
};

export const fonts = () => {
  return gulp.src('src/services/fonts/**/*.{woff,woff2,ttf,eot,svg}')

    // Выгрузка
    .pipe(gulp.dest(buildFonts))

    // browserSync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist
};

export const resources = () => {
  // favicon, json, php and etc

  return gulp.src('src/resources/**/*.*')

    // Выгрузка
    .pipe(gulp.dest(buildResources))

    // browserSync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist
};

export const watchTask = (cb) => {
  if (!dist) { // Проверяет на наличие флага
    gulp.watch(['src/**/*.{html,njk}'], html);
    gulp.watch([
      'src/styles.scss',
      'src/libs.scss',
      'src/components/**/*.scss',
      'src/services/**/*.scss',
    ], css);
    gulp.watch(['src/components/**/*.js', 'src/scripts.js'], js);
    gulp.watch('src/services/svg-sprite/*.svg', svg);
    gulp.watch('src/services/custom-libs/**/*.*', gulp.series('css', 'js'));
    gulp.watch('src/resources/**/*.*', resources);
    gulp.watch('src/components/**/assets/*.{jpg,jpeg,png,gif,ico,svg}', images);
    gulp.watch('src/services/fonts/**/*.{woff,woff2,ttf,eot}', fonts);
  } else {
    cb(); // Вызывает callback, чтобы gulp не ругался
  }
};

export const clean = () => {
  return del(['build', 'manifest']);
};

// eslint-disable-next-line consistent-return
export const cleanManifest = (cb) => {
  if (dist) {
    return del('manifest');
  }

  cb();
};

export default gulp.series(
  clean,
  css,
  js,
  html,
  images,
  svg,
  fonts,
  resources,
  cleanManifest,
  gulp.parallel(browserSyncTask, watchTask),
);
