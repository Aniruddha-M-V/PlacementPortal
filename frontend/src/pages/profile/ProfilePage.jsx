import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, Lock, Save, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function ProfilePage() {
  const { user, updateUser, hasRole } = useAuth();
  const isStudent = hasRole('student');
  const [changingPw, setChangingPw] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });

  const pwForm = useForm();
  const { formState: { errors: pwErrors } } = pwForm;

  const onSaveProfile = async (data) => {
    try {
      const res = await api.patch('/auth/profile', data);
      updateUser(res.data.data);
      toast.success('Profile updated');
    } catch (err) {
      const fieldMsg = err.errors?.[0]?.msg;
      toast.error(fieldMsg || err.message);
    }
  };

  const onChangePw = async (data) => {
    if (data.newPassword !== data.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await api.put('/auth/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed');
      pwForm.reset();
      setChangingPw(false);
    } catch (err) {
      const fieldMsg = err.errors?.[0]?.msg;
      toast.error(fieldMsg || err.message);
    }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page-content py-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">My Profile</h1>
        <p className="text-sm text-text-muted">Manage your account information</p>
      </div>

      {/* Avatar */}
      <div className="card-padded flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
            {isStudent ? initials : (user?.avatar ? <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover" /> : initials)}
          </div>
          {/* Camera button: admin/faculty only */}
          {!isStudent && (
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors">
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-text text-lg">{user?.name}</h2>
          <p className="text-sm text-text-muted">{user?.email}</p>
          <span className="badge-muted capitalize mt-1">{user?.role}</span>
        </div>
      </div>

      {/* Profile Form */}
      <div className="card-padded space-y-4">
        <h2 className="text-base font-semibold text-text">Personal Information</h2>
        <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
          <div>
            <label className="form-label">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input {...register('name', { required: true })} className="form-input pl-9" placeholder="Your name" />
            </div>
          </div>
          <div>
            <label className="form-label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input className="form-input pl-9" value={user?.email || ''} disabled />
            </div>
          </div>
          <div>
            <label className="form-label">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input {...register('phone')} className="form-input pl-9" placeholder="+91 99999 99999" />
            </div>
          </div>
          <div className="pt-1">
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <Save className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="card-padded space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Password</h2>
          {!changingPw && (
            <button onClick={() => setChangingPw(true)} className="btn btn-outline btn-sm">
              <Lock className="w-4 h-4" /> Change Password
            </button>
          )}
        </div>
        {changingPw && (
          <form onSubmit={pwForm.handleSubmit(onChangePw)} className="space-y-3">
            <div>
              <label className="form-label">Current Password</label>
              <input type="password" {...pwForm.register('currentPassword', { required: true })} className="form-input" />
            </div>
            <div>
              <label className="form-label">New Password</label>
              <input
                type="password"
                {...pwForm.register('newPassword', {
                  required: true,
                  minLength: { value: 6, message: 'New password must be at least 6 characters' },
                })}
                className="form-input"
              />
              {pwErrors.newPassword && (
                <p className="text-xs text-red-500 mt-1">{pwErrors.newPassword.message || 'New password must be at least 6 characters'}</p>
              )}
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <input type="password" {...pwForm.register('confirm', { required: true })} className="form-input" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn btn-primary btn-sm">Update Password</button>
              <button type="button" onClick={() => { setChangingPw(false); pwForm.reset(); }} className="btn btn-outline btn-sm">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}