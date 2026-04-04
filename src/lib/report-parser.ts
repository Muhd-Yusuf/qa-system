export function parseReport(fullOutput: string) {
  const match = fullOutput.match(/<QA_REPORT>([\s\S]*?)<\/QA_REPORT>/);
  if (!match) return null;

  try {
    const report = JSON.parse(match[1].trim());
    return {
      summary: {
        total: report.summary?.total ?? 0,
        passed: report.summary?.passed ?? 0,
        failed: report.summary?.failed ?? 0,
        warnings: report.summary?.warnings ?? 0,
        durationSeconds: report.summary?.duration_seconds ?? 0,
      },
      results: (report.results || []).map((r: any) => ({
        requirement: r.requirement,
        status: r.status,
        detail: r.detail,
        ...(r.screenshot ? { screenshot: r.screenshot } : {}),
      })),
      extraFindings: report.extra_findings || [],
    };
  } catch {
    return null;
  }
}
