import { Link } from 'react-router-dom';
import { Award, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { LoadingBlock, QueryState, cx } from '../../components/shared.jsx';
import { useGetPortalStatus } from '../../services/portalHooks.js';
import { formatSemester } from '../../utils/semester.js';

export default function PortalResults() {
  const statusQuery = useGetPortalStatus();
  const data = statusQuery.data;

  if (statusQuery.isLoading) {
    return (
      <Shell>
        <LoadingBlock lines={8} />
      </Shell>
    );
  }

  if (statusQuery.error || !data) {
    return (
      <Shell>
        <QueryState error={statusQuery.error || 'Empty'} onRetry={() => statusQuery.refetch()} label="Portal Results" />
      </Shell>
    );
  }

  const results = data?.results || [];
  const cgpa = data?.cgpa?.cgpa || '0.00';

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/portal" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2">
              <ArrowLeft size={14} /> Back to Portal Overview
            </Link>
            <h1 className="font-display text-4xl font-bold">Semester Results</h1>
            <p className="mt-1 text-sm text-muted-foreground">Official academic ledger grade sheet and CGPA history.</p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-3 text-right">
            <span className="font-mono text-xs uppercase tracking-wider text-amber-500 font-bold">Cumulative GPA</span>
            <div className="font-display text-3xl font-bold text-amber-500">{cgpa}</div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 font-mono text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-4">Sem</th>
                  <th className="p-4">Subject Code</th>
                  <th className="p-4">Subject Description</th>
                  <th className="p-4 text-center">Credit</th>
                  <th className="p-4 text-center">Grade</th>
                  <th className="p-4 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No result ledger records available. Connect your SRM Portal to load semester grades.
                    </td>
                  </tr>
                ) : (
                  results.map((row, idx) => {
                    const isPass = /PASS|P/i.test(row.result);
                    return (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="p-4 font-mono font-bold">{formatSemester(row.semester)}</td>
                        <td className="p-4 font-mono text-accent font-bold">{row.subject_code}</td>
                        <td className="p-4 font-medium">{row.subject_description}</td>
                        <td className="p-4 text-center font-mono">{row.credit}</td>
                        <td className="p-4 text-center font-bold text-amber-500">{row.grade}</td>
                        <td className="p-4 text-center">
                          <span
                            className={cx(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
                              isPass ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                            )}
                          >
                            {isPass ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {row.result}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
