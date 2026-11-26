import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Api } from '../../../core/api';
import { bpsToPct, centsToInput, pctToBps, randToCents } from '../../../core/money';
import { errorMessage } from '../../../core/errors';
import { Settings as CompanySettings} from '../../../core/models'

interface PositionRow {
  id?: string; // existing positions keep their id so crews and history stay linked
  name: string;
  pct: string;
}

@Component({
  imports: [],
  selector: 'app-settings',
  styleUrl: './settings.scss',
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  private readonly api= inject(Api);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly saved = signal(false);

  readonly form = signal({ companyName: '', rate: '' });
  readonly positions = signal<PositionRow[]>([{ name: '', pct: '' }]);

  readonly totalBps = computed(() =>
    this.positions().reduce((sum, p) => {
      const bps = pctToBps(p.pct);
      return sum + (Number.isFinite(bps) ? bps : 0);
    }, 0),
  );
  readonly totalPct = computed(() => this.totalBps() / 100);

  /** First thing wrong with the form, or '' when it can be saved. */
  readonly problem = computed(() => {
    const { companyName, rate } = this.form();
    const rows = this.positions();
    if (!companyName.trim()) return 'Enter the company name.';
    const cents = randToCents(rate);
    if (!Number.isFinite(cents) || cents <= 0) return 'Enter the amount paid per house.';
    if (rows.some((p) => !p.name.trim())) return 'Every position needs a name.';
    const names = rows.map((p) => p.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) return 'Position names must be different.';
    if (rows.some((p) => !Number.isFinite(pctToBps(p.pct)) || pctToBps(p.pct) < 0)) return 'Every position needs a percentage.';
    if (this.totalBps() !== 10000) return 'The percentages must add up to exactly 100%.';
    return '';
  });

  async ngOnInit() {
    try {
      this.apply(await this.api.settings());
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private apply(s: CompanySettings  | null) {
    if (!s) return; // not configured yet: keep the blank form
    this.form.set({ companyName: s.companyName, rate: centsToInput(s.ratePerHouseCents) });
    this.positions.set(s.positions.map((p) => ({ id: p._id, name: p.name, pct: bpsToPct(p.shareBps) })));
  }

  updateField(field: 'companyName' | 'rate', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.form.update((f) => ({ ...f, [field]: value }));
    this.saved.set(false);
  }

  updatePosition(index: number, field: 'name' | 'pct', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.positions.update((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    this.saved.set(false);
  }

  addPosition() {
    this.positions.update((rows) => [...rows, { name: '', pct: '' }]);
  }

  removePosition(index: number) {
    this.positions.update((rows) => rows.filter((_, i) => i !== index));
    this.saved.set(false);
  }

  async save(event: Event) {
    event.preventDefault();
    if (this.problem()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const saved = await this.api.saveSettings({
        companyName: this.form().companyName.trim(),
        ratePerHouseCents: randToCents(this.form().rate),
        positions: this.positions().map((p) => ({
          ...(p.id ? { id: p.id } : {}),
          name: p.name.trim(),
          shareBps: pctToBps(p.pct),
        })),
      });
      this.apply(saved); // picks up ids for newly added positions
      this.saved.set(true);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
