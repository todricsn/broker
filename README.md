# HTML-версия личного кабинета таможенного брокера

Это отдельный статический проект без React, Vite и базы данных. Его можно открыть
как обычный сайт на хостинге: HTML + CSS + JS + JSON.

## Структура

```txt
html_broker/
  index.html              # главная страница и разметка кабинета
  access.json             # код доступа -> файл клиента
  favicon.svg

  assets/
    css/styles.css        # весь дизайн
    js/app.js             # вход, ЭПТС, трекинг, модалка
    *.jpg, *.png          # фото и герб

  clients/
    _template.json        # шаблон нового клиента
    README.txt            # инструкция для заказчика
    987654.json           # данные клиента

  scripts/
    validate-data.js      # проверка JSON и фото
    build.js              # сборка dist
    serve.js              # локальный сервер
```

## Команды

```bash
npm run dev            # локально открыть сайт на http://127.0.0.1:5174/
npm run validate:data  # проверить JSON-файлы
npm run build          # собрать dist
npm run release        # собрать dist + архив html-broker-dist.zip
```

## Как редактировать данные

Главный файл кодов: `access.json`.

Пример:

```json
{
  "987654": "clients/987654.json"
}
```

Файл клиента лежит в `clients/код.json` и содержит:

- `profile` — ФИО, баланс, сальдо, остаток, текст;
- `eptsRecords` — записи ЭПТС;
- `trackingCodes` — транспорт, фото и статусы.

Фото кладутся в `assets/`, а в JSON указывается путь вида:

```json
"photo": "assets/tracking-truck.jpg"
```

Чтобы добавить клиента, скопируйте `clients/_template.json`, переименуйте в
новый код, например `555777.json`, заполните данные и добавьте код в
`access.json`.

## Что заливать на хостинг

После `npm run release` готовый архив будет здесь:

```txt
html-broker-dist.zip
```

На хостинг заливается содержимое архива.
