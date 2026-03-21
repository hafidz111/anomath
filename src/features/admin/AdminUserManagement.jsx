import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle,
  Eye,
  Filter,
  Loader2,
  Pencil,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deleteAdminUser, fetchAdminUser, fetchAdminUsers, updateAdminUser } from '@/lib/api/admin';

function roleLabel(role) {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function mapRow(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    roleRaw: u.role,
    role: roleLabel(u.role),
    isActive: u.is_active,
    status: u.is_active ? 'Active' : 'Suspended',
  };
}

export default function AdminUserManagement() {
  const [userList, setUserList] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState('detail');
  const [selectedId, setSelectedId] = useState(null);
  const [panelUser, setPanelUser] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('student');
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');

  const refreshList = useCallback(() => {
    fetchAdminUsers({ page_size: 500 })
      .then((data) => {
        if (!data?.users) return;
        setUserList(data.users.map(mapRow));
        setLoadError(null);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : 'Gagal memuat pengguna');
      });
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const openPanel = async (userId, mode) => {
    setSelectedId(userId);
    setPanelMode(mode);
    setPanelOpen(true);
    setPanelUser(null);
    setPanelError(null);
    setPanelLoading(true);
    setEditPassword('');
    try {
      const u = await fetchAdminUser(userId);
      setPanelUser(u);
      setEditName(u.name);
      setEditEmail(u.email);
      setEditRole(u.role);
      setEditActive(u.is_active);
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : 'Gagal memuat detail');
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedId(null);
    setPanelUser(null);
    setPanelError(null);
    setPanelMode('detail');
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const body = {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        is_active: editActive,
      };
      if (editPassword.trim()) {
        body.password = editPassword.trim();
      }
      const updated = await updateAdminUser(selectedId, body);
      setPanelUser(updated);
      setEditPassword('');
      setPanelMode('detail');
      toast.success('Pengguna diperbarui');
      refreshList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedId || !panelUser) return;
    if (!window.confirm(`Nonaktifkan akun ${panelUser.email}?`)) return;
    setSaving(true);
    try {
      const updated = await updateAdminUser(selectedId, { is_active: false });
      setPanelUser(updated);
      setEditActive(false);
      toast.success('Akun dinonaktifkan');
      refreshList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menonaktifkan');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const updated = await updateAdminUser(selectedId, { is_active: true });
      setPanelUser(updated);
      setEditActive(true);
      toast.success('Akun diaktifkan');
      refreshList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengaktifkan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !panelUser) return;
    if (!window.confirm(`Hapus permanen ${panelUser.email}? Data terkait ikut terhapus.`)) return;
    setSaving(true);
    try {
      await deleteAdminUser(selectedId);
      toast.success('Pengguna dihapus');
      closePanel();
      refreshList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      const keyword = search.trim().toLowerCase();
      const matchKeyword =
        keyword.length === 0 ||
        u.name.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword);
      const matchRole = roleFilter === 'all' || u.roleRaw === roleFilter;
      const matchStatus =
        statusFilter === 'all' || u.status.toLowerCase() === statusFilter;
      return matchKeyword && matchRole && matchStatus;
    });
  }, [search, roleFilter, statusFilter, userList]);

  const summary = {
    total: userList.length,
    students: userList.filter((u) => u.roleRaw === 'student').length,
    teachers: userList.filter((u) => u.roleRaw === 'teacher').length,
    active: userList.filter((u) => u.isActive).length,
  };

  return (
    <>
      <main className='mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'>
        {loadError ? (
          <p className='text-sm text-red-600' role='alert'>
            {loadError}
          </p>
        ) : null}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
          {[
            { label: 'Total Users', value: summary.total, icon: Users, cardClass: 'from-purple-100 to-purple-50 border-purple-200 text-purple-600' },
            { label: 'Students', value: summary.students, icon: Users, cardClass: 'from-blue-100 to-blue-50 border-blue-200 text-blue-600' },
            { label: 'Teachers', value: summary.teachers, icon: Users, cardClass: 'from-pink-100 to-pink-50 border-pink-200 text-pink-600' },
            { label: 'Active', value: summary.active, icon: CheckCircle, cardClass: 'from-green-100 to-green-50 border-green-200 text-green-600' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className={`rounded-2xl border bg-linear-to-br ${stat.cardClass}`}>
                <CardContent className='p-5'>
                  <Icon className='mb-2 h-5 w-5' />
                  <div className='text-2xl font-bold text-gray-900'>{stat.value}</div>
                  <p className='text-xs text-gray-600'>{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardContent className='space-y-4 p-4'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                <Input
                  className='pl-9'
                  placeholder='Search users by name or email...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className='flex flex-wrap gap-3'>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className='w-40 bg-gray-50'>
                    <SelectValue placeholder='Role' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Roles</SelectItem>
                    <SelectItem value='student'>Student</SelectItem>
                    <SelectItem value='teacher'>Teacher</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='w-40 bg-gray-50'>
                    <SelectValue placeholder='Status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Status</SelectItem>
                    <SelectItem value='active'>Active</SelectItem>
                    <SelectItem value='suspended'>Suspended</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant='outline' size='icon' type='button' aria-label='Filter'>
                  <Filter className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className='inline-flex items-center gap-2'>
                        <Users className='h-4 w-4 text-purple-600' />
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>{u.role}</Badge>
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>
                      {u.status === 'Active' ? (
                        <Badge className='border-transparent bg-green-100 text-green-700'>
                          <CheckCircle className='mr-1 h-3 w-3' />
                          Active
                        </Badge>
                      ) : (
                        <Badge className='border-transparent bg-red-100 text-red-700'>
                          <XCircle className='mr-1 h-3 w-3' />
                          Suspended
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='inline-flex justify-end gap-2'>
                        <Button
                          size='icon'
                          variant='outline'
                          type='button'
                          aria-label='Detail'
                          onClick={() => openPanel(u.id, 'detail')}
                        >
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button
                          size='icon'
                          variant='outline'
                          type='button'
                          aria-label='Edit'
                          onClick={() => openPanel(u.id, 'edit')}
                        >
                          <Pencil className='h-4 w-4' />
                        </Button>
                        <Button
                          size='icon'
                          variant='outline'
                          type='button'
                          aria-label='Suspend'
                          disabled={!u.isActive}
                          onClick={async () => {
                            if (!window.confirm(`Nonaktifkan ${u.email}?`)) return;
                            try {
                              await updateAdminUser(u.id, { is_active: false });
                              toast.success('Akun dinonaktifkan');
                              refreshList();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Gagal');
                            }
                          }}
                        >
                          <Ban className='h-4 w-4' />
                        </Button>
                        <Button
                          size='icon'
                          variant='outline'
                          type='button'
                          className='text-red-700 hover:bg-red-50'
                          aria-label='Hapus'
                          onClick={async () => {
                            if (!window.confirm(`Hapus ${u.email}?`)) return;
                            try {
                              await deleteAdminUser(u.id);
                              toast.success('Pengguna dihapus');
                              refreshList();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Gagal');
                            }
                          }}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='py-6 text-center text-sm text-gray-500'>
                      {loadError ? 'Tidak dapat memuat data.' : 'No users found with current filters.'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {panelOpen ? (
        <>
          <button
            type='button'
            className='fixed inset-0 z-40 bg-black/40'
            aria-label='Tutup panel'
            onClick={closePanel}
          />
          <aside
            className='fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl'
            role='dialog'
            aria-modal='true'
            aria-labelledby='admin-user-panel-title'
          >
            <div className='flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3'>
              <h2 id='admin-user-panel-title' className='text-lg font-bold text-gray-900'>
                {panelMode === 'edit' ? 'Edit pengguna' : 'Detail pengguna'}
              </h2>
              <Button type='button' variant='ghost' size='icon' onClick={closePanel} aria-label='Tutup'>
                <X className='h-5 w-5' />
              </Button>
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto px-4 py-4'>
              {panelLoading ? (
                <div className='flex items-center justify-center gap-2 py-12 text-gray-600'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                  Memuat…
                </div>
              ) : null}
              {panelError ? (
                <p className='text-sm text-red-600' role='alert'>
                  {panelError}
                </p>
              ) : null}

              {!panelLoading && panelUser && panelMode === 'detail' ? (
                <div className='space-y-4'>
                  <div>
                    <p className='text-xs font-medium uppercase text-gray-500'>Nama</p>
                    <p className='font-semibold text-gray-900'>{panelUser.name}</p>
                  </div>
                  <div>
                    <p className='text-xs font-medium uppercase text-gray-500'>Email</p>
                    <p className='text-gray-900'>{panelUser.email}</p>
                  </div>
                  <div>
                    <p className='text-xs font-medium uppercase text-gray-500'>Role</p>
                    <Badge variant='outline'>{roleLabel(panelUser.role)}</Badge>
                  </div>
                  <div>
                    <p className='text-xs font-medium uppercase text-gray-500'>Status</p>
                    {panelUser.is_active ? (
                      <Badge className='border-transparent bg-green-100 text-green-700'>Active</Badge>
                    ) : (
                      <Badge className='border-transparent bg-red-100 text-red-700'>Suspended</Badge>
                    )}
                  </div>
                  <div>
                    <p className='text-xs font-medium uppercase text-gray-500'>Staff / superuser</p>
                    <p className='text-sm text-gray-700'>
                      is_staff: {panelUser.is_staff ? 'ya' : 'tidak'} • is_superuser:{' '}
                      {panelUser.is_superuser ? 'ya' : 'tidak'}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs font-medium uppercase text-gray-500'>Terdaftar</p>
                    <p className='text-sm text-gray-700'>
                      {panelUser.created_at
                        ? new Date(panelUser.created_at).toLocaleString('id-ID')
                        : '—'}
                    </p>
                  </div>

                  <div className='flex flex-col gap-2 border-t border-gray-100 pt-4'>
                    <Button
                      type='button'
                      className='w-full bg-linear-to-r from-purple-200 to-blue-200 text-purple-700'
                      onClick={() => setPanelMode('edit')}
                    >
                      <Pencil className='mr-2 h-4 w-4' />
                      Edit
                    </Button>
                    {panelUser.is_active ? (
                      <Button type='button' variant='outline' disabled={saving} onClick={handleSuspend}>
                        <Ban className='mr-2 h-4 w-4' />
                        Nonaktifkan (suspend)
                      </Button>
                    ) : (
                      <Button type='button' variant='outline' disabled={saving} onClick={handleActivate}>
                        Aktifkan kembali
                      </Button>
                    )}
                    <Button
                      type='button'
                      variant='outline'
                      className='text-red-700 hover:bg-red-50'
                      disabled={saving}
                      onClick={handleDelete}
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Hapus pengguna
                    </Button>
                  </div>
                </div>
              ) : null}

              {!panelLoading && panelUser && panelMode === 'edit' ? (
                <form
                  className='space-y-4'
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                >
                  <div className='space-y-1.5'>
                    <Label htmlFor='edit-name'>Nama</Label>
                    <Input id='edit-name' value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='edit-email'>Email</Label>
                    <Input
                      id='edit-email'
                      type='email'
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label>Role</Label>
                    <Select value={editRole} onValueChange={setEditRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='student'>Student</SelectItem>
                        <SelectItem value='teacher'>Teacher</SelectItem>
                        <SelectItem value='admin'>Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2'>
                    <Label htmlFor='edit-active' className='cursor-pointer'>
                      Akun aktif
                    </Label>
                    <input
                      id='edit-active'
                      type='checkbox'
                      className='h-4 w-4'
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='edit-pw'>Password baru (opsional)</Label>
                    <Input
                      id='edit-pw'
                      type='password'
                      autoComplete='new-password'
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder='Kosongkan jika tidak diubah'
                    />
                  </div>
                  <div className='flex flex-col gap-2 border-t border-gray-100 pt-4'>
                    <Button
                      type='submit'
                      className='w-full bg-linear-to-r from-purple-200 to-blue-200 text-purple-700'
                      disabled={saving}
                    >
                      {saving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                      Simpan
                    </Button>
                    <Button type='button' variant='outline' onClick={() => setPanelMode('detail')}>
                      Batal
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
