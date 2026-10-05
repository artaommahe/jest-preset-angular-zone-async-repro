import {
  Component,
  EnvironmentInjector,
  Input,
  NgZone,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

const seenByRootEffect: string[] = [];

@Component({ selector: 'app-probe', template: '' })
class ProbeComponent {
  @Input() departmentId = '';

  constructor() {
    runInInjectionContext(inject(EnvironmentInjector), () =>
      effect(() => seenByRootEffect.push(this.departmentId)),
    );
  }
}

// Same sequence as @testing-library/angular's render(): start the initial
// navigation inside the Angular zone, continue a few zone-aware promise hops
// later, then create an auto-detecting fixture and set its inputs.
describe('root effect first run vs. input assignment', () => {
  it('runs the root effect after the inputs are set', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ComponentFixtureAutoDetect, useValue: true },
      ],
    });

    const zone = TestBed.inject(NgZone);
    const router = TestBed.inject(Router);

    zone.run(() => router.initialNavigation());

    const fixture = await Promise.resolve()
      .then(() => undefined)
      .then(() => undefined)
      .then(() => {
        const created = TestBed.createComponent(ProbeComponent);

        created.componentRef.setInput('departmentId', 'd1');

        return created;
      });

    await fixture.whenStable();

    expect(seenByRootEffect[0]).toBe('d1');
  });
});
