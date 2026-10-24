import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PATIENT_TABS } from '../../core/nav';
import { AppShell } from '../../shared/shell/app-shell';
import { ExportCard } from '../../shared/ui/export-card';
import { HistoryList } from '../history/history-list';

/** P06: historial del paciente con exportes. */
@Component({
  selector: 'app-history-page',
  imports: [AppShell, ExportCard, HistoryList],
  template: `
    <app-shell [userName]="userName()" [tabs]="tabs" active="historial">
      <main class="page-enter space-y-5">
        <header>
          <p class="text-caption font-medium tracking-[0.08em] text-muted">Registro</p>
          <h1 class="mt-2 text-h1 text-ink-strong">
            Cada aplicación, <span class="accent">en su sitio</span>.
          </h1>
          <p class="mt-3 max-w-lg text-body leading-relaxed text-muted">
            Tu historial completo, agrupado por día y listo para compartir con tu médico.
          </p>
        </header>
        <app-export-card basePath="/history" filename="insumap-historial" />
        <app-history-list [patientId]="null" />
      </main>
    </app-shell>
  `,
})
export class HistoryPage {
  private readonly auth = inject(AuthService);

  protected readonly tabs = PATIENT_TABS;
  protected readonly userName = computed(() => this.auth.user()?.name ?? 'Insumap');
}
