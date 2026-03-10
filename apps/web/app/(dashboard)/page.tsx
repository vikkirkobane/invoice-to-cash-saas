export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Outstanding</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">$0.00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Overdue</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">$0.00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Collected This Month</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">$0.00</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">Recent Invoices</h3>
        <p className="text-gray-500">No invoices yet.</p>
      </div>
    </div>
  );
}