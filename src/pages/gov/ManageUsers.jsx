import { useState, useEffect } from 'react'
import { getUsers } from '../../api/mockApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import Card from '../../components/Card'
import Table from '../../components/Table'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Badge from '../../components/Badge'
import { toast, ToastContainer } from '../../components/Toast'

const GovManageUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    status: 'Active',
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const data = await getUsers()
    setUsers(data)
    setLoading(false)
  }

  const handleAdd = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', role: '', status: 'Active' })
    setModalOpen(true)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData(user)
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast.error('Please fill in all fields')
      return
    }

    if (editingUser) {
      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...formData } : u)))
      toast.success('User updated successfully')
    } else {
      setUsers([...users, { id: users.length + 1, ...formData }])
      toast.success('User added successfully')
    }
    setModalOpen(false)
  }

  const handleDeactivate = (userId) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, status: 'Deactivated' } : u)))
    toast.success('User deactivated')
  }

  const columns = [
    { key: 'id', label: 'User ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'Active' ? 'success' : 'default'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="secondary" onClick={() => handleEdit(row)}>
            Edit
          </Button>
          {row.status === 'Active' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDeactivate(row.id)}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ToastContainer />
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage User Accounts</h2>
            <p className="text-gray-600">Add, edit, and manage user accounts</p>
          </div>
          <Button onClick={handleAdd}>Add User</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <Table columns={columns} data={users} emptyMessage="No users found" />
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Add User'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: '', label: 'Select role' },
              { value: 'public', label: 'Public User' },
              { value: 'government', label: 'Government User' },
              { value: 'analyst', label: 'Traffic Analyst' },
              { value: 'developer', label: 'System Developer' },
            ]}
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Deactivated', label: 'Deactivated' },
            ]}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default GovManageUsers

