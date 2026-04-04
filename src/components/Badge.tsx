const styles: Record<string, string> = {
  PASS: 'bg-success-light text-success',
  FAIL: 'bg-error-light text-error',
  WARN: 'bg-warning-light text-warning',
  RUNNING: 'bg-info-light text-info',
  PENDING: 'bg-surface-alt text-text-muted',
  running: 'bg-info-light text-info',
  completed: 'bg-success-light text-success',
  failed: 'bg-error-light text-error',
  cancelled: 'bg-surface-alt text-text-muted',
  pending: 'bg-surface-alt text-text-muted',
};

const icons: Record<string, string> = {
  PASS: '\u2713',
  FAIL: '\u2717',
  WARN: '\u26A0',
  RUNNING: '\u25CF',
  PENDING: '\u25CB',
  running: '\u25CF',
  completed: '\u2713',
  failed: '\u2717',
  cancelled: '\u25A0',
  pending: '\u25CB',
};

export default function Badge({ status, pulse }: { status: string; pulse?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${styles[status] || styles.PENDING} ${pulse ? 'animate-pulse-opacity' : ''}`}
    >
      {icons[status]} {status.toUpperCase()}
    </span>
  );
}
