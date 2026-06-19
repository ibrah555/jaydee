import NavBar from '../components/NavBar';

export default function More() {
  return (
    <div className="min-h-screen p-4 pb-24">
      <header className="mb-5">
        <p className="text-sm text-slate-500">Settings and tools</p>
        <h1 className="mt-2 text-2xl font-semibold text-accent">More</h1>
      </header>
      <div className="space-y-4">
        {['Shop profile', 'Users', 'Tax settings', 'Backup', 'Sync status'].map((item) => (
          <div key={item} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="font-medium text-slate-800">{item}</p>
          </div>
        ))}
      </div>
      <NavBar />
    </div>
  );
}
