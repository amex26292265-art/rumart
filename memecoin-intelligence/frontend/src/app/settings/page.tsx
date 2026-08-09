export default function SettingsPage() {
  return (
    <div className="card space-y-3 p-5">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-slate-400">
        Trading mode is locked to <strong>paper</strong>. Live execution requires a separate, explicitly enabled module.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li>Paper starting balance: $500 (configurable via env)</li>
        <li>Bybit public market data: no API secret required</li>
        <li>Scenario/mock tokens disabled in production (`SEED_DEMO_SCENARIOS=false`)</li>
        <li>Never paste seed phrases or private keys</li>
      </ul>
    </div>
  );
}
