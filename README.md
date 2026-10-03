# finance-tracker

## Overview
    
This app provides an interface for personal finance management, allowing users to track income and expenses across multiple user-defined categories.
Income can be tracked alongside expenses, providing a clear overview of how much they've spent _and_ how much they've got left.

The app is a continuation of [kgr-finance](https://github.com/wbtag/kgr-finance).
The current implementation consists of a Next.js frontend and Django backend which leverages a PostgreSQL database.
The application is fully containerised, allowing for a quick and easy startup.

## Setup

### Prerequisites

- Docker with Docker Compose
- Node.js 24 (see `.nvmrc`) and pnpm (e.g. via `corepack enable`)
- Python 3.14 (dev only; production runs the API in a container)

Before the first run, copy `.env.example` to `.env` and `config.example.toml` to `config.toml` and fill in the values (see below).

### Configuration

The app relies on two configuration files, .env for secrets and config.toml for non-sensitive settings. 
Both files are located in the monorepo root. Example files for both are provided in the same location.

The expected values for each file are also provided here:

#### .env

```dotenv
DATABASE_HOST="localhost"
DATABASE_NAME="db"
DATABASE_USER="user"
DATABASE_PASSWORD="password"
DATABASE_BIND_ADDRESS="127.0.0.1 if unset"
DJANGO_SECRET_KEY="123secret"
DJANGO_ALLOWED_HOSTS="'localhost' for dev, 'api' for production"
DJANGO_CORS_ALLOWED_ORIGINS="'http://localhost:3000' for dev, e.g. 'https://financeapp.example.com' for prod"
FRONTEND_BIND_ADDRESS="127.0.0.1 if unset"
```

#### config.toml

```toml
[App]
name = 'Finance tracker' # this will be displayed in the app navbar

[Budgets]
month_start = 15 # date on which the monthly limit resets; must be between 1 and 28
sunday_week_start = false # if true, weekly limits reset on Sunday
# WARNING: changing sunday_week_start after the app has already been initialised will create inconsistencies
# in receipts' assignment to weeks (and also years for receipts logged around the end of the calendar year)
```

### Dev

The dev environment uses `concurrently` to launch a Next.js and Django dev server.
PostgreSQL runs in the `db` container from `docker-compose.yml`.

1. Run `pnpm install` in the project root. This also installs the frontend's dependencies.
2. Run `pnpm setup:api` to initialise the API's python venv and install its dependencies.
3. Run `pnpm dev`. This starts the `db` container, applies migrations, and launches both dev servers; the app is then available at `http://localhost:3000`.
4. Seed the database and create a user (see below).

`pnpm db:down` stops the database container.

### Production

1. Run `docker compose up -d --build` in the project root. Migrations are applied automatically whenever the API container starts.
2. On first launch, seed the database and create a user (see below).
3. Set up a reverse proxy in front of the frontend (see below).

To update the app, pull the new version and run `docker compose up -d --build` again.

Data lives in the `postgres_data` Docker volume, which survives rebuilds; note that `docker compose down -v` deletes it.
To back up the database, run:

```commandline
docker compose exec -T db pg_dump -U <DATABASE_USER> <DATABASE_NAME> > backup.sql
```

To restore a backup into an empty database, run `docker compose exec -T db psql -U <DATABASE_USER> <DATABASE_NAME> < backup.sql`.

#### Reverse proxy

The stack is meant to run behind a reverse proxy that terminates TLS. The proxy config is host-specific and not part of this repo, but it is expected to:

- **Terminate TLS** and proxy to the frontend (`127.0.0.1:3000` by default). The API need not be exposed.
- **Redirect HTTP to HTTPS.** Django's `SECURE_SSL_REDIRECT` is off by default.
- **Send HSTS.** Django's HSTS header is off by default.
- **Pass `X-Forwarded-Proto`**.

### Database seeding

In order for the app to function properly, the database needs to be seeded with categories and a starting balance. 
To run Django's seed script in a dev environment, execute `python api/finance/manage.py seed --categories <one or more category names> --balance <starting balance value>`.
In production, run the command with `docker compose exec api python manage.py seed ...`.

### Users

Django's default user model is used; multi-factor authentication is implemented using the `django_otp` library.

#### Multi-factor authentication 

Time-based one-time passwords (TOTP) are used for multi-factor authentication.
By default, MFA is disabled in the dev environment and enabled in production. 
MFA in the dev environment can be controlled via the `OTP_REQUIRED` env variable.

Disabling multi-factor authentication in production is only possible by editing Django's settings.
In `api/finance/finance/settings/prod.py`, set the following variable:

```python
OTP_REQUIRED = False
```

#### User creation

Currently, users can only be created via CLI.

Since Django's admin interface is not available for this application, it is recommended to create standard users.
You can leverage the `create_user` command for this purpose. 
However, if you need to create a superuser, use Django's built in `createsuperuser` command via manage.py.
After this, you will also need to create a TOTP device with `add_totp` (see below).

The `create_user` command is called with:

```commandline
python api/finance/manage.py create_user -u username -n "User's full name (optional)" --totp-name "TOTP device name (optional)"
```

By default, the `create_user` command also creates a TOTP device and prints an OTP link to stdout, along with a QR code of the link that can be scanned with an authenticator app.
If you want to create a user without a TOTP device (e.g. for development), pass the optional `--user-only` flag.

A separate `add_totp` command exists for adding TOTP devices. Call it with:

```commandline
python api/finance/manage.py add_totp -u username -n "TOTP device name (optional)"
```

## Application logic

The application is intended as a tool for one or more users who share a common budget. 
Each instance of the application should essentially represent one household.

### Categories

Categories represent areas of a household's spending. 
No predefined categories exist and users are free to manage categories according to their own needs.
However, at least one category must be defined in order for the application to function properly.

Each category has a weekly and monthly spending limit, which users can set according to their budget.
Additionally, categories have `is_misc` and `exclude_from_overview` flags (boolean), both false by default.

If a category has the `is_misc` flag, it is considered to be a miscellaneous category.
For the purposes of this application, spending for all miscellaneous categories is aggregated in the spend overview.
However, users are free to create a nominally miscellaneous category without this flag if this suits their case better.

The `exclude_from_overview` flag prevents the category from being reported in the spend overview.
Consequently, spending limits for such categories are ignored.
One example where this may be desirable is fixed spending (rent, utilities, subscriptions), which remains constant, and therefore does not need to be monitored as closely.
Generally, `is_misc` categories should also have the `exclude_from_overview` flag, as they are already reported as miscellaneous spending in the spend overview.

#### Editing category parameters

Currently, categories can only be edited directly in the database. An application-native interface is planned for v1.0.

### Receipts

Receipts document expenses across user-defined categories.
Users can also leverage descriptions and tags to specify and categorise the nature of the transaction. 
Two variants of receipts exist: basic and extended. 
Basic receipts can be used for monothematic expenses, i.e. a purchase of either one item or a group of items which do not require differentiation between themselves.
An example of a basic receipt use case would be a groceries purchase, where the user does not require differentiation between how much was spent on fruits, vegetables etc.
On the other hand, extended receipts allow users to record a more granular view of a particular purchase. 
In the groceries example, a user who wishes to track spending on fruits, vegetables, and other grocery subtypes can leverage an extended receipt to do so without having to create separate receipts for each item.

Alongside a description and a category, a user can also leverage tags for receipts.
Tags are not mandatory on the receipt level; they are intended as an optional means of differentiating between expenses in a category.

Each receipt must have a valid description (i.e. non-empty string) and an amount in the form of a positive integer.
The user must also set a valid date and assign the receipt to a category.

For extended receipts, additional rules apply: the sum of item amounts must be equal to the total receipt amount; 
additionally, unlike on the receipt level, tags are mandatory for items and each item must be assigned at least one tag.

#### Receipt date

Currently, only the receipt date can be specified when logging a new receipt. 
However, behind the scenes, receipt time is also tracked, mainly for the purpose of calculating a balance (see below).
Two options exist for time assignment:

* If a new receipt is created with today's date, it is saved with the current time.
* If a receipt is created with a past/future date, or its date is changed (including to today), time is set to local midnight according to the app's time zone setting (currently hardcoded to 'Europe/Prague')

### Income and balances

Users can also log income, allowing the application to track an estimated balance in real time. 
The estimate is the last user-recorded balance, plus all income and minus all expenses logged since that balance was recorded.

Since the app's estimation can diverge from reality as a result of omissions or mistakes, users can log balance updates.
These reset the estimation point, so that only receipts and income logged after the update are taken into account.
Updating a balance and then logging past receipts (i.e. not with today's date) will not affect the new balance estimation.
However, given how receipt time is calculated for same-day logging (see above), any receipts dated after the update will be taken into account for the new estimate.