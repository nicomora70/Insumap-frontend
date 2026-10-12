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
    <app-shell
      [title]="userName()"
      greeting="Hola,"
      [userName]="userName()"
      [tabs]="tabs"
      active="historial"
    >
      <main class="page-enter space-y-3 px-5 pt-1 lg:px-0">
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
