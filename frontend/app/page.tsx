"use client"
import React, { useEffect, useState, useRef } from "react"

type User = { id: number; name: string; email: string }

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  console.log('API baseUrl =', baseUrl)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/users`)
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error(err)
      setError('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('handleSubmit called, editingId =', editingId)
    setError("")
    if (!name.trim() || !email.trim()) {
      setError('Name dan email dibutuhkan')
      return
    }
    const payload = { name: name.trim(), email: email.trim() }
    console.log('POST payload', payload)
    try {
      let res
      if (editingId) {
        res = await fetch(`${baseUrl}/api/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${baseUrl}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      console.log('POST response status', res.status)
      const resText = await res.text()
      try { console.log('POST response body', JSON.parse(resText)) } catch { console.log('POST response body', resText) }
      if (!res.ok) {
        setError('Server error: ' + res.status)
        return
      }
      setName("")
      setEmail("")
      setEditingId(null)
      fetchUsers()
    } catch (err) {
      console.error(err)
      setError('Gagal menyimpan data')
    }
  }

  function startEdit(u: User) {
    setEditingId(u.id)
    setName(u.name)
    setEmail(u.email)
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus user ini?")) return
    try {
      await fetch(`${baseUrl}/api/users/${id}`, { method: "DELETE" })
      fetchUsers()
    } catch (err) {
      console.error(err)
      setError('Gagal menghapus data')
    }
  }

  return (
    <main className="min-h-screen bg-orange-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="brand">
              <div className="brand-logo" aria-hidden></div>
              <div>
                <h1 className="text-3xl font-bold text-black">User Management</h1>
                <p className="text-black text-sm mt-0.5">CRUD sederhana untuk user </p>
              </div>
            </div>
          </div>
          <div>
            <button onClick={() => fetchUsers()} className="refresh-btn text-sm text-black">Refresh</button>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 app-card highlight-card rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4 text-black">{editingId ? 'Edit User' : 'Create User'}</h2>
            {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-black mb-1">Name</label>
                <input ref={nameInputRef} className="w-full text-black bg-white border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-black mb-1">Email</label>
                <input className="w-full text-black bg-white border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" className="btn-primary inline-flex items-center gap-2">
                  {editingId ? 'Update' : 'Create'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setName(''); setEmail('') }} className="px-3 py-2 rounded-md border text-black">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 app-card rounded-xl p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-black">Users</h2>
              <div className="text-sm text-black">{users.length} users</div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-black">Loading...</div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-black flex flex-col items-center">
                <svg className="empty-illustration mb-4" width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="0" y="0" width="96" height="96" rx="20" fill="#FFF7F1" />
                  <path d="M48 26C40.268 26 34 32.268 34 40C34 47.732 40.268 54 48 54C55.732 54 62 47.732 62 40C62 32.268 55.732 26 48 26Z" fill="#FEE6D6"/>
                  <path d="M48 58C34 58 24 66 24 76H72C72 66 62 58 48 58Z" fill="#FFEFE1"/>
                  <path d="M66 38L48 56L30 38" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="text-lg text-black mb-4">No users yet</div>
                <button className="btn-primary" onClick={() => { setEditingId(null); setName(''); setEmail(''); nameInputRef.current?.focus(); }}>Create first user</button>
              </div>
            ) : (
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-orange-100 text-black">
                    <th className="text-left px-4 py-2">ID</th>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-orange-50">
                      <td className="px-4 py-3 text-sm text-black">{u.id}</td>
                      <td className="px-4 py-3 text-sm text-black">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-black">{u.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <button className="text-orange-600 hover:underline mr-3" onClick={() => startEdit(u)}>Edit</button>
                        <button className="text-red-600 hover:underline" onClick={() => handleDelete(u.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  )

}
