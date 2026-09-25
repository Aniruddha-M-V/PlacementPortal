import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Calendar, Users, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { activitiesApi } from '../../api/activities.api';
import { computeStatus } from '../../utils/eventStatus';

const TYPE_BADGE = {
  workshop: 'badge-primary', seminar: 'badge-secondary',
  hackathon: 'badge-warning', webinar: 'badge-success', other: 'badge-muted',
};
const STATUS_BADGE = {
  upcoming: 'badge-primary', ongoing: 'badge-secondary',
  completed: 'badge-success', cancelled: 'badge-danger',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(hhMM) {
  if (!hhMM) return '';
  const [h, m] = hhMM.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function ActivityDetail() {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activitiesApi.getById(id)
      .then(r => setActivity(r.data.data))
      .catch(err => toast.error(err.message || 'Failed to load activity'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="page-content py-6">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-lg" />)}
      </div>
    </div>
  );

  if (!activity) return (
    <div className="page-content py-6">
      <Link to="/activities" className="btn btn-ghost btn-sm -ml-2 mb-4 inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <p className="text-text-muted text-sm">Activity not found.</p>
    </div>
  );

  const liveStatus = computeStatus(activity.startDate, activity.startTime, activity.endDate, activity.endTime, activity.status);

  return (
    <div className="page-content py-6 space-y-6">
      <Link to="/activities" className="btn btn-ghost btn-sm -ml-2 inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Main Info */}
      <div className="card-padded">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-text">{activity.title}</h1>
              <span className={`badge ${TYPE_BADGE[activity.type] || 'badge-muted'} capitalize`}>{activity.type}</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(activity.startDate)}{activity.startTime ? ` · ${formatTime(activity.startTime)}` : ''}
              </span>
              {activity.endDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Ends {formatDate(activity.endDate)}{activity.endTime ? ` · ${formatTime(activity.endTime)}` : ''}
                </span>
              )}
              {activity.venue && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{activity.venue}</span>}
            </div>
          </div>
          <span className={`badge ${STATUS_BADGE[liveStatus] || 'badge-muted'} capitalize`}>{liveStatus}</span>
        </div>

        {activity.description && <p className="mt-4 text-sm text-text-muted">{activity.description}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border">
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Duration</dt>
            <dd className="text-sm font-medium mt-0.5">{activity.duration ? `${activity.duration}h` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Mode</dt>
            <dd className="text-sm font-medium mt-0.5 capitalize">{activity.mode || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Organizer</dt>
            <dd className="text-sm font-medium mt-0.5">{activity.organizer || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted uppercase tracking-wide">Participants</dt>
            <dd className="text-sm font-medium mt-0.5">
              {activity.participants?.length ?? 0}
              {activity.maxParticipants ? ` / ${activity.maxParticipants}` : ''}
            </dd>
          </div>
          {activity.certificateProvided && (
            <div>
              <dt className="text-xs text-text-muted uppercase tracking-wide">Certificate</dt>
              <dd className="text-sm font-medium mt-0.5 text-success-600">Provided</dd>
            </div>
          )}
          {activity.externalLink && (
            <div className="col-span-2">
              <dt className="text-xs text-text-muted uppercase tracking-wide">Link</dt>
              <dd className="mt-0.5">
                <a href={activity.externalLink} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </a>
              </dd>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
