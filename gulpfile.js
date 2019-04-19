"use strict";

const gulp         = require("gulp"); // Подключает сам gulp.
const browserSync  = require("browser-sync"); // Автоматическая перезагрузка страницы.
const sourcemaps   = require("gulp-sourcemaps"); // Создаёт soursemaps.
const del          = require("del"); // Удаляет что либо.
const path         = require("path"); // Манипуляции с путями.
const argv         = require("yargs").argv; // Проверяет наличие флага -production в консоли.
const gulpif       = require("gulp-if"); // Условия.
const combine      = require("stream-combiner2").obj; // Комбинирует пайпы. Для gulp-if.
const htmlhint     = require("gulp-htmlhint");
const revReplace   = require("gulp-rev-replace");
const rev          = require("gulp-rev");
const sass         = require("gulp-sass");
const sortCSSmq    = require("sort-css-media-queries");
const csscomb      = require("gulp-csscomb");
const postcss      = require("gulp-postcss");
const mqpacker     = require("css-mqpacker"); // Группирует медиазапросы.
const concat       = require("gulp-concat");
const fileinclude  = require("gulp-file-include");

// Работа с SVG-спрайтами.
const cheerio      = require("gulp-cheerio"); // Удаляет атрибуты из svg файлов, чтобы можно было их менять с помощью CSS.
const svgSprite    = require("gulp-svg-sprite"); // Спрайты из SVG.
const replace      = require("gulp-replace"); // Заменяет одно на другое.

const smushit      = require("gulp-smushit"); // Оптимизирует изображения
const autoprefixer = require('gulp-autoprefixer');

const dist         = argv.dist;

const distHtml     = "dist";
const distCss      = "dist/css";
const distJs       = "dist/js";
const distImgs     = "dist/imgs";
const distFonts    = "dist/fonts";
const distSvg      = "dist/imgs";
const distFiles    = "dist/files";

const buildHtml    = "src/build";
const buildCss     = "src/build/css";
const buildJs      = "src/build/js";
const buildImgs    = "src/build/imgs";
const buildFonts   = "src/build/fonts";
const buildSvg     = "src/build/imgs";
const buildFiles    = "src/build/files";

gulp.task("browser-sync", function(c) {
  if (!dist) {
    browserSync.init({
      server: {
        baseDir: "src/build"
      },
      directory: false,
      notify: false,
      ghostMode: false
    });
  } else {
    c(); // Вызывает callback, чтобы gulp не ругался.
  }
});

gulp.task("html", function() {
  return gulp.src("src/*.html", {base: "src"})

    // HTML-валидатор.
    .pipe(htmlhint(".htmlhintrc"))
    .pipe(htmlhint.reporter())

    .pipe(fileinclude())

    // Выгрузка
    .pipe(gulpif(dist,
      combine(
        revReplace({manifest: gulp.src("manifest/manifest.json", {allowEmpty: true})}),
        gulp.dest(distHtml)
      ),
      combine(
        gulp.dest(buildHtml)
      )
    ))

    // browserSync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist или --github.
});

gulp.task("php", function() {
  return gulp.src("src/*.php", {base: "src"})

    // Выгрузка
    .pipe(gulpif(dist, gulp.dest(distHtml), gulp.dest(buildHtml)))

    // browserSync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist или --github.
});


gulp.task("css", function() {
  return gulp.src("src/blocks/main.scss")

    // Sourcemaps
    .pipe(gulpif(!dist, sourcemaps.init())) // Если нет флага --dist или --github.

    // Собирает все файлы в один.
    .pipe(concat("styles.css"))

    // Компилируем SASS.
    .pipe(sass())

    // Группируем медиазапросы
    .pipe(postcss([
      mqpacker({
        sort: sortCSSmq // Кастомный метод сортировки
      })
    ]))

    // autoprefixer
    .pipe(autoprefixer({
      browsers: ['last 10 versions'],
      cascade: false
    }))

    // Sourcemaps
    .pipe(gulpif(!dist, sourcemaps.write())) // Если нет флага --dist или --github.

    // csscomb или cssnano + rev.
    .pipe(gulpif(dist, // Если есть флаг --dist.
      combine(
        csscomb(),
        rev() /* Приписывает хэш в конце файла(styles-004da46867.css). Чтобы при обновлении сайта не приходилось очищать кэш. */
      )
    ))

    // Выгрузка
    .pipe(gulpif(dist, gulp.dest(distCss), gulp.dest(buildCss)))

    .pipe(gulpif(dist, // Если есть флаг --dist.
      combine(
        // Создаёт манифест с новым названием.
        rev.manifest("manifest/manifest.json", { //
          base: "manifest", /* Базовый каталог для manifest.json. Можно было бы и обойтись без этой опции, но без неё
          не работает merge. */
          merge: true // Чтобы манифесты не перезаписывались, а соединялись в один.
        }),
        // Выгружает файл манифеста в папку manifest.
        gulp.dest("manifest")
      )
    ))

    // Browsersync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist или --github.
});

gulp.task("jsCommon", function() {
  return gulp.src("src/blocks/**/*.js")
    // Приписывает хэш в конце файла(styles-004da46867.css). Чтобы при обновлении сайта не приходилось очищать кэш.
    .pipe(gulpif(dist, // Если есть флаг --dist.
      rev()
    ))

    // Если флаг --dist, то выгружает по пути distJs, иначе по пути buildJs.
    .pipe(gulpif(dist, gulp.dest(distJs), gulp.dest(buildJs)))

    // Создаёт манифест с новым названием.
    .pipe(gulpif(dist, // Если есть флаг --dist.
      rev.manifest("manifest/manifest.json", {
        base: "manifest", /* Базовый каталог для manifest.json. Можно было бы и обойтись без этой опции, но без неё
          не работает merge. */
        merge: true // Чтобы манифесты не перезаписывались, а соединялись в один.
      })
    ))

    // Выгружает файл манифеста в папку manifest.
    .pipe(gulpif(dist, // Если есть флаг --dist.
      gulp.dest("manifest")
    ))

    // Browsersync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist или --github.
});

gulp.task("imgs", function() {
  return gulp.src("src/blocks/**/*.{jpg,jpeg,png,gif,ico}")

    /* .pipe(gulpif(dist, // Если есть флаг --dist.
      smushit({
        verbose: true // Подробный режим
      })
    )) */

    // Если флаг --dist, то выгружает по пути distImgs, иначе по пути buildImgs.
    .pipe(gulpif(dist, gulp.dest(distImgs), gulp.dest(buildImgs)))

    // Browsersync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist или --github.
});

gulp.task("pdf", function() {
  return gulp.src("src/blocks/**/*.pdf")

    .pipe(gulpif(dist, gulp.dest(distFiles), gulp.dest(buildFiles)))

    // Browsersync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist или --github.
});

// Из-за того, что shushit не умеет обрабатывать svg пришлось сделать для них отдельный таск
gulp.task("imgsSvg", function() {
  return gulp.src(["src/blocks/**/*.svg", "!src/blocks/svg-sprite/*.svg", "!src/blocks/fonts/**/*.svg"])

    // Если флаг --dist, то выгружает по пути distImgs, иначе по пути buildImgs.
    .pipe(gulpif(dist, gulp.dest(distImgs), gulp.dest(buildImgs)))

    // Browsersync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist или --github.
});

gulp.task("libs", function() {
  return gulp.src("src/libs/**/*.*")

    // Выгрузка
    .pipe(gulpif(dist, gulp.dest("dist/libs"), gulp.dest("src/build/libs")))

    // Browsersync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist или --github.
});


gulp.task("fonts", function() {
  return gulp.src("src/blocks/fonts/**/*.{woff,woff2,ttf,eot,svg}")

    // Если флаг --dist, то выгружает по пути distFonts, иначе по пути buildFonts.
    .pipe(gulpif(dist, gulp.dest(distFonts), gulp.dest(buildFonts)))

    // browserSync
    .pipe(gulpif(!dist, browserSync.stream())); // Если нет флага --dist или --github.
});


gulp.task("clean", function() {
  if (dist) { // Если флаг --dist.
    return del(["dist", "manifest", "src/build"]);
  } else { // Если нет флага --dist.
    return del("src/build");
  }
});

gulp.task("cleanManifest", function(c) {
  if (dist) { // Если флаг --dist.
    return del("manifest");
  } else { // Если нет флага --dist.
    return c();
  }
});


/* Собирает все svg файлы и сохраняет их в файл svgSprite.js.
<svg class="inline-svg-icon browser"><use xlink:href="imgs/sprite.svg#baseball"></use></svg>
https://www.youtube.com/watch?v=ihAHwkl0KAI и https://habrahabr.ru/post/272505/ */
gulp.task("svg", function() {
  return gulp.src("src/blocks/svg-sprite/*.svg")

    .pipe(cheerio({
      run: function($) {
        $("[id]").removeAttr("id");
        $("[fill]").removeAttr("fill");
        $("[clip]").removeAttr("clip");
        $("[stroke]").removeAttr("stroke");
        $("[mask]").removeAttr("mask");
        $("[opacity]").removeAttr("opacity");
        $("[width]").removeAttr("width");
        $("[height]").removeAttr("height");
        $("[class]").removeAttr("class");
      },
      parserOptions: {
        xmlMode: true
      }
    }))

    // У cheerio есть один баг — иногда он преобразовывает символ '>' в кодировку '&gt;'.
    .pipe(replace("&gt;", ">"))

    // Делаем спрайт.
    .pipe(svgSprite({
      mode: {
        symbol: {
          sprite: "sprite.svg",
          dest: "./" // Убираем папку с названием мода.
        }
      },
      shape: { // Убирает префикс с путями.
        id: {
          generator: function(name) {
            return path.basename(name, ".svg");
          }
        }
      }
    }))

    // Выгрузка
    .pipe(gulpif(dist, gulp.dest(distSvg), gulp.dest(buildSvg)));
});

gulp.task("watch", function(c) {
  if (!dist) { // Проверяет на наличие флага.
    gulp.watch(["src/*.html", "src/blocks/**/*.html"], gulp.series("html"));
    gulp.watch("src/*.php", gulp.series("php"));
    gulp.watch("src/blocks/**/*.pdf", gulp.series("pdf"));
    gulp.watch("src/blocks/**/*.scss", gulp.series("css"));
    gulp.watch("src/blocks/**/*.js", gulp.series("jsCommon"));
    gulp.watch("src/blocks/svg-sprite/*.svg", gulp.series("svg"));

    // Наблюдает за изображениями. При добавлении - переносит в src/build/imgs, при удалении - удаляет из src/build/imgs.
    // https://github.com/gulpjs/gulp/blob/4.0/docs/recipes/handling-the-delete-event-on-watch.md
    gulp.watch("src/blocks/**/*.{jpg,jpeg,png,gif,svg}", gulp.series("imgs", "imgsSvg")).on("unlink", function(filepath) {
      var filePathFromSrc = path.relative(path.resolve("src/blocks/"), filepath);
      var destFilePath = path.resolve(buildImgs, filePathFromSrc);
      del.sync(destFilePath);
    });

    // Тоже самое, только со шрифтами.
    gulp.watch("src/blocks/fonts/**/*.{woff,woff2,ttf,eot}", gulp.series("fonts")).on("unlink", function(filepath) {
      var filePathFromSrc = path.relative(path.resolve("src/blocks/fonts"), filepath);
      var destFilePath = path.resolve(buildFonts, filePathFromSrc);
      del.sync(destFilePath);
    });
  } else {
    c(); // Вызывает callback, чтобы gulp не ругался.
  }
});

gulp.task("build", gulp.series("clean", "css", "libs", "jsCommon", "html", "php", "imgs", "imgsSvg", "fonts", "svg", "cleanManifest", "pdf"));

gulp.task("default", gulp.series("build", gulp.parallel("watch", "browser-sync")));