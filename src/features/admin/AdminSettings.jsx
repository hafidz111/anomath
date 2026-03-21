import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell,
  CreditCard,
  Lock,
  Save,
  Settings as SettingsIcon,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchAdminStats,
  fetchAdminSettings,
  patchAdminSettings,
} from '@/lib/api/admin';

const DEFAULT_SETTINGS = {
  allowTeacherCases: true,
  enableCompetition: true,
  emailNotifications: true,
  defaultRole: 'student',
  freeMaxStudents: 50,
  freeMaxCases: 10,
  premiumPrice: 29,
  premiumUnlimitedStudents: true,
  premiumCustomCases: true,
  sessionTimeout: 30,
  pwdMin8: true,
  pwdUpper: true,
  pwdNumber: true,
  pwdSpecial: false,
  backupFrequency: 'daily',
};

export default function AdminSettings() {
  const { setHeaderActions } = useOutletContext() ?? {};
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS }));
  const [baselineJson, setBaselineJson] = useState(() =>
    JSON.stringify(DEFAULT_SETTINGS),
  );
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [setSnapshot] = useState(null);

  const dirty = useMemo(
    () => JSON.stringify(settings) !== baselineJson,
    [settings, baselineJson],
  );

  const update = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const saved = await patchAdminSettings(settings);
      const merged = { ...DEFAULT_SETTINGS, ...saved };
      setSettings(merged);
      setBaselineJson(JSON.stringify(merged));
      toast.success('Pengaturan disimpan ke server.');
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Gagal menyimpan pengaturan',
      );
    }
  }, [settings]);

  const handleCancel = useCallback(() => {
    try {
      setSettings(JSON.parse(baselineJson));
    } catch {
      setSettings({ ...DEFAULT_SETTINGS });
    }
  }, [baselineJson]);

  useEffect(() => {
    let cancelled = false;
    fetchAdminStats()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminSettings()
      .then((data) => {
        if (cancelled || !data) return;
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        setBaselineJson(JSON.stringify(merged));
      })
      .catch(() => {
        if (!cancelled) toast.error('Gagal memuat pengaturan dari server.');
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!setHeaderActions) return undefined;
    setHeaderActions(
      <Button
        type='button'
        size='sm'
        disabled={!dirty || settingsLoading}
        onClick={handleSave}
        className='bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 disabled:opacity-40'
      >
        <Save className='mr-2 h-4 w-4' />
        Simpan
      </Button>,
    );
    return () => setHeaderActions(null);
  }, [setHeaderActions, dirty, settingsLoading, handleSave]);

  return (
    <main className='mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'>
      <Card className='rounded-3xl border border-gray-200 shadow-sm'>
        <CardContent className='space-y-6 p-8'>
          <div className='flex items-center gap-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-200 to-purple-200'>
              <SettingsIcon className='h-6 w-6 text-blue-600' />
            </div>
            <div>
              <h2 className='text-2xl font-bold text-gray-900'>
                User Settings
              </h2>
              {settingsLoading ? (
                <p className='text-sm text-gray-500'>Memuat pengaturan…</p>
              ) : (
                <p className='text-sm text-gray-500'>
                  Disimpan di server (GET/PATCH /api/admin/settings/).
                </p>
              )}
            </div>
          </div>

          <div className='flex items-center justify-between rounded-xl bg-gray-50 p-4'>
            <div>
              <p className='font-semibold text-gray-900'>
                Allow Teacher Case Creation
              </p>
              <p className='text-sm text-gray-600'>
                Teachers can create custom detective cases
              </p>
            </div>
            <input
              type='checkbox'
              className='h-5 w-5'
              checked={settings.allowTeacherCases}
              onChange={() =>
                update({ allowTeacherCases: !settings.allowTeacherCases })
              }
            />
          </div>

          <div className='flex items-center justify-between rounded-xl bg-gray-50 p-4'>
            <div>
              <p className='font-semibold text-gray-900'>
                Enable Group Competition
              </p>
              <p className='text-sm text-gray-600'>
                Students can compete in teams and groups
              </p>
            </div>
            <input
              type='checkbox'
              className='h-5 w-5'
              checked={settings.enableCompetition}
              onChange={() =>
                update({ enableCompetition: !settings.enableCompetition })
              }
            />
          </div>

          <div className='space-y-2'>
            <Label>Default User Role</Label>
            <Select
              value={settings.defaultRole}
              onValueChange={(v) => update({ defaultRole: v })}
            >
              <SelectTrigger className='w-full bg-gray-50'>
                <SelectValue placeholder='Select role' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='student'>Student</SelectItem>
                <SelectItem value='teacher'>Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-3xl border border-gray-200 shadow-sm'>
        <CardContent className='space-y-6 p-8'>
          <div className='flex items-center gap-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-pink-200 to-yellow-200'>
              <CreditCard className='h-6 w-6 text-pink-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900'>
              Subscription Settings
            </h2>
          </div>

          <div className='grid gap-6 md:grid-cols-2'>
            <div className='space-y-3 rounded-2xl border border-purple-200 bg-linear-to-br from-purple-100 to-blue-100 p-6'>
              <h3 className='font-bold text-gray-900'>Free Plan</h3>
              <div className='space-y-2'>
                <Label htmlFor='free-max-students'>Max Students</Label>
                <Input
                  id='free-max-students'
                  type='number'
                  className='bg-white'
                  value={settings.freeMaxStudents}
                  onChange={(e) =>
                    update({ freeMaxStudents: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='free-max-cases'>Max Cases</Label>
                <Input
                  id='free-max-cases'
                  type='number'
                  className='bg-white'
                  value={settings.freeMaxCases}
                  onChange={(e) =>
                    update({ freeMaxCases: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className='space-y-3 rounded-2xl border border-yellow-200 bg-linear-to-br from-yellow-100 to-pink-100 p-6'>
              <h3 className='font-bold text-gray-900'>Premium Plan</h3>
              <div className='space-y-2'>
                <Label htmlFor='premium-price'>Monthly Price ($)</Label>
                <Input
                  id='premium-price'
                  type='number'
                  className='bg-white'
                  value={settings.premiumPrice}
                  onChange={(e) =>
                    update({ premiumPrice: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <label className='flex items-center gap-2 text-sm text-gray-700'>
                <input
                  type='checkbox'
                  checked={settings.premiumUnlimitedStudents}
                  onChange={() =>
                    update({
                      premiumUnlimitedStudents:
                        !settings.premiumUnlimitedStudents,
                    })
                  }
                />
                <span>Unlimited Students</span>
              </label>
              <label className='flex items-center gap-2 text-sm text-gray-700'>
                <input
                  type='checkbox'
                  checked={settings.premiumCustomCases}
                  onChange={() =>
                    update({ premiumCustomCases: !settings.premiumCustomCases })
                  }
                />
                <span>Custom Cases</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-3xl border border-gray-200 shadow-sm'>
        <CardContent className='space-y-6 p-8'>
          <div className='flex items-center gap-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-green-200 to-blue-200'>
              <Lock className='h-6 w-6 text-green-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900'>
              System Settings
            </h2>
          </div>

          <div className='flex items-center justify-between rounded-xl bg-gray-50 p-4'>
            <div className='inline-flex items-center gap-2'>
              <Bell className='h-5 w-5 text-purple-600' />
              <div>
                <p className='font-semibold text-gray-900'>
                  Email Notifications
                </p>
                <p className='text-sm text-gray-600'>
                  Send email updates to users
                </p>
              </div>
            </div>
            <input
              type='checkbox'
              className='h-5 w-5'
              checked={settings.emailNotifications}
              onChange={() =>
                update({ emailNotifications: !settings.emailNotifications })
              }
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='session-timeout'>Session Timeout (minutes)</Label>
            <Input
              id='session-timeout'
              type='number'
              className='bg-gray-50'
              value={settings.sessionTimeout}
              onChange={(e) =>
                update({ sessionTimeout: Number(e.target.value) || 0 })
              }
            />
          </div>

          <div className='space-y-2'>
            <Label>Password Requirements</Label>
            <div className='space-y-2 rounded-xl bg-gray-50 p-4 text-sm'>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={settings.pwdMin8}
                  onChange={() => update({ pwdMin8: !settings.pwdMin8 })}
                />
                Minimum 8 characters
              </label>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={settings.pwdUpper}
                  onChange={() => update({ pwdUpper: !settings.pwdUpper })}
                />
                Require uppercase letter
              </label>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={settings.pwdNumber}
                  onChange={() => update({ pwdNumber: !settings.pwdNumber })}
                />
                Require number
              </label>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={settings.pwdSpecial}
                  onChange={() => update({ pwdSpecial: !settings.pwdSpecial })}
                />
                Require special character
              </label>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>Backup Frequency</Label>
            <Select
              value={settings.backupFrequency}
              onValueChange={(v) => update({ backupFrequency: v })}
            >
              <SelectTrigger className='w-full bg-gray-50'>
                <SelectValue placeholder='Select backup frequency' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='daily'>Daily</SelectItem>
                <SelectItem value='weekly'>Weekly</SelectItem>
                <SelectItem value='monthly'>Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end gap-3'>
        <Button
          variant='outline'
          type='button'
          onClick={handleCancel}
          disabled={!dirty}
        >
          Batal
        </Button>
      </div>
    </main>
  );
}
