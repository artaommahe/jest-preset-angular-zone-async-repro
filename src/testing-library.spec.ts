import {
  Component,
  EnvironmentInjector,
  Injectable,
  Input,
  effect,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';

@Injectable({ providedIn: 'root' })
class LockService {
  readonly lockedIds = signal<string[]>([]);
}

@Component({
  selector: 'app-shift',
  template: `@if (isLocked()) {
    <span role="img" aria-label="Locked">x</span>
  }`,
})
class ShiftComponent {
  @Input() departmentId = '';

  readonly isLocked = signal(false);

  readonly #lockedIds = inject(LockService).lockedIds;

  constructor() {
    // A root effect (as opposed to a view effect) is flushed by ApplicationRef.tick,
    // so its first run depends on when the first tick happens relative to input
    // assignment. If it runs before `departmentId` is set it never reads the
    // signal, so it never re-runs.
    runInInjectionContext(inject(EnvironmentInjector), () =>
      effect(() => {
        if (!this.departmentId) {
          return;
        }

        this.isLocked.set(this.#lockedIds().includes(this.departmentId));
      }),
    );
  }
}

describe('@testing-library/angular render() + root effect', () => {
  it('shows the lock after the root signal changes', async () => {
    await render(ShiftComponent, { inputs: { departmentId: 'd1' } });

    TestBed.inject(LockService).lockedIds.set(['d1']);

    expect(
      await screen.findByRole('img', { name: 'Locked' }),
    ).toBeInTheDocument();
  });
});
