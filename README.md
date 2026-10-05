# jest-preset-angular 17.0.1 zone.js regression repro

jest-preset-angular 17.0.1 ([#3957](https://github.com/thymikee/jest-preset-angular/pull/3957)) changed the esbuild `target` used for `.mjs` files in `build/ng-jest-transformer.js` from `es2016` to `es2022`. Native `async`/`await` in Angular packages is no longer downleveled, and zone.js cannot track native `await`. Under `setupZoneTestEnv()` the Angular zone loses track of work that is still running.

The router's navigation pipeline in Angular 22 is native `async`. On 17.0.1, `NgZone` reports no pending microtasks one hop after `router.initialNavigation()`, while the navigation is still in flight. On 17.0.0 it stays unstable until the navigation finishes. That changes when the first `ApplicationRef.tick` happens. In `@testing-library/angular`'s `render()`, the first tick (and so the first flush of root effects) now happens before the inputs are set.

## Run

```sh
npm install
npm test
```

## Specs

| Spec | What it checks | 17.0.0 | 17.0.1 |
| --- | --- | --- | --- |
| `src/zone-stable.spec.ts` | `router.navigated` is `true` when `NgZone.onStable` first fires after `zone.run(() => router.initialNavigation())` | pass | fail (`false`) |
| `src/root-effect-input.spec.ts` | Plain TestBed, no Testing Library. Start the initial navigation, wait 3 zone-aware promise hops, create an auto-detecting fixture, then `setInput`. The first run of a root effect sees the input. | pass | fail (sees `""`) |
| `src/testing-library.spec.ts` | `render(Cmp, { inputs })`, then set a root signal. A root effect that reads the signal only once `@Input() departmentId` is set should show the element. | pass | fail (element never appears) |

Expected: all 3 specs pass.
Actual on 17.0.1: all 3 fail.

## 17.0.0 vs 17.0.1

Change only the `jest-preset-angular` version:

```sh
npm install --no-save -E jest-preset-angular@17.0.0 && npm test   # Tests: 3 passed, 3 total
npm install --no-save -E jest-preset-angular@17.0.1 && npm test   # Tests: 3 failed, 3 total
```

(`npm test` runs `jest --no-cache`.)

## Confirming the cause

On 17.0.1, change `node_modules/jest-preset-angular/build/ng-jest-transformer.js` (line 62) from

```js
target: compilerOpts.target === configSet.compilerModule.ScriptTarget.ES2015 ? 'es2015' : 'es2022',
```

to `... : 'es2016'`. Result: `Tests: 3 passed, 3 total`.

Downleveling only some packages (es2016 when `filePath` matches, es2022 otherwise):

| es2016 for | zone-stable | root-effect-input | testing-library |
| --- | --- | --- | --- |
| `@angular/router/` only | pass | pass | fail |
| `@testing-library/angular/` only | fail | fail | fail |
| both | pass | pass | pass |

The Testing Library spec needs both packages because `render()`'s own `await`s (`await createComponent()` → `await ApplicationInitStatus.donePromise`) decide how many microtask hops run between `initialNavigation()` and `TestBed.createComponent()`.

## Environment

- macOS 27.0.1 (Darwin 27.0.0, arm64), Node v26.8.1, npm 11.19.0
- @angular/core, common, compiler, compiler-cli, platform-browser, router: 22.1.7
- zone.js 0.16.3, rxjs 7.8.2, typescript 6.0.3
- jest 30.5.2, jest-environment-jsdom 30.5.2 (jsdom 30.1.2), ts-jest 29.4.14, esbuild 0.28.2
- @testing-library/angular 19.5.0, @testing-library/dom 10.4.2, @testing-library/jest-dom 7.0.1
