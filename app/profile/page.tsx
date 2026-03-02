'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, UserCircle2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

type ProfileForm = {
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  email: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [form, setForm] = useState<ProfileForm>({
    username: '',
    fullName: '',
    bio: '',
    avatarUrl: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = useMemo(() => {
    const source = form.fullName || form.username || form.email || 'U';
    return source.slice(0, 1).toUpperCase();
  }, [form.email, form.fullName, form.username]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace('/auth/signin?next=%2Fprofile');
        return;
      }

      setUserId(user.id);
      const authEmail = String(user.email || '').toLowerCase();
      setInitialEmail(authEmail);

      const { data: profile } = await supabase
        .from('users')
        .select('username,full_name,bio,avatar_url,email')
        .eq('id', user.id)
        .maybeSingle();

      setForm({
        username: String(profile?.username || user.user_metadata?.username || ''),
        fullName: String(profile?.full_name || user.user_metadata?.full_name || ''),
        bio: String(profile?.bio || ''),
        avatarUrl: String(profile?.avatar_url || ''),
        email: String(profile?.email || authEmail || ''),
      });

      setLoading(false);
    };

    load();
  }, [router]);

  const handleProfileSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const trimmedUsername = form.username.trim();
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedUsername || !trimmedEmail) {
      setError('Username and email are required.');
      setSaving(false);
      return;
    }

    let emailChanged = false;
    if (trimmedEmail !== initialEmail) {
      const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (emailError) {
        setError(emailError.message);
        setSaving(false);
        return;
      }
      emailChanged = true;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        username: trimmedUsername,
        full_name: form.fullName.trim() || null,
        bio: form.bio.trim() || null,
        avatar_url: form.avatarUrl.trim() || null,
        email: trimmedEmail,
      })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setInitialEmail(trimmedEmail);
    setMessage(
      emailChanged
        ? 'Profile updated. Please verify your new email from the confirmation mail.'
        : 'Profile updated successfully.'
    );
    setSaving(false);
  };

  const handlePasswordSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordMessage('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('Enter and confirm your new password.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setPasswordLoading(false);
      return;
    }

    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    if (pwError) {
      setPasswordError(pwError.message);
      setPasswordLoading(false);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('Password updated successfully.');
    setPasswordLoading(false);
  };

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setMessage('');

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      e.target.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('Image size must be 3MB or less.');
      e.target.value = '';
      return;
    }

    setAvatarUploading(true);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    }).catch(() => '');

    if (!dataUrl) {
      setError('Failed to process image. Please try another file.');
      setAvatarUploading(false);
      e.target.value = '';
      return;
    }

    setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
    const { error: avatarError } = await supabase
      .from('users')
      .update({ avatar_url: dataUrl })
      .eq('id', userId);

    if (avatarError) {
      setError(avatarError.message);
    } else {
      setMessage('Profile photo updated.');
    }

    setAvatarUploading(false);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
        <p className="text-sm text-gray-600 dark:text-gray-300">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <nav className="border-b border-gray-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h1>
        </div>
      </nav>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-gray-200 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <UserCircle2 className="h-5 w-5" />
              Public Profile
            </CardTitle>
            <CardDescription>Visible details for your codeForge account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16 border border-gray-200 dark:border-white/10">
                <AvatarImage src={form.avatarUrl || undefined} alt="Profile photo" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium text-gray-900 dark:text-white">{form.fullName || form.username || 'Your Name'}</p>
                <p>@{form.username || 'username'}</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <Button type="button" variant="outline" onClick={handleAvatarPick} disabled={avatarUploading}>
              {avatarUploading ? 'Uploading...' : 'Upload Photo'}
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile photo URL (optional)</label>
              <Input
                value={form.avatarUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                placeholder="https://example.com/avatar.png"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-gray-200 dark:border-white/10">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Account Details</CardTitle>
            <CardDescription>Update username, connected email, and your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-4">
              {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
              {message ? <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">{message}</p> : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="your_username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Connected Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell others about your coding journey..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="bg-purple-600 text-white hover:bg-purple-700">
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-gray-200 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Change your password and secure your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSave} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={passwordLoading} className="w-full bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200">
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
            {passwordError ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">{passwordError}</p> : null}
            {passwordMessage ? <p className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300">{passwordMessage}</p> : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
