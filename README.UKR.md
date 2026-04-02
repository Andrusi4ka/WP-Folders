# WP Folders

WP Folders додає віртуальні папки та підпапки для WordPress Media Library без зміни фізичних шляхів до файлів у `uploads`.

Плагін не переміщує, не перейменовує і не копіює файли на диску. Він лише зберігає зв'язки між вкладеннями WordPress та віртуальними папками.

## Screenshots

### Main Library

![screen](./screens/output.gif)

### Grid View

![screen](./screens/screen-1.png)

### List View

![screen](./screens/screen-2.png)

### Attachment Modal

![screen](./screens/screen-3.png)

### Settings

![screen](./screens/screen-4.png)

## Installation

1. Скористатеся стандартною установкою плагінв або скопіюйте папку плагіна в директорію `wp-content/plugins/`.
2. Переконайтеся, що структура виглядає так:
3. Увійдіть в адмін-панель WordPress.
4. Перейдіть в `Plugins`.
5. Активуйте `WP Folders`.
6. Після активації відкрийте:
   `Media -> WP Folders`

## What The Plugin Does

- Створює віртуальні папки для медіафайлів.
- Підтримує вкладені папки та підпапки.
- Працює поверх стандартних WordPress attachments.
- Не змінює фізичне розташування файлів в `uploads`.
- Не змінює існуючі URL файлів.

## Main Features

- Створення папок і підпапок для медіафайлів.
- Переміщення файлів між папками без зміни їх фізичного розташування.
- Окрема медіатека WP Folders з grid і list view.
- Фільтрація файлів за папкою, типом, датою та пошуком.
- Завантаження файлів прямо в поточну папку.
- Редагування metadata вкладень:
  alt text, title, caption, description.
- Копіювання URL файлу в буфер обміну.
- Перегляд attachment details у модальному вікні.
- Візуальне сортування файлів у grid view.
- Табличний режим з bulk actions і пагінацією.
- Сортування колонок у list view.
- Показ розміру всієї медіатеки.
- Підтримка unassigned files.

## Library Overview

У власній бібліотеці WP Folders доступні такі можливості:

- Ліва панель з деревом папок.
- Root state `All Media`.
- Окремий стан `Unassigned`.
- Створення кореневої папки.
- Створення підпапки.
- Перейменування папки.
- Видалення папки.
- Підрахунок файлів у папках.
- Показ загального розміру медіатеки.

## Uploading Files

- Кнопка `Upload files` відкриває панель завантаження.
- Є drag-and-drop зона.
- Можна вибрати файли через системний file picker.
- Якщо відкрита конкретна папка, нові файли можуть одразу призначатися в неї.
- Після завантаження бібліотека оновлюється автоматично.

## Grid View

- Картки файлів з preview.
- Виділення одного або кількох файлів.
- Візуальний drag-and-drop порядок.
- Кнопка `Select multiple`.
- Масове переміщення в іншу папку.
- Масове видалення.
- Клік по картці відкриває модалку деталей.

## List View

- Табличний перегляд файлів.
- Колонки:
  File, Author, Uploaded to, Comments, Date.
- Сортування по колонках.
- Bulk actions.
- Пагінація.
- Select all для поточної сторінки.
- Швидкі дії для рядка:
  edit, delete permanently, view, copy URL, download.

## Filters And Search

WP Folders підтримує:

- Пошук по медіафайлах.
- Фільтр по типу файлів.
- Фільтр по даті.
- Фільтр по папці.
- Вибір `All media files`.
- Вибір `All dates`.
- Системні стани:
  `Unattached`, `Mine`, `Unassigned`.

## Attachment Modal

Модалка деталей файлу містить:

- Preview зображення або іконку файлу.
- Назву файлу.
- MIME type.
- Розмір файлу.
- Розміри зображення, якщо доступні.
- URL файлу.
- Кнопку копіювання URL.
- Alt text.
- Title.
- Caption.
- Description.
- Навігацію між попереднім і наступним елементом.

## Settings

У плагіна є окрема сторінка налаштувань:

`Media -> WP Folders`

### 1. Media Library Access

Налаштовує спосіб доступу до бібліотеки WP Folders.

Доступні варіанти:

- `Create separate menu item for the WP Folders media library`
  Залишає стандартну WordPress Media Library без змін і показує WP Folders як окремий пункт меню в секції `Media`.

- `Redirect the standard Media Library to WP Folders`
  Перенаправляє стандартний екран `Media -> Library` на WP Folders і прибирає окремий пункт меню бібліотеки WP Folders.

### 2. Media Library Items Per Page

Визначає, скільки файлів показувати на одній сторінці в бібліотеці WP Folders.

Доступні значення:

- `20`
- `50`
- `100`

### 3. Files Per Row In Grid View

Визначає, скільки файлів показувати в одному ряду в grid view на великих екранах.

Доступні значення:

- `5`
- `6`
- `7`
- `8`
- `9`
- `10`

## Files, URLs And Database

Ці моменти важливі для роботи плагіна:

- Плагін не змінює шляхи до файлів.
- Плагін не змінює імена файлів.
- Плагін не змінює URL файлів.
- Файли залишаються в стандартній структурі WordPress uploads.
- Плагін не створює власних таблиць у базі даних.
- Для зберігання структури використовуються стандартні WordPress data structures:
  attachments, taxonomy relationships, options.

## What Happens If The Plugin Is Removed

- Усі створені папки WP Folders будуть видалені.
- Усі зв'язки файлів із папками WP Folders будуть видалені.
- Самі медіафайли не видаляються.
- Фізичні файли в `uploads` не видаляються.
- Існуючі URL файлів продовжують працювати.
- Якщо встановити плагін знову пізніше, папки доведеться створити заново.