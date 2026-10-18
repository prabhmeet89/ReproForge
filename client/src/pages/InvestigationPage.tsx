import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, AlertTriangle, HelpCircle, Layers } from "lucide-react";
import { useBugReport } from "../hooks/useBugReports";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";

export function InvestigationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: bug, isLoading, isError } = useBugReport(id);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (isError || !bug) {
    return (
      <Card className="text-center py-12 max-w-xl mx-auto">
        <p className="text-sm text-gray-400">Bug report not found</p>
        <Link to="/app/bug-reports">
          <Button variant="secondary" size="sm" className="mt-4">
            Back to Bug Reports
          </Button>
        </Link>
      </Card>
    );
  }

  // If not demo data, show honest EmptyState
  if (!bug.isDemo) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Link
            to={`/app/bug-reports/${bug.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to bug report</span>
          </Link>
        </div>

        <Card className="p-6 border-gray-850">
          <h2 className="text-xl font-display font-bold text-white mb-2">Investigation Hypothesis</h2>
          <p className="text-xs text-gray-400 mb-6">{bug.title}</p>

          <EmptyState
            icon={<Sparkles className="w-6 h-6 text-violet-400" />}
            title="No AI investigation conducted yet"
            description="The AI Investigation worker connects in Phase 6. Once enabled, LLM agents will scan your AST call graphs and isolate the root cause."
            className="py-12"
          />
        </Card>
      </div>
    );
  }

  // Demo record display with clear violet hypothesis branding and DEMO DATA banner
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={`/app/bug-reports/${bug.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to bug report</span>
        </Link>
        <span className="text-xs font-mono px-2.5 py-0.5 bg-violet-500/10 text-violet-300 rounded-full border border-violet-500/30">
          DEMO DATA PREVIEW
        </span>
      </div>

      {/* Demo Banner */}
      <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-500/30 text-violet-200 text-xs flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
        <div>
          <span className="font-semibold text-white">Synthesized Root-Cause Hypothesis:</span> This is a
          probabilistic AI hypothesis from the demo dataset. It will be verified by container execution.
        </div>
      </div>

      {/* Main Root Cause Hypothesis Card */}
      <Card className="p-6 border-violet-500/20 bg-gray-900/80 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-850 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-400" />
            <h3 className="font-display font-bold text-base text-white">Primary Failure Vector</h3>
          </div>
          <span className="text-xs font-mono text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
            Confidence: 89% (High)
          </span>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed">
          The user authentication service fails to sanitize input payloads prior to database query construction.
          Specifically, when the request body contains trailing whitespace, the query matches zero rows while the
          downstream bcrypt comparison assumes an existing user record.
        </p>

        {/* Evidence List */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">Supporting Evidence</h4>
          <ul className="space-y-1.5 text-xs text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-violet-400 font-bold">•</span>
              <span><code className="text-gray-200 bg-gray-950 px-1 py-0.5 rounded">src/services/auth.ts:42</code> attempts property dereference on <code className="text-rose-300">undefined</code> user entity.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 font-bold">•</span>
              <span>No trimming middleware is configured on the Express JSON body parser.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 font-bold">•</span>
              <span>Server logs confirm database lookup returned <code className="text-rose-300">null</code> immediately before the uncaught exception.</span>
            </li>
          </ul>
        </div>
      </Card>

      {/* Side-by-side Confidence & Missing Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 border-gray-850 space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <h4 className="text-xs font-semibold uppercase font-mono">Uncertainty Areas</h4>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Database collation settings (e.g. Postgres vs MySQL trailing space padding) may alter query matching
            behavior across environments.
          </p>
        </Card>

        <Card className="p-5 border-gray-850 space-y-2">
          <div className="flex items-center gap-2 text-blue-400">
            <HelpCircle className="w-4 h-4" />
            <h4 className="text-xs font-semibold uppercase font-mono">Suggested Fix</h4>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Add a Zod or Joi sanitization transform: <code className="text-gray-200 font-mono text-[11px]">z.string().trim()</code> on the email field schema.
          </p>
        </Card>
      </div>
    </div>
  );
}
