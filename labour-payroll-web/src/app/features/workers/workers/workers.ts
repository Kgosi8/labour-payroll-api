import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AccountType, WorkerInput, WorkerListItem } from '../../../core/models';
import { errorMessage } from '../../../core/errors';
import { Api } from '../../../core/api';
import { Auth } from '../../../core/auth';

type StatusFilter = 'all' | 'active' | 'inactive';

interface WorkerForm {
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  street: string;
  suburb: string;
  city: string;
  postalCode: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchCode: string;
  accountType: AccountType;
}

interface FieldDef {
  key: keyof WorkerForm;
  label: string;
  type?: string;
  inputmode?: string;
  list?: string;
}

const emptyForm = (): WorkerForm => ({
  firstName: '',
  lastName: '',
  idNumber: '',
  phone: '',
  street: '',
  suburb: '',
  city: '',
  postalCode: '',
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  branchCode: '',
  accountType: 'savings',
});

@Component({
  imports: [],
  selector: 'app-workers',
  styleUrl: './workers.scss',
  templateUrl: './workers.html',
})
export class Workers implements OnInit {
  private readonly api = inject(Api);
  protected readonly auth = inject(Auth);

  // ---- list ----
  readonly workers = signal<WorkerListItem[]>([]);
  readonly loading = signal(true);
  readonly listError = signal('');
  readonly search = signal('');
  readonly status = signal<StatusFilter>('active');

  readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.status();
    return this.workers().filter((w) => {
      if (status !== 'all' && w.status !== status) return false;
      if (!q) return true;
      const text =
        `${w.firstName} ${w.lastName} ${w.phone ?? ''} ${w.address.city} ${w.bank?.bankName ?? ''}`.toLowerCase();
      return text.includes(q);
    });
  });

  // ---- add / edit sheet ----
  readonly sheetOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly formError = signal('');
  readonly form = signal<WorkerForm>(emptyForm());

  readonly errors = computed(() => {
    const f = this.form();
    const e: Partial<Record<keyof WorkerForm, string>> = {};
    const required: (keyof WorkerForm)[] = [
      'firstName',
      'lastName',
      'street',
      'city',
      'bankName',
      'accountHolder',
    ];
    for (const k of required) if (!f[k].trim()) e[k] = 'Required';
    if (f.idNumber.trim().length < 6) e.idNumber = 'Enter the ID number';
    if (!/^\d{6,16}$/.test(f.accountNumber.trim())) e.accountNumber = 'Digits only, 6 to 16 long';
    if (!/^\d{6}$/.test(f.branchCode.trim())) e.branchCode = 'Must be 6 digits';
    return e;
  });

  readonly personalFields: FieldDef[] = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'idNumber', label: 'ID number', inputmode: 'numeric' },
    { key: 'phone', label: 'Phone (optional)', type: 'tel', inputmode: 'tel' },
  ];
  readonly addressFields: FieldDef[] = [
    { key: 'street', label: 'Street address' },
    { key: 'suburb', label: 'Suburb (optional)' },
    { key: 'city', label: 'City / town' },
    { key: 'postalCode', label: 'Postal code (optional)', inputmode: 'numeric' },
  ];
  readonly bankFields: FieldDef[] = [
    { key: 'bankName', label: 'Bank', list: 'banks' },
    { key: 'accountHolder', label: 'Account holder name' },
    { key: 'accountNumber', label: 'Account number', inputmode: 'numeric' },
    { key: 'branchCode', label: 'Branch code (6 digits)', inputmode: 'numeric' },
  ];
  readonly banks = [
    'ABSA',
    'African Bank',
    'Bidvest Bank',
    'Capitec Bank',
    'Discovery Bank',
    'FNB',
    'Investec',
    'Nedbank',
    'Standard Bank',
    'TymeBank',
  ];

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    this.listError.set('');
    try {
      this.workers.set(await this.api.workers());
    } catch (err) {
      this.listError.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  updateSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  updateStatus(event: Event) {
    this.status.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  updateField(field: keyof WorkerForm, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  openNew() {
    this.editingId.set(null);
    this.form.set(emptyForm());
    this.submitted.set(false);
    this.formError.set('');
    this.sheetOpen.set(true);
  }

  async openEdit(w: WorkerListItem) {
    this.editingId.set(w.id);
    this.form.set(emptyForm());
    this.submitted.set(false);
    this.formError.set('');
    this.sheetOpen.set(true);
    this.detailLoading.set(true);
    try {
      const d = await this.api.worker(w.id); // full decrypted details (admin only, logged on the server)
      this.form.set({
        firstName: d.firstName,
        lastName: d.lastName,
        idNumber: d.idNumber,
        phone: d.phone ?? '',
        street: d.address.street,
        suburb: d.address.suburb ?? '',
        city: d.address.city,
        postalCode: d.address.postalCode ?? '',
        bankName: d.bank.bankName,
        accountHolder: d.bank.accountHolder,
        accountNumber: d.bank.accountNumber,
        branchCode: d.bank.branchCode,
        accountType: d.bank.accountType,
      });
    } catch (err) {
      this.formError.set(errorMessage(err));
    } finally {
      this.detailLoading.set(false);
    }
  }

  closeSheet() {
    if (this.saving()) return;
    this.sheetOpen.set(false);
  }

  private toInput(): WorkerInput {
    const f = this.form();
    return {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      idNumber: f.idNumber.trim(),
      phone: f.phone.trim() || undefined,
      address: {
        street: f.street.trim(),
        suburb: f.suburb.trim() || undefined,
        city: f.city.trim(),
        postalCode: f.postalCode.trim() || undefined,
      },
      bank: {
        bankName: f.bankName.trim(),
        accountHolder: f.accountHolder.trim(),
        accountNumber: f.accountNumber.trim(),
        branchCode: f.branchCode.trim(),
        accountType: f.accountType,
      },
    };
  }

  async save(event: Event) {
    event.preventDefault();
    this.submitted.set(true);
    if (Object.keys(this.errors()).length) return;

    this.saving.set(true);
    this.formError.set('');
    try {
      const id = this.editingId();
      if (id) await this.api.updateWorker(id, this.toInput());
      else await this.api.createWorker(this.toInput());
      this.sheetOpen.set(false);
      await this.load();
    } catch (err) {
      this.formError.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  async toggleStatus(w: WorkerListItem) {
    const next = w.status === 'active' ? 'inactive' : 'active';
    if (
      next === 'inactive' &&
      !confirm(
        `Deactivate ${w.firstName} ${w.lastName}? They can't be added to new crews until reactivated.`,
      )
    )
      return;
    try {
      await this.api.updateWorker(w.id, { status: next });
      await this.load();
    } catch (err) {
      this.listError.set(errorMessage(err));
    }
  }
}
