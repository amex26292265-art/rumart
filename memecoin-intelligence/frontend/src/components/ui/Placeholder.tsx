export default function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="card p-5">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">{note}</p>
    </div>
  );
}
