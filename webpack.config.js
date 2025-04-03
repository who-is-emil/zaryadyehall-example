const fs = require('fs');
const path = require('path');
const glob = require('glob');
const twig = require('twig');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserWebpackPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const iconsDir = path.resolve(__dirname, 'src/img');

const TwigPagesPlugin = {
  apply: (compiler) => {
    const pagesDir = path.resolve(__dirname, 'src/pages');
    const ajaxDir = path.resolve(__dirname, 'src/pages/ajax');
    const dataDir = path.resolve(__dirname, 'data');
    const ajaxDataDir = path.resolve(__dirname, 'data/ajax');
    const includeDir = path.resolve(__dirname, 'src/include');

    // загрузка данных страницы
    function loadPageData(pageName) {
      const dataPath = path.resolve(dataDir, `${pageName}.json`);

      if (fs.existsSync(dataPath)) {
        return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      }

      console.log(`Данные для страницы ${pageName} не найдены`);

      return {};
    }

    // загрузка данных ajax
    function loadAjaxData(ajaxName) {
      const dataPath = path.resolve(ajaxDataDir, `${ajaxName}.json`);

      if (fs.existsSync(dataPath)) {
        return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      }

      console.log(`Данные для ajax компонента ${ajaxName} не найдены`);

      return {};
    }

    // Загрузка данных компонента
    function loadComponentData(componentPath, componentName) {
      const componentDataPath = path.resolve(componentPath, `${componentName}.json`);

      if (fs.existsSync(componentDataPath)) {
        return JSON.parse(fs.readFileSync(componentDataPath, 'utf-8'));
      }

      return {};
    }

    function deepMerge(defaults, overrides) {
      if (typeof defaults !== 'object' || defaults === null) return overrides;
      if (typeof overrides !== 'object' || overrides === null) return overrides;

      const result = Array.isArray(defaults) ? [] : {};

      for (const key in defaults) {
        if (Object.hasOwnProperty.call(defaults, key)) {
          result[key] = deepMerge(defaults[key], overrides[key] || null);
        }
      }

      for (const key in overrides) {
        if (Object.hasOwnProperty.call(overrides, key)) {
          result[key] = deepMerge(defaults[key] || null, overrides[key]);
        }
      }

      return result;
    }

    // Преобразование краткого пути компонента в реальный путь
    function resolveComponentPath(shortPath) {
      const prefixes = {
        '&': 'include/&organisms/',
        '^': 'include/^molecules/',
        '@': 'include/@atoms/',
      };

      const prefix = shortPath[0];
      const name = shortPath.slice(1);

      if (!prefixes[prefix]) {
        throw new Error(`Неизвестный префикс компонента: ${prefix}`);
      }

      return path.resolve(__dirname, 'src', prefixes[prefix], name);
    }

    // Кастомный тег `view`
    twig.extend((Twig) => {
      twig.cache(false);

      Twig.exports.extendTag({
        type: 'view',
        regex: /^view\s+(.+?)(?:\s+with\s+([\S\s]+?))?$/,
        next: [],
        open: true,

        compile(token) {
          const expression = token.match[1].trim();
          token.stack = Twig.expression.compile.call(this, {
            type: Twig.expression.type,
            value: expression,
          }).stack;

          if (token.match[2]) {
            const additionalData = Twig.expression.compile.call(this, {
              type: Twig.expression.type,
              value: token.match[2],
            }).stack;
            token.additionalData = additionalData;
          }

          return token;
        },

        parse(token, context) {
          const shortPath = Twig.expression.parse.call(this, token.stack, context);
          const componentPath = resolveComponentPath(shortPath);
          const componentName = shortPath.slice(1);
          const componentTemplatePath = path.resolve(componentPath, `${componentName}.twig`);

          if (!fs.existsSync(componentTemplatePath)) {
            throw new Error(`Не найден шаблон компонента: ${componentTemplatePath}`);
          }

          const defaultDataPath = path.resolve(componentPath, `${componentName}.json`);
          let defaultData = {};

          if (fs.existsSync(defaultDataPath)) {
            defaultData = JSON.parse(fs.readFileSync(defaultDataPath, 'utf-8'));
          }

          let mergedData;

          if (token.additionalData) {
            // Слияние передаваемых данных с данными по умолчанию
            const overrides = Twig.expression.parse.call(this, token.additionalData, context);

            mergedData = overrides;
          } else {
            // Использование данных по умолчанию, если данные не передаются
            mergedData = defaultData;
          }

          const componentTemplate = fs.readFileSync(componentTemplatePath, 'utf-8');
          const renderedComponent = twig.twig({ data: componentTemplate }).render(mergedData);

          return {
            chain: false,
            output: renderedComponent,
          };
        },
      });
    });

    // Кастомный тег `svg`
    twig.extend((Twig) => {
      Twig.exports.extendTag({
        type: 'svg',
        regex: /^svg(?:\s+(.+?))?(?:\s+with\s+(.+))?$/,
        next: [],
        open: true,

        compile(token) {
          if (token.match[1]) {
            token.stack = Twig.expression.compile.call(this, {
              type: Twig.expression.type,
              value: token.match[1],
            }).stack;
          }

          if (token.match[2]) {
            token.additionalData = Twig.expression.compile.call(this, {
              type: Twig.expression.type,
              value: token.match[2],
            }).stack;
          }

          return token;
        },

        parse(token, context) {
          let iconData = token.stack ? Twig.expression.parse.call(this, token.stack, context) : null;

          // Если дополнительные данные переданы через `with`
          if (token.additionalData) {
            const additionalData = Twig.expression.parse.call(this, token.additionalData, context);

            if (!iconData && additionalData?.icon) {
              iconData = additionalData.icon;
            } else if (typeof iconData === 'object' && additionalData) {
              iconData = { ...iconData, ...additionalData };
            } else {
              iconData = additionalData;
            }
          }

          // svg должна содержать объект с полем `name`
          if (typeof iconData === 'string') {
            iconData = { name: iconData };
          }

          if (typeof iconData !== 'object' || !iconData.name) {
            throw new Error('SVG-тег должен содержать объект с полем "name".');
          }

          // Генерация пути к SVG-файлу
          const iconPath = path.resolve(iconsDir, `${iconData.name}.svg`);

          if (!fs.existsSync(iconPath)) {
            throw new Error(`Иконка ${iconData.name} не найдена по пути ${iconPath}`);
          }

          // Загрузка содержимого SVG
          const svgContent = fs.readFileSync(iconPath, 'utf-8');

          return {
            chain: false,
            output: svgContent,
          };
        },
      });
    });

    // Рендеринг страниц
    compiler.hooks.thisCompilation.tap('TwigPagesPlugin', (compilation) => {
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'TwigPagesPlugin',
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        async () => {
          const pages = glob.sync(`${pagesDir}/*.twig`);
          const ajaxComponents = glob.sync(`${ajaxDir}/*.twig`);
          const assets = Object.keys(compilation.assets);

          const cssFiles = assets.filter((file) => file.endsWith('.css'));
          const jsFiles = assets.filter((file) => file.endsWith('.js'));

          await Promise.all(
            pages.map(async (page) => {
              const pageName = path.basename(page, '.twig');
              const fileName = `${pageName}.html`;

              const pageData = {
                ...loadPageData(pageName),
                cssFiles,
                jsFiles,
              };

              const html = await new Promise((resolve, reject) => {
                twig.renderFile(page, pageData, (err, html) => {
                  if (err) {
                    console.error(`Ошибка при рендере файла ${page}:`, err);
                    reject(err);
                    return;
                  }
                  resolve(html);
                });
              });

              compilation.emitAsset(fileName, new webpack.sources.RawSource(html));
            }),
            ajaxComponents.map(async (component) => {
              const ajaxName = path.basename(component, '.twig');
              const fileName = `${ajaxName}.html`;

              const ajaxData = {
                ...loadAjaxData(ajaxName),
              };

              const html = await new Promise((resolve, reject) => {
                twig.renderFile(component, ajaxData, (err, html) => {
                  if (err) {
                    console.error(`Ошибка при рендере файла ${page}:`, err);
                    reject(err);
                    return;
                  }
                  resolve(html);
                });
              });

              compilation.emitAsset(fileName, new webpack.sources.RawSource(html));
            })
          );
        }
      );
    });

    // Отслеживания изменений
    compiler.hooks.afterCompile.tap('TwigPagesPlugin', (compilation) => {
      compilation.contextDependencies.add(dataDir);
      compilation.contextDependencies.add(pagesDir);
      compilation.contextDependencies.add(ajaxDataDir);
      compilation.contextDependencies.add(includeDir);
      compilation.contextDependencies.add(iconsDir);
      compilation.contextDependencies.add(path.resolve(__dirname, 'src/include'));
    });
  },
};

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: './src/js/main.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      // filename: 'js/[name].[contenthash].js',
      filename: 'js/[name].js',
      clean: true,
    },
    externals: {
      ymaps3: 'ymaps3',
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                additionalData: `
                  @import "@/scss/vars/index.scss";
                  @import "@/scss/mixins/index.scss";
                `,
                sassOptions: {
                  silenceDeprecations: ['import', 'mixed-decls', 'legacy-js-api', 'color-functions', 'global-builtin', 'slash-div'],
                },
              },
            },
          ],
        },
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
        {
          test: /\.(ttf|woff|woff2|eot|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name][ext]',
          },
        },
        {
          test: /\.twig$/,
          use: [
            {
              loader: 'twig-loader',
            },
          ],
        },
        {
          test: /\.(glsl|vs|fs|vert|frag)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'raw-loader',
            },
            {
              loader: 'glslify-loader',
            },
          ],
        },
      ],
    },
    optimization: {
      minimize: !isDev,
      minimizer: [new TerserWebpackPlugin(), new CssMinimizerPlugin()],
    },
    plugins: [
      new CleanWebpackPlugin(),
      new MiniCssExtractPlugin({
        // filename: 'css/[name].[contenthash].css',
        filename: 'css/[name].css',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'src/img'),
            to: 'img',
          },
          {
            from: path.resolve(__dirname, 'src/public'),
            to: '.',
          },
        ],
      }),
      TwigPagesPlugin,
    ],
    devServer: {
      static: path.resolve(__dirname, 'dist'),
      port: 3000,
      hot: true,
      // liveReload: true,
      watchFiles: [
        'src/pages/**/*.twig',
        'src/include/**/*.twig',
        'data/**/*.json',
        'src/include/**/**/*.json',
        'src/**/*.scss',
        'src/**/*.js',
      ],
    },
    resolve: {
      extensions: ['.js', '.scss'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'source-map' : false,
  };
};
