import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-5">
        <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto">
          <Compass className="w-10 h-10 text-primary-400" />
        </div>
        <div>
          <h1 className="text-5xl font-bold text-text">404</h1>
          <p className="text-lg font-medium text-text mt-2">Page not found</p>
          <p className="text-sm text-text-muted mt-1">The page you're looking for doesn't exist or has been moved.</p>
        </div>
        <Link to="/dashboard" className="btn btn-primary inline-flex">
          <ArrowLeft className="w-4 h-4" /> Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
