# Будущие маршруты (следующий этап)

> **Статус:** маршруты **реализованы** и работают:
> `src/routes/cases.routes.js`, `src/routes/inventory.routes.js`,
> `src/routes/wallet.routes.js` (+ контроллеры с теми же именами).
> Ниже — контракты: какие данные маршруты принимают и возвращают;
> дополнительные поля помечены примечаниями.

Базовый URL: `http://localhost:5432`

Все маршруты, кроме `GET /api/cases` и `GET /api/cases/:id`, требуют
заголовок авторизации:

```
Authorization: Bearer <token>     # token выдаёт POST /api/auth/login
```

Формат ошибок (единый для всех):

```json
{
  "success": false,
  "message": "Человекочитаемое описание ошибки"
}
```

---

## 1. `GET /api/cases` — список кейсов

**Назначение:** каталог кейсов для витрины.

**Запрос:** без тела, без параметров.

**Ответ `200`:**

```json
{
  "success": true,
  "cases": [
    {
      "_id": "652f1c2e8a3f2b0012345678",
      "caseName": "Кейс «Новичок»",
      "casePrice": 100,
      "imageUrl": "/uploads/case-beginner.png",
      "isAvailable": true,
      "skins": [
        { "skin": { "_id": "...", "skinName": "MP9 | Featherweight", "skinPrice": 1.49 }, "chance": 40 },
        { "skin": { "_id": "...", "skinName": "AWP | Dragon Lore", "skinPrice": 2450 }, "chance": 1 }
      ],
      "createdAt": "2026-10-15T10:00:00.000Z"
    }
  ]
}
```

**Ошибки:** `500` — сбой чтения из MongoDB.

---

## 2. `GET /api/cases/:id` — информация о кейсе

**Запрос:** параметр пути `id` (ObjectId кейса).

**Ответ `200`:**

```json
{
  "success": true,
  "case": { "_id": "...", "caseName": "Кейс «Новичок»", "casePrice": 100, "skins": [ ... ] }
}
```

**Ошибки:**

| Код | Когда |
|-----|-------|
| `400` | `id` не является корректным ObjectId |
| `404` | Кейс с таким id не найден |
| `500` | Сбой чтения |

---

## 3. `POST /api/cases/:id/open` — открытие кейса ✅

**Статус:** реализовано (`src/controllers/cases.controller.js`).

**Запрос:**

- заголовок: `Authorization: Bearer <token>` (требуется, иначе `401`);
- тело: пустое — `{}`.

**Логика, которая будет реализована (на моделях уже готова):**

1. Найти кейс, проверить `isAvailable` (иначе `409`/`404`);
2. Проверить `wallet >= casePrice` (иначе `400`, недостаточно монет);
3. Выбрать скин по вероятностям `chance` (сумма = 100%, проверяется на уровне модели `Case`);
4. Списать `casePrice` из `wallet`, создать запись `Inventory { user, skin, sourceCase, status: "owned", obtainedAt }`;
5. Создать `Transaction { type: "case_open", amount, balanceBefore, balanceAfter }`.

**Ожидаемый ответ `200`:**

```json
{
  "success": true,
  "message": "Кейс открыт",
  "dropped": {
    "_id": "id записи Inventory",
    "skin": { "_id": "...", "skinName": "USP-S | Kill Confirmed", "skinRarity": "Legendary", "skinPrice": 165 },
    "sourceCase": "...",
    "status": "owned",
    "obtainedAt": "2026-10-15T12:00:00.000Z"
  },
  "wallet": 900,
  "transaction": { "type": "case_open", "amount": 100, "balanceBefore": 1000, "balanceAfter": 900 }
}
```

**Ошибки:** `400` — недостаточно средств / некорректный id, `401` — нет токена,
`404` — кейс не найден, `409` — кейс недоступен (или в кейсе нет скинов),
`403` — пользователь забанен.

Дополнительно в ответ возвращается `skins: [...]` — актуальный массив
`user.skins` (id), чтобы клиент сразу обновил значок «Сizda bor» в каталоге.
Списание баланса атомарное (`wallet >= price` в условии update) — параллельные
открытия не могут увести баланс в минус. Если запись `Inventory`/`Transaction`
создать не удалось, деньги возвращаются на счёт.

---

## 4. `GET /api/inventory` — инвентарь текущего пользователя ✅

**Статус:** реализовано (`src/controllers/inventory.controller.js`).

**Запрос:**

- заголовок: `Authorization: Bearer <token>` (обязателен, иначе `401`);
- query-параметры (опционально):
  - `status=owned|sold` — фильтр по статусу (по умолчанию `owned`);
  - `page=1&limit=20` — пагинация.

**Текущий пользователь берётся из токена**, а не из тела запроса.

**Ответ `200`:**

```json
{
  "success": true,
  "count": 2,
  "items": [
    {
      "_id": "id записи Inventory",
      "skin": { "_id": "...", "skinName": "AK-47 | Redline", "skinRarity": "Epic", "skinPrice": 24.99, "skinImage": "/uploads/1718.avif" },
      "sourceCase": { "_id": "...", "caseName": "Кейс «Новичок»" },
      "status": "owned",
      "obtainedAt": "2026-10-15T12:00:00.000Z"
    }
  ]
}
```

**Ошибки:** `401` — нет/неверный токен, `500` — сбой чтения.

`count` — общее число записей по фильтру (не длина `items`); в ответе также
есть `page`, `limit`, `status`. Сортировка — от новых к старым.

---

## 5. `POST /api/inventory/:id/sell` — продажа скина ✅

**Статус:** реализовано (запись `owned -> sold` переключается атомарно,
поэтому один и тот же скин нельзя продать дважди — параллельный запрос
получит `409`).

**Запрос:**

- заголовок: `Authorization: Bearer <token>` (обязателен);
- параметр пути: `id` — **id записи Inventory** (не Skin!);
- тело: пустое — `{}`.

**Логика:**

1. Найти запись `Inventory`, проверить, что она принадлежит текущему пользователю (иначе `403`);
2. Проверить `status === "owned"` (иначе `409` — уже продан);
3. Начислить в `wallet` 70% от `skinPrice`;
4. Поставить `status: "sold"`;
5. Создать `Transaction { type: "skin_sale", amount, balanceBefore, balanceAfter }`.

**Ответ `200`:**

```json
{
  "success": true,
  "message": "Скин продан",
  "earned": 17.49,
  "wallet": 1017.49,
  "item": { "_id": "...", "status": "sold" },
  "transaction": { "type": "skin_sale", "amount": 17.49, "balanceBefore": 1000, "balanceAfter": 1017.49 }
}
```

**Ошибки:** `400` — некорректный id, `401` — нет токена, `403` — чужой инвентарь,
`404` — запись не найдена, `409` — уже продана.

Дополнительно: из `user.skins` удаляется id скина (если других экземпляров
нет), в ответ добавлен `skins: [...]` для обновления каталога.

---

## 6. `GET /api/wallet` — баланс пользователя ✅

**Статус:** реализовано (`src/controllers/wallet.controller.js`).

**Запрос:**

- заголовок: `Authorization: Bearer <token>` (обязателен);
- query: `limit=10` — сколько последних операций вернуть (опционально).

**Ответ `200`:**

```json
{
  "success": true,
  "wallet": 1000,
  "transactions": [
    { "type": "deposit", "amount": 1000, "balanceBefore": 0, "balanceAfter": 1000, "createdAt": "..." }
  ]
}
```

**Ошибки:** `401` — нет/неверный токен, `404` — пользователь не найден.

---

## Сводка

| Метод | Путь | Auth | Тело запроса | Успех |
|-------|------|------|--------------|-------|
| GET | `/api/cases` | нет | — | `200` список кейсов |
| GET | `/api/cases/:id` | нет | — | `200` кейс |
| POST | `/api/cases/:id/open` | Bearer | `{}` | `200` выпавший скин + wallet |
| GET | `/api/inventory` | Bearer | — | `200` список записей |
| POST | `/api/inventory/:id/sell` | Bearer | `{}` | `200` продажа + wallet |
| GET | `/api/wallet` | Bearer | — | `200` баланс + история |

> Все шесть маршрутов реализованы и покрыты сквозной проверкой
> (открытие → инвентарь → продажа → баланс + история `Transaction`).
