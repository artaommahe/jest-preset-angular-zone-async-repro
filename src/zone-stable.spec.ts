import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { first } from 'rxjs';

// The router's navigation pipeline is native `async` in Angular 22. When
// esbuild leaves it untranspiled (es2022), zone.js cannot track the awaits, so
// NgZone reports "no pending microtasks" while the navigation is still running.
describe('NgZone tracking of the router navigation pipeline', () => {
  it('NgZone becomes stable only after the initial navigation has finished', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    const zone = TestBed.inject(NgZone);
    const router = TestBed.inject(Router);

    const navigatedWhenStable = new Promise<boolean>((resolve) => {
      zone.onStable.pipe(first()).subscribe(() => resolve(router.navigated));
    });

    zone.run(() => router.initialNavigation());

    expect(await navigatedWhenStable).toBe(true);
  });
});
