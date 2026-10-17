# 🎮 CS2 Skin Marketplace — Backend

Площадка CS2-скинов: пользователи регистрируются, держат монеты на кошельке,
покупают скины, а администраторы управляют каталогом. На этом этапе сданы
**User / Case / Inventory / Transaction модели**, регистрация (bcrypt),
авторизация (JWT), auth- и admin-middleware.

## Стек

| Слой | Технология |
|------|-----------|
| HTTP | Express 5 |
| БД | MongoDB + Mongoose 9 |
| Пароли | bcryptjs (хеш, никогда не plaintext) |
| Токены | jsonwebtoken (JWT, секрет в `.env`) |
| Валидация | Joi (`src/validations/`) |
| Загрузка файлов | Multer (картинки до 5 МБ) |
| Frontend | React 19 + Vite (папка `client/`, интерфейс на узбекском) |

## Требования

- Node.js 18+
- MongoDB: локально (`mongod`) или облачный Atlas

## Установка и запуск

```bash
# 1) Зависимости
npm install

# 2) Переменные окружения
cp .env.example .env
# откройте .env и заполните:
#   MONGODB_URI  — строку подключения к MongoDB
#   JWT_SECRET   — длинный случайный секрет (обязательно!)
#                 например: openssl rand -hex 48
#                 без него сервер не стартует и напечатает подсказку

# 3) (опционально) наполнить базу скинами + создать админа
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ваш_пароль npm run seed
# пароли из окружения можно записать прямо в .env — тогда просто: npm run seed

# 4) Frontend (клиент)
npm --prefix client install
npm run client:build     # собирает client/dist

# 5) Запуск (backend + frontend вместе)
npm run dev              # разработка (nodemon)
npm start                # продакшн (node)
```

Сервер поднимается на `http://localhost:5432` (порт из `PORT`).

Проверка: откройте `http://localhost:5432/` — откроется интерфейс маркета.
JSON со списком эндпоинтов — по адресу `GET /api`.

### Роли

- `user` — обычный пользователь (назначается при регистрации);
- `admin` — может создавать/изменять/удалять скины.

Роль берётся из **проверенной записи в БД** (auth-middleware достаёт
пользователя по id из токена), а не из запроса клиента.
Создать первого админа: `npm run seed` с `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Эндпоинты

### Auth

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| POST | `/api/auth/register` | публичный | Регистрация: username, email, password (≥6). Пароль хешируется. |
| POST | `/api/auth/login` | публичный | Вход по email + password → `{ token, user }` |
| GET | `/api/auth/me` | Bearer | Текущий пользователь (восстановление сессии в UI) |

Использование токена:

```
Authorization: Bearer <token>
```

### Users

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| GET | `/api/users` | публичный* | Список пользователей (без пароля) |
| GET | `/api/users/:id` | публичный* | Один пользователь; неверный id → 400, нет записи → 404 |
| POST | `/api/users` | публичный* | Создание (только username/email/password) |
| PUT/PATCH | `/api/users/:id` | публичный* | Обновление **только** username/email/password; role и wallet изменить нельзя |
| DELETE | `/api/users/:id` | публичный* | Удаление |
| PATCH | `/api/users/:id/ban` | публичный* | Бан/разбан (toggle) |
| POST | `/api/users/:id/buy-skin` | публичный* | Покупка скина за wallet: `{ "skinId": "..." }` |
| POST | `/api/users/:id/sell-skin` | публичный* | Продажа (возврат 70%): `{ "skinId": "..." }` |
| POST | `/api/users/:id/deposit` | Bearer | Демо-пополнение: `{ "amount": 100 }` → пишет `Transaction` |

\* По условию (Часть 2) CRUD можно тестировать локально без авторизации.
**Перед публикацией API эти маршруты нужно закрыть auth + admin middleware.**

### Skins

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| GET | `/api/skins` | публичный | Каталог скинов |
| GET | `/api/skins/:id` | публичный | Один скин; неверный id → 400 |
| POST | `/api/skins` | **admin** | Создание (multipart: поля + `file`) |
| PUT/PATCH | `/api/skins/:id` | **admin** | Обновление, можно приложить новую картинку |
| DELETE | `/api/skins/:id` | **admin** | Удаление |

Без токена → `401`, с токеном не-админа → `403`.

### Keshlar (кейсы) / Inventar / Hamyon

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| GET | `/api/cases` | публичный | Список кейсов со вложенными скинами и `chance` |
| GET | `/api/cases/:id` | публичный | Один кейс; неверный id → 400, нет записи → 404 |
| POST | `/api/cases/:id/open` | Bearer | Открытие кейса: списывает `casePrice`, выбирает скин по `chance`, пишет `Inventory` + `Transaction` → `{ dropped, wallet, skins }` |
| GET | `/api/inventory` | Bearer | Инвентарь текущего пользователя (`status`, `page`, `limit`) |
| POST | `/api/inventory/:id/sell` | Bearer | Продажа записи инвентаря за 70% → `409`, если уже продана |
| GET | `/api/wallet` | Bearer | Баланс + история операций (`limit`) |

Отсутствие токена → `401`, недостаточно средств → `400`, кейс недоступен →
`409`, чужой инвентарь → `403`. Синхронизация: покупка через
`/api/users/:id/buy-skin` тоже создаёт запись `Inventory`, а продажа через
`sell-skin` помечает её `sold` и пишет `Transaction` — обе продажи (старая и
новая) ведут к одним и тем же записям, двойной продажи нет.

### Upload (Cloudinary)

| Метод | Путь | Доступ | Описание |
|-------|------|--------|----------|
| POST | `/api/upload` | публичный | multipart/form-data, поле `file` → Cloudinary URL |
| GET | картинка URL | публичный | Cloudinary CDN (rasm Cloudinary orqali yuklanadi) |

#### Cloudinary sozlash

1. [Cloudinary](https://cloudinary.com/) da bemalol hisob oching
2. Console → Settings → Account bo'ling
3. Quyidagi qiymatlarni `.env` fayliga qo'shing:
   ```
   CLOUDINARY_CLOUD_NAME=<cloud_name>
   CLOUDINARY_API_KEY=<api_key>
   CLOUDINARY_API_SECRET=<api_secret>
   ```
4. Server qayta ishga tushirin (`npm run dev`)

## Postman

Импортируйте файл
`postman/CS2-Skin-Marketplace.postman_collection.json`
(Postman → Import → File). Переменные `baseUrl`, `token`, `adminToken`,
`userId`, `skinId` заполняются автоматически тест-скриптами.

Порядок: **Auth → Register → Login (user) → Login (admin)** → дальше
Users / Skins / Upload / Negative tests.

## Структура проекта

```
src/
├── server.js              # приложение, роуты, обработчик ошибок
├── config/db.js           # подключение к MongoDB
├── models/
│   ├── user.model.js      # User: password (hash), role, wallet
│   ├── skins.model.js     # Skin (из прошлых уроков)
│   ├── case.model.js      # Case: skins[] с chance, сумма = 100%
│   ├── inventory.model.js # Inventory: user, skin, sourceCase, status, obtainedAt
│   └── transaction.model.js # Transaction: type, amount, balanceBefore/After
├── controllers/           # auth, users, skins, upload, cases, inventory, wallet
├── routes/                # auth, users, skins, upload, cases, inventory, wallet
├── middlewares/           # auth (JWT), admin (role), upload (multer), validate (Joi)
├── validations/           # auth, user, skin схемы Joi
├── utils/dbErrors.js      # распознавание дубликатов (E11000 → 409)
└── seeders/
    ├── seed.js            # 10 скинов + 3 кейса + опционально админ
    ├── seedCases.js       # только кейсы (без очистки скинов)
    └── cases.data.js      # определения кейсов и распределение chance
docs/FUTURE_API.md         # контракты маршрутов (реализовано)
postman/                   # коллекция для проверки
```

## Модели (связи)

- **User** — `password` (bcrypt, `select: false`), `role` (enum), `wallet ≥ 0`,
  связь `skins[] → Skin` (из прошлых уроков);
- **Case** — `skins: [{ skin → Skin, chance 0..100 }]`, проверка суммы
  вероятностей = 100% на уровне модели;
- **Inventory** — `user → User`, `skin → Skin`, `sourceCase → Case`,
  `status: owned | sold`, `obtainedAt`. Отдельный документ на каждый
  экземпляр: иначе нельзя хранить историю (сколько раз выпал, когда,
  из какого кейса) и статус «продан»;
- **Transaction** — `type: deposit | case_open | skin_sale`, `amount > 0`,
  `balanceBefore/After ≥ 0` + проверка, что изменение баланса соответствует
  типу операции. Аудит денежных операций.

## Кейсы, инвентарь и кошелёк (реализовано)

`GET /api/cases`, `GET /api/cases/:id`, `POST /api/cases/:id/open`,
`GET /api/inventory`, `POST /api/inventory/:id/sell`, `GET /api/wallet` —
**работают**: кейс открывается, `casePrice` списывается с `wallet` (атомарная
проверка баланса), скин выбирается по `chance`, запись попадает в
`Inventory`, операция — в `Transaction`. Продажа возвращает 70%.
Контракты запросов/ответов: [docs/FUTURE_API.md](docs/FUTURE_API.md).

## Чек-лист ДЗ

- [x] Модель User (`src/models/user.model.js`)
- [x] CRUD пользователей (`src/routes/users.routes.js`, 400/404/409)
- [x] Регистрация с хешированием пароля (bcryptjs, `pre('save')` hook)
- [x] Авторизация через JWT (`POST /api/auth/login`)
- [x] Middleware авторизации (`src/middlewares/auth.middleware.js`)
- [x] Middleware администратора (`src/middlewares/admin.middleware.js`)
- [x] Модель Case со связями и вероятностями (сумма = 100%)
- [x] Модели Inventory и Transaction
- [x] Открытие кейса, инвентарь, продажа и кошелёк (`src/routes/cases.routes.js` и др.)
- [x] Postman-запросы (`postman/CS2-Skin-Marketplace.postman_collection.json`)
- [x] Код без `node_modules`, секретов и реального `.env` (`.env` в `.gitignore`)
- [x] README с инструкцией запуска (этот файл)

## Frontend (`client/`)

Красивый тёмный интерфейс в стиле CS2 (React + Vite, всё на узбекском):

- **Katalog** — витрина скинов: поиск, фильтры по редкости, покупка;
- **Inventar** — купленные и выпавшие из кейсов скины (откуда и когда
  получен), продажа за 70%;
- **Keshlar** — три кейса из базы: открывается, тратит баланс, анимация
  выпавшего скина и переход в инвентарь;
- **Boshqaruv** — админ-панель: CRUD скинов с загрузкой картинок, CRUD
  пользователей, бан/разбан;
- **Hamyon** — баланс в шапке, демо-пополнение (создаёт `Transaction`);
- авторизация/регистрация, toast-уведомления, адаптивная вёрстка.

Режимы работы:

```bash
npm run client:build   # собрать клиент в client/dist (Express отдаст его на /)
npm run client:dev     # отдельный терминал: Vite dev-сервер на :5173
                       # (проксирует /api и /uploads на :5432)
```

Production-вариант: `npm run client:build` → `npm start` → всё работает
на одном порту `5432`.

## Полезные команды

```bash
npm run seed        # очистить и наполнить skins + кейсы (+ admin, если заданы ADMIN_*)
npm run seed:cases  # пересоздать только кейсы (скины не трогает)
npm run dev         # сервер с автоперезагрузкой
npm start           # сервер без nodemon
npm run client:dev  # Vite dev-сервер (HMR) для frontend
npm run client:build# сборка frontend в client/dist
```
