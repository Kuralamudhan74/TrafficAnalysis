import { useState, useEffect } from 'react'
import { getRoles } from '../../api/mockApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import Card from '../../components/Card'
import Table from '../../components/Table'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Badge from '../../components/Badge'
import { toast, ToastContainer } from '../../components/Toast'

const DevAccessRoles = () => {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: '',
    status: 'Active',
  })

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    setLoading(true)
    const data = await getRoles()
    setRoles(data)
    setLoading(false)
  }

  const handleCreate = () => {
    setEditingRole(null)
    setFormData({ name: '', description: '', permissions: '', status: 'Active' })
    setModalOpen(true)
  }

  const handleEdit = (role) => {
    setEditingRole(role)
    setFormData({ ...role, permissions: role.permissions.join(', ') })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    const roleData = {
      ...formData,
      permissions: formData.permissions.split(',').map((p) => p.trim()),
    }

    if (editingRole) {
      setRoles(
        roles.map((r) => (r.id === editingRole.id ? { ...r, ...roleData } : r))
      )
      toast.success('Role updated successfully')
    } else {
      setRoles([...roles, { id: roles.length + 1, ...roleData }])
      toast.success('Role created successfully')
    }
    setModalOpen(false)
  }

  const handleSuspend = (roleId) => {
    setRoles(roles.map((r) => (r.id === roleId ? { ...r, status: 'Suspended' } : r)))
    toast.success('Role suspended')
  }

  const columns = [
    { key: 'name', label: 'Role Name' },
    { key: 'description', label: 'Description' },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (value) => (
        <div className="flex flex-wrap gap-1">
          {value.map((perm, idx) => (
            <Badge key={idx} variant="info">
              {perm}
            </Badge>
          ))}
        </div>
      ),
    },
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
            Update
          </Button>
          {row.status === 'Active' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleSuspend(row.id)}
            >
              Suspend
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Roles</h2>
            <p className="text-gray-600">Manage user roles and permissions</p>
          </div>
          <Button onClick={handleCreate}>Create Role</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <Table columns={columns} data={roles} emptyMessage="No roles found" />
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRole ? 'Update Role' : 'Create Role'}
      >
        <div className="space-y-4">
          <Input
            label="Role Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permissions (comma-separated)
            </label>
            <Input
              value={formData.permissions}
              onChange={(e) => setFormData({ ...formData, permissions: e.target.value })}
              placeholder="view_dashboard, manage_users, etc."
            />
          </div>
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

export default DevAccessRoles

