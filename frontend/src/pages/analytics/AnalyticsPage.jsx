import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/dashboard.api';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from 'recharts';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getCharts()
      .then(res => setCharts(res.data.data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-content py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-padded h-64 animate-pulse bg-slate-50" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="page-content py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Analytics</h1>
        <p className="text-sm text-text-muted">Insights across all training and placement metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="card-padded">
          <h2 className="text-base font-semibold text-text mb-4">Monthly Attendance Trend</h2>
          {charts?.attendanceTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }} />
                <Line type="monotone" dataKey="percentage" stroke="#2563EB" strokeWidth={2} dot={{ r: 4, fill: '#2563EB' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Assessment by Type */}
        <div className="card-padded">
          <h2 className="text-base font-semibold text-text mb-4">Average Score by Type</h2>
          {charts?.assessmentTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.assessmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }} />
                <Bar dataKey="avgScore" fill="#14B8A6" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Category Radar */}
        {charts?.categoryPerformance?.length > 0 && (
          <div className="card-padded">
            <h2 className="text-base font-semibold text-text mb-4">Category Performance</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={charts.categoryPerformance}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                <Radar name="Score" dataKey="score" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Eligibility Summary */}
        {charts?.eligibilitySummary && (
          <div className="card-padded space-y-4">
            <h2 className="text-base font-semibold text-text">Eligibility Overview</h2>
            <div className="space-y-3">
              {Object.entries(charts.eligibilitySummary).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-text">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-medium text-text">{val}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${val >= 75 ? 'bg-success-500' : val >= 50 ? 'bg-accent-500' : 'bg-danger-500'}`}
                      style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const EmptyChart = () => (
  <div className="flex items-center justify-center h-[220px] text-text-muted text-sm">
    No data available yet
  </div>
);
