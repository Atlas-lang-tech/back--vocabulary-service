# Frontend Guide — Vocabulary Service

Інструкція для фронтенду: як працювати з backend-API словників, слів і міні-ігор
(spaced-repetition). Сервіс на NestJS, дані — PostgreSQL + Redis.

---

## 1. Базове

- **Base URL:** `http://localhost:3000` (порт із `PORT`, дефолт `3000`).
- **Глобальний префікс:** усі маршрути під `/api/vocabulary/...`.
- **Swagger / OpenAPI:** `http://localhost:3000/docs`.
- **CORS:** дозволені origin'и `http://localhost:5173` і `https://example.com`
  (методи GET/HEAD/PUT/PATCH/POST/DELETE, `credentials: true`). Якщо фронт крутиться
  на іншому порту — додати його в `src/common/setup-app.ts → enableCors`.
- **Content-Type:** для POST/PATCH завжди `application/json`.

### Авторизація

Auth-гарда на платформі **поки немає**. Розділення `public/*` (читання) та `private/*`
(зміни) — лише конвенція маршрутизації, не захист. Власника визначає поле **`userId`**
(UUID), яке фронт передає сам:

- Створення/редагування/видалення словника вимагає `userId` (перевіряється, що він
  збігається з власником словника — інакше `403`).
- Операції зі словами та міні-іграми `userId` **не перевіряють** (поки немає auth).

---

## 2. Формат відповіді (envelope)

**Кожна** успішна відповідь обгорнута однаково:

```json
{
  "code": 200,
  "message": "Success",
  "data": <корисні дані: об'єкт або масив>
}
```

- `code` = HTTP-статус (`200`, `201` тощо).
- Корисні дані завжди в `data`. Якщо повертати нічого — `data: {}`.

> На фронті зручно мати обгортку, що одразу дістає `.data`:
> ```ts
> async function api<T>(path: string, init?: RequestInit): Promise<T> {
>   const res = await fetch(`http://localhost:3000/api/vocabulary${path}`, {
>     headers: { 'Content-Type': 'application/json' },
>     ...init,
>   });
>   const body = await res.json();
>   if (!res.ok) throw new ApiError(body.code, body.message);
>   return body.data as T;
> }
> ```

### Формат помилки

Та сама форма, `data` порожній:

```json
{ "code": 404, "message": "Word with id 99 not found", "data": {} }
```

Типові коди:

| Код | Коли |
|-----|------|
| `400` | Невалідне тіло (порушені правила DTO) або помилка БД |
| `403` | `userId` не збігається з власником словника |
| `404` | Запис не знайдено |
| `409` | Порушення унікальності (Prisma `P2002`) |
| `500` | Інше |

> `ValidationPipe` працює в режимі **whitelist** — невідомі поля в тілі **мовчки
> відкидаються**. Надсилайте лише задокументовані поля.

---

## 3. Словники (Dictionaries)

Сутність:

```ts
interface Dictionary {
  id: number;
  userId: string; // UUID власника
  title: string;
  icon: string;
}
```

### Маршрути

| Метод | Шлях | Опис |
|-------|------|------|
| `POST`   | `/private/dictionaries`            | Створити словник |
| `GET`    | `/private/dictionaries`            | Усі словники (всіх користувачів) |
| `PATCH`  | `/private/dictionaries/:id`        | Оновити (тільки власник) |
| `DELETE` | `/private/dictionaries/:id?userId=<uuid>` | Видалити (тільки власник) |
| `GET`    | `/public/dictionaries/user/:userId` | Словники конкретного користувача |
| `GET`    | `/public/dictionaries/:id`         | Один словник |

### Тіла запитів

**POST** `/private/dictionaries`:
```json
{ "userId": "11111111-1111-1111-1111-111111111111", "title": "Verbs", "icon": "book" }
```
- `userId` — валідний UUID; `title`, `icon` — непорожні рядки.

**PATCH** `/private/dictionaries/:id`:
```json
{ "userId": "11111111-1111-1111-1111-111111111111", "title": "Phrasal verbs" }
```
- `userId` **обов'язковий** (для перевірки власника); `title`, `icon` — опціональні.

**DELETE** — `userId` передається **query-параметром**, не в тілі:
`DELETE /private/dictionaries/5?userId=1111...`. Відповідь:
```json
{ "code": 200, "message": "Success", "data": { "message": "Dictionary deleted successfully" } }
```

> Видалення словника **каскадно** видаляє всі його слова й денні сесії.

---

## 4. Слова (Words)

Сутність (поля прогресу `points`/`level`/`nextReviewAt` керує backend — фронт їх читає,
але напряму не виставляє):

```ts
interface Word {
  id: number;
  dictionaryId: number;
  word: string;
  translation: string;
  transcription: string | null;
  example: string | null;
  description: string | null;

  // Прогрес вивчення (керує backend через міні-ігри):
  points: number;                       // старт 0
  level: 'NEW' | 'LEARNING' | 'MASTERED';
  lastStudiedAt: string | null;         // ISO datetime
  nextReviewAt: string | null;          // ISO datetime; null = ще не вивчалось
}
```

### Маршрути

| Метод | Шлях | Опис |
|-------|------|------|
| `POST`   | `/private/words`                     | Створити слово |
| `GET`    | `/private/words`                     | Усі слова |
| `PATCH`  | `/private/words/:id`                 | Оновити вміст слова |
| `DELETE` | `/private/words/:id`                 | Видалити слово |
| `GET`    | `/public/words/dictionary/:dictionaryId` | **Усі слова словника** |
| `GET`    | `/public/words/:id`                  | Одне слово |

### Тіла запитів

**POST** `/private/words`:
```json
{
  "dictionaryId": 5,
  "word": "run",
  "translation": "бігти",
  "transcription": "rʌn",
  "example": "I run every morning.",
  "description": "дієслово руху"
}
```
- `dictionaryId` (число) і `word`, `translation` — обов'язкові.
- `transcription`, `example`, `description` — опціональні.
- Якщо `dictionaryId` не існує → `404`.
- `points`/`level`/`nextReviewAt` **не передаються** — стартують з `0` / `NEW` / `null`.

**PATCH** `/private/words/:id` — будь-яке з контент-полів (`word`, `translation`,
`transcription`, `example`, `description`), усі опціональні. `dictionaryId` змінити не
можна (слово не переноситься між словниками), очки/рівень через цей маршрут не редагуються.

**DELETE** `/private/words/:id` → `data: { "message": "Word deleted successfully" }`.

> Для звичайних списків слів використовуйте `GET /public/words/dictionary/:dictionaryId`.
> Для режиму **вивчення** — окремий study-API нижче (він сам відбирає, що показувати сьогодні).

---

## 5. Міні-ігри / Вивчення (Study)

### Як це працює

1. Кожне слово має **очки** (`points`) і **рівень** (`level`), що з них походить:
   - `0–49` → **NEW**, `50–99` → **LEARNING**, `100+` → **MASTERED**.
2. Backend планує, коли слово знову з'явиться (`nextReviewAt`): нові слова — щодня,
   вивченіші — рідше (інтервал росте з очками).
3. Раз на день на **кожен словник** збирається **денний пул — максимум 25 слів**
   (ті, що «настали» за датою + зовсім нові, з пріоритетом найменш вивчених).
4. Пул **зафіксований на весь день**: користувач нескінченно ганяє ці ж слова через
   будь-які з 5 міні-ігор. Слова, що не влізли в 25, переносяться на наступні дні.
5. За кожну відповідь у грі: правильно → **+1 очко**, неправильно → **−1** (не нижче 0).
   Backend сам перераховує рівень і дату наступного показу.

### Маршрути

| Метод | Шлях | Опис |
|-------|------|------|
| `GET`  | `/private/study/:dictionaryId/session` | Денний пул (≤25 слів) для словника |
| `POST` | `/private/study/answer`                | Зарахувати відповідь у грі |

**GET** `/private/study/:dictionaryId/session` → масив `Word[]` (повні об'єкти з усіма
полями, щоб фронт міг побудувати будь-яку гру і **сам перевірити відповідь локально**).
Перший виклик за день збирає й фіксує пул; наступні повертають той самий набір.
Якщо словник не існує → `404`. Якщо нема що вчити — порожній масив `[]`.

**POST** `/private/study/answer`:
```json
{ "wordId": 7, "correct": true }
```
- `wordId` (число), `correct` (boolean) — обов'язкові.
- Повертає оновлене `Word` (нові `points`, `level`, `nextReviewAt`, `lastStudiedAt`).
- Слово **лишається** в сьогоднішньому пулі (зміна дати впливає лише на майбутні дні).

### 5 міні-ігор — усі будуються з одного `session`

Перевірка відповідей і генерація варіантів — **на фронті**. Backend дистрактори не дає.

| Гра | Що показати | Як перевірити (на фронті) |
|-----|-------------|----------------------------|
| **Flashcards** | `word` → перевернути → `translation` | Самооцінка «знаю / не знаю» |
| **Multiple choice** | `word` + 4 варіанти | Правильний — `translation`; 3 дистрактори — випадкові `translation` з інших слів пулу |
| **Typing** | `word` | Звірити ввід із `translation` (нормалізувати регістр/пробіли) |
| **Matching** | пачка 5–6 слів | З'єднати `word` ↔ `translation` |
| **Example (cloze)** | `example` із `word`, заміненим на `___` | Звірити ввід зі словом `word`. Брати лише слова, де `example` заповнений |

> Дистрактори/пари беріть із того ж масиву `session` — нічого додатково смикати не треба.

### Типовий цикл гри (фронт)

```ts
// 1. На вході в режим вивчення словника:
const pool: Word[] = await api(`/private/study/${dictionaryId}/session`);

// 2. Користувач грає в будь-яку з 5 ігор по словах із pool.
//    Після кожної відповіді:
const updated: Word = await api('/private/study/answer', {
  method: 'POST',
  body: JSON.stringify({ wordId: word.id, correct }),
});

// 3. pool лишається тим самим весь день — можна нескінченно міняти ігри
//    й проходити ці ж слова. Локально оновлюйте points/level зі `updated`
//    для UI-прогресу.
```

---

## 6. Швидка пам'ятка по полях

| Поле слова | Хто виставляє | Призначення |
|-----------|----------------|-------------|
| `word`, `translation` | фронт (CRUD) | основна пара для всіх ігор |
| `transcription` | фронт (CRUD) | показ вимови |
| `example` | фронт (CRUD) | гра Example (cloze) |
| `description` | фронт (CRUD) | додаткова нотатка/підказка |
| `points`, `level` | **backend** | прогрес; для UI (бейджі, прогрес-бари) |
| `nextReviewAt`, `lastStudiedAt` | **backend** | планування повторень; можна показувати «коли далі» |

Фронт **не** надсилає `points`/`level`/`nextReviewAt` при створенні/оновленні слова —
ними керує лише study-API через `answer`.
