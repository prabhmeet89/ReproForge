import { Shield, Key, Sliders, AlertTriangle, User } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { useMe } from "../hooks/useAuth";

export function SettingsPage() {
  const { data: user } = useMe();

  const SECTIONS = [
    {
      title: "AI Provider API Keys",
      desc: "Configure OpenAI, Anthropic, or local model endpoints.",
      phase: "Phase 6 (AI Integration)",
      icon: Key,
    },
    {
      title: "Docker Sandbox Limits",
      desc: "Define container memory limits, CPU quotas, and timeout thresholds.",
      phase: "Phase 8 (Docker Sandbox)",
      icon: Sliders,
    },
    {
      title: "Danger Zone & Data Retention",
      desc: "Purge repository caches, logs, and in-memory test artifacts.",
      phase: "Phase 9 (Polish & Storage)",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-white tracking-tight">Settings</h2>
        <p className="text-xs text-gray-400 mt-0.5">Application preferences and configuration</p>
      </div>

      <div className="space-y-4">
        {/* The one section that is real: the account behind the session. */}
        <Card className="p-5 border-gray-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-200">User Profile &amp; Authentication</h3>
              <p className="text-xs text-gray-400">
                The email address of the account behind the current session.
              </p>
            </div>
          </div>

          <Badge variant="emerald" className="shrink-0 self-start sm:self-auto text-[11px]">
            Active session
          </Badge>
        </Card>

        <Card className="p-5 border-gray-850">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-200">Account email</h3>
              <p className="text-xs text-gray-400">
                Read-only for now — changing it arrives with password reset in a
                later phase.
              </p>
            </div>
          </div>

          <Input
            id="settings-email"
            label="Email"
            value={user?.email ?? ""}
            readOnly
            disabled
            placeholder={user ? "" : "Not signed in"}
            className="opacity-70 cursor-not-allowed"
          />
        </Card>

        {SECTIONS.map((sec, idx) => (
          <Card key={idx} className="p-5 border-gray-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                <sec.icon className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-200">{sec.title}</h3>
                <p className="text-xs text-gray-400">{sec.desc}</p>
              </div>
            </div>

            <Badge variant="gray" className="shrink-0 self-start sm:self-auto text-[11px]">
              {sec.phase}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
