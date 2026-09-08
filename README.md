# Google Analytics / Callgraph frontend

Фронтенд системы сквозной аналитики рекламы, звонков, заявок и прибыли.

## Стек

- React + TypeScript + Vite
- Tailwind CSS
- Zustand
- React Router
- Lucide React

## Запуск

```bash
npm install
npm run dev
```

Development использует `.env.development`, production-сборка — `.env.production`.

```bash
npm run build
npm run preview
```

## Структура

```text
src/
├── components/  переиспользуемые компоненты
├── layouts/     каркасы страниц
├── pages/       страницы приложения
├── services/    API и внешние сервисы
├── store/       Zustand-хранилища
├── types/       общие TypeScript-типы
├── App.tsx      маршруты
└── main.tsx     точка входа
```

`project-materials/` содержит локальные ТЗ, прототип и Jira-выгрузки. Каталог исключён из Git.

## API-контракт

Черновик OpenAPI первой очереди находится в [`docs/openapi.yaml`](docs/openapi.yaml). Правила пагинации, ролевого усечения данных, карта экранов и запуск мок-сервера описаны в [`docs/api-contract.md`](docs/api-contract.md).

## Git workflow

Используются три уровня веток:

```text
feature/* или fix/* → develop → main
hotfix/*              → main → develop
```

- `develop` — общая тестовая ветка; позднее будет разворачиваться в dev-окружение.
- `main` — стабильная версия; позднее будет разворачиваться в production.
- Прямые коммиты в `develop` и особенно в `main` не выполняются: изменения попадают в них только через Pull Request.

### Первоначальная настройка

После создания пустого репозитория на GitHub сделайте первый commit и push ветки `main`:

```bash
git add .
git commit -m "chore: initialize frontend application"
git remote add origin https://github.com/ORGANIZATION/google-analytics.git
git branch -M main
git push -u origin main
```

Затем создайте тестовую ветку:

```bash
git switch -c develop
git push -u origin develop
```

### Ветки задач

Создавайте ветку только от актуальной `develop`:

```bash
git switch develop
git pull origin develop
git switch -c feature/GA-123-calls-table
```

Используйте следующие форматы имён:

```text
feature/GA-123-short-name  новая функциональность
fix/GA-123-short-name      исправление в разработке
hotfix/GA-123-short-name   срочное исправление в production
```

После завершения задачи создайте Pull Request из `feature/*` или `fix/*` в `develop`.

### Формат коммитов

Сообщение коммита можно писать в свободной форме — на русском или английском. Главное, чтобы оно кратко и ясно объясняло изменение.

Например:

```bash
git commit -m "Добавил таблицу звонков"
git commit -m "Исправил сохранение фильтров в URL"
git commit -m "Настроил production-окружение"
git commit -m "Обновил описание Git workflow"
```

Один commit должен решать одну логически законченную задачу. Не используйте сообщения вроде `fix`, `changes`, `update` или `правки` без контекста.

### Проверка и Pull Request

Перед каждым commit выполните:

```bash
npm run lint
npm run build
git status
```

Затем отправьте ветку и создайте Pull Request:

```bash
git add .
git commit -m "feat: add calls table"
git push -u origin feature/GA-123-calls-table
```

В Pull Request кратко укажите, что изменено, как это проверить и номер задачи Jira. После проверки и merge в `develop` рабочую ветку можно удалить.

### Релиз и hotfix

Релиз создаётся Pull Request из `develop` в `main`. Перед merge проверьте тестовое окружение, `npm run lint` и `npm run build`.

Если production требует срочного исправления, создайте ветку от `main`:

```bash
git switch main
git pull origin main
git switch -c hotfix/GA-250-fix-auth
```

После merge Pull Request `hotfix/* → main` обязательно создайте второй Pull Request `main → develop`, чтобы исправление вернулось в тестовую ветку.

### Что не коммитим

Перед отправкой изменений всегда проверяйте `git status`. Не добавляйте в Git:

- `project-materials/` — локальные ТЗ, прототип и Jira-материалы;
- `.env.local`, `.env.*.local` и любые файлы с секретами;
- API-ключи, пароли, токены, приватные URL и файлы локальной IDE.

Переменные `VITE_*` попадают в браузер после сборки, поэтому секреты в них хранить нельзя.
