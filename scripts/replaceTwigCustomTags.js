const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'src', 'include');

const componentTypes = ['&organisms', '^molecules', '@atoms'];

function log(message, level = 'info') {
  const colors = {
    info: '\x1b[36m%s\x1b[0m',
    success: '\x1b[32m%s\x1b[0m',
    warning: '\x1b[33m%s\x1b[0m',
    error: '\x1b[31m%s\x1b[0m',
  };

  console.log(colors[level] || '%s', message);
}

function replaceViewTags(content, componentPath, componentType) {
  return content.replace(/{% view ['"]?([@&^][\w-/]+)['"]?(?: with (.+))? %}/g, (match, viewPath, data) => {
    if (viewPath === '@icon') {
      return replaceIconTag(data);
    }

    return replaceComponentTag(viewPath, data, componentType);
  });
}

function replaceComponentTag(viewPath, data, componentType) {
  const symbol = viewPath[0];
  const relativePath = viewPath.slice(1);

  let levelUpCount = 0;
  let typeOfComponent;

  if (symbol === '@') {
    typeOfComponent = '@atoms';

    if (componentType === '@atoms') {
      levelUpCount = 1;
    } else {
      levelUpCount = 2;
    }
  } else if (symbol === '^') {
    typeOfComponent = '^molecules';

    if (componentType === '^molecules') {
      levelUpCount = 1;
    } else {
      levelUpCount = 2;
    }
  } else if (symbol === '&') {
    typeOfComponent = '&organisms';

    if (componentType === '&organisms') {
      levelUpCount = 1;
    } else {
      levelUpCount = 2;
    }
  }

  let includePath;

  if (levelUpCount === 1) {
    includePath = `${'../'.repeat(levelUpCount)}${relativePath}/${relativePath}.storybook.twig`;
  } else {
    includePath = `${'../'.repeat(levelUpCount)}${typeOfComponent}/${relativePath}/${relativePath}.storybook.twig`;
  }

  if (data) {
    return `{% include "${includePath}" with ${data} %}`;
  } else {
    return `{% include "${includePath}" %}`;
  }
}

function replaceIconTag(data) {
  if (!data) {
    log(`Проверьте данные иконки: ${data}`, 'warning');

    return '';
  }

  const inlineIconMatch = data.match(/icon:\s*{name:\s*["']([\w-/]+)["']}/);
  if (inlineIconMatch) {
    const iconName = inlineIconMatch[1];

    return `
        <div class="icon" aria-hidden="true">
          {{ source("./${iconName}.svg") }}
        </div>`.trim();
  }

  // Пример: {icon: variableName}
  const variableIconMatch = data.match(/icon:\s*([\w.]+)/);
  if (variableIconMatch) {
    const variableName = variableIconMatch[1];

    return `
        <div class="icon" aria-hidden="true">
            {{ source('./' ~ ${variableName}.name ~ '.svg') }}
        </div>
        `.trim();
  }

  log(`Неизвестный формат иконки: ${data}`, 'error');
  return '';
}

function processComponent(componentPath, componentName, componentType) {
  const templatePath = path.join(componentPath, `${componentName}.twig`);
  const storybookTemplatePath = path.join(componentPath, `${componentName}.storybook.twig`);

  if (!fs.existsSync(templatePath)) {
    log(`Шаблон не найден: ${templatePath}`, 'warning');

    return;
  }

  try {
    const content = fs.readFileSync(templatePath, 'utf8');
    const updatedContent = replaceViewTags(content, componentPath, componentType);

    fs.writeFileSync(storybookTemplatePath, updatedContent, 'utf8');

    // log(`Файл создан: ${storybookTemplatePath}`, 'success');
  } catch (error) {
    log(`Ошибка обработки компонента: ${componentName} - ${error.message}`, 'error');
  }
}

// Функция для обработки всех компонентов
function processComponents() {
  componentTypes.forEach((type) => {
    const typePath = path.join(baseDir, type);
    // log(`Поиск компонентов в: ${typePath}`, 'info');

    if (!fs.existsSync(typePath)) {
      // log(`Папка не найдена ${typePath}`, 'error');
      return;
    }

    const componentFolders = fs
      .readdirSync(typePath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(typePath, entry.name));

    if (componentFolders.length === 0) {
      // log(`Компонентов в этой папке нет: ${type}`, 'warning');
      return;
    }

    // log(`Найден компонент ${componentFolders.length} в ${type}`, 'info');

    componentFolders.forEach((componentPath) => {
      const componentName = path.basename(componentPath);
      processComponent(componentPath, componentName, type);
    });
  });
}

// Запуск скрипта
// log('Запуск, 'info');
processComponents();
// log('Конец', 'success');
