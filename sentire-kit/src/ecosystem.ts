// The Sentire apps, the company (tenant) header, and the event types they agree on.

export type SentireAppId = "ledger" | "payroll" | "projects" | "helpdesk" | "lms";

export interface SentireApp {
  id: SentireAppId;
  name: string;
  engine: "python" | "typescript";
}

export const APPS: readonly SentireApp[] = [
  { id: "ledger", name: "Sentire Ledger", engine: "python" },
  { id: "payroll", name: "Sentire Payroll", engine: "typescript" },
  { id: "projects", name: "Sentire Projects", engine: "typescript" },
  { id: "helpdesk", name: "Sentire Helpdesk", engine: "python" },
  { id: "lms", name: "Sentire LMS", engine: "python" },
];

/** Every cross-app call carries the client company's shared ID in this header. */
export const COMPANY_HEADER = "X-Sentire-Company";

/** Event types. Add new ones here and in docs-sentire/ECOSYSTEM.md together. */
export const EventTypes = {
  PayrollRunApproved: "payroll.run.approved",
  PayrollRunPaid: "payroll.run.paid",
  LedgerJournalPosted: "ledger.journal.posted",
  LedgerTaskCreated: "ledger.task.created",
  ProjectsTaskUpdated: "projects.task.updated",
  CompanyUpdated: "account.company.updated",
} as const;

export interface PayrollRunApproved {
  run_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  currency: "PHP";
  /** Amounts as strings with centavos, e.g. "125000.00", never floats. */
  totals: {
    gross_pay: string;
    withholding_tax: string;
    sss_employee: string;
    sss_employer: string;
    philhealth_employee: string;
    philhealth_employer: string;
    pagibig_employee: string;
    pagibig_employer: string;
    net_pay: string;
  };
}

export interface LedgerTaskCreated {
  task_id: string;
  title: string;
  due_date?: string;
  assignee_email?: string;
  link: string;
}
