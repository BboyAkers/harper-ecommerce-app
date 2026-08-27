# harper-ecommerce-app

Your new app is now ready for development!

Here's what you should do next:

## Installation

To get started, make sure you have [installed Harper](https://docs.harperdb.io/docs/deployments/install-harper):

```sh
npm install -g harper
```

## Development

Then you can start your app:

```sh
npm run dev
```

TypeScript is supported at runtime in Node.js through [type stripping](https://nodejs.org/api/typescript.html#type-stripping). Full TypeScript language support can be enabled through integrating third party build steps to transpile your TypeScript into JavaScript.

### Define Your Schema

1. Create a new yourTableName.graphql file in the [schemas](./schemas) directory.
2. Craft your schema by hand.
3. Save your changes.

These schemas are the heart of a great Harper app, specifying which tables you want and what attributes/fields they should have. Any table you `@export` stands up [endpoints automatically](./.agents/skills/harper-best-practices/rules/automatic-apis.md).

### Add Custom Endpoints

1. Create a new greeting.ts file in the [resources](./resources) directory.

2. Customize your resource:

   ```typescript
   import { type RecordObject, type RequestTargetOrId, Resource } from 'harper';

   interface GreetingRecord {
   	greeting: string;
   }

   export class Greeting extends Resource<GreetingRecord> {
   	static loadAsInstance = false;

   	async post(
   		target: RequestTargetOrId,
   		newRecord: Partial<GreetingRecord & RecordObject>,
   	): Promise<GreetingRecord> {
   		// By default, only super users can access these endpoints.
   		return { greeting: 'Greetings, post!' };
   	}

   	async get(target?: RequestTargetOrId): Promise<GreetingRecord> {
   		// But if we want anyone to be able to access it, we can turn off the permission checks!
   		target.checkPermission = false;
   		return { greeting: 'Greetings, get! ' + process.version };
   	}

   	async put(
   		target: RequestTargetOrId,
   		record: GreetingRecord & RecordObject,
   	): Promise<GreetingRecord> {
   		target.checkPermission = false;
   		if (this.getCurrentUser()?.name?.includes('Coffee')) {
   			// You can add your own authorization guards, of course.
   			return new Response('Coffee? COFFEE?!', { status: 418 });
   		}
   		return { greeting: 'Sssssssssssssss!' };
   	}

   	async patch(
   		target: RequestTargetOrId,
   		record: Partial<GreetingRecord & RecordObject>,
   	): Promise<GreetingRecord> {
   		return { greeting: 'We can make this work!' };
   	}

   	async delete(target: RequestTargetOrId): Promise<boolean> {
   		return true;
   	}
   }
   ```

3. Save your changes.

### View Your Website

Pop open [http://localhost:9926](http://localhost:9926) to view [index.html](./index.html) in your browser.

### Use Your API

Test your application works by querying the `/Greeting` endpoint:

```sh
curl http://localhost:9926/Greeting
```

You should see the following:

```json
{ "greeting": "Hello, world!" }
```

### Configure Your App

Take a look at the [default configuration](./config.yaml), which specifies how files are handled in your application.

## Seeding demo data

The catalog seeds itself. `config.yaml`'s `dataLoader` upserts
[`data/products.json`](./data/products.json) on every boot, so six products are live as soon as
Harper starts.

Everything else a demo needs cannot be declared as table records — shoppers live in Harper's
built-in `users` table, orders have to be _placed_ so that `Order.post` prices them from the
catalog, and a cart is keyed by a username that must exist first. One script covers all three:

```sh
npm run seed
```

It drives the app's own endpoints (`/SignUp`, `/SignIn`, `/Order`, `/Cart/<username>`) over HTTP,
so a successful run doubles as a smoke test of the validation, pricing and inventory paths. It
needs no configuration against a local `npm run dev`, and it is safe to re-run — every step checks
before it writes.

You get two shoppers with order history, one of them with a saved server-side cart:

| Account        | Password                | Has                                            |
| :------------- | :---------------------- | :--------------------------------------------- |
| `ada.lovelace` | `correct-horse-battery` | two orders                                     |
| `grace.hopper` | `correct-horse-battery` | one order, plus a saved cart                   |
| `editor.demo`  | `correct-horse-battery` | the `editor` role (admin credentials required) |

Two steps need super_user, because `/SignUp` hard-codes the customer role on purpose — a
self-serve endpoint must never be able to mint a privileged account. Set
`HARPER_ADMIN_USERNAME` and `HARPER_ADMIN_PASSWORD` to create the editor account and to enable:

```sh
npm run seed -- --reset-stock
```

That re-asserts the stock levels `data/products.json` declares. It has its own flag because
restarting Harper will _not_ do it: `dataLoader` skips records whose content hash still matches
the file, and placing orders changes the table without changing the file. So once a demo has
drained inventory, only an explicit write puts the sold-out and low-stock products back.

`npm run seed -- --help` lists every environment variable.

## Deployment

When you are ready, head to [https://fabric.harper.fast/](https://fabric.harper.fast/), log in to your account, and create a cluster.

Come back and log in your local CLI to your cluster:

```sh
harper login
```

Then you can deploy your app to your cluster:

```sh
npm run deploy
```

### Deploying from CI

`.github/workflows/deploy.yaml` deploys on every push to `main`. A runner has no saved
`harper login` token and no `.env`, so it authenticates from two repository secrets. Generate
both and store them in one step:

```sh
harper login --for-ci | gh secret set --env-file -
```

That prints `HARPER_CLI_TARGET` and `HARPER_CLI_REFRESH_TOKEN` on stdout in dotenv format and
nothing else, so the token never reaches your screen or your shell history. The refresh token is
the durable credential — the CLI mints a short-lived operation token from it on each run — so it
is the only one that needs rotating. Log in as a user dedicated to CI rather than your own
account, so revoking it costs you nothing.

## Keep Going!

For more information about getting started with Harper and building applications, see our [getting started guide](https://docs.harperdb.io/docs).

For more information on Harper Components, see the [Components documentation](https://docs.harperdb.io/docs/reference/components).
