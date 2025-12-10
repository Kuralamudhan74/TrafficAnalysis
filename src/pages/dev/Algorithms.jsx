import { useState, useEffect } from 'react'
import { getAlgorithms, updateAlgorithmStatus } from '../../api/mockApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import Card from '../../components/Card'
import Table from '../../components/Table'
import Input from '../../components/Input'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import { toast, ToastContainer } from '../../components/Toast'

const DevAlgorithms = () => {
  const [algorithms, setAlgorithms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadAlgorithms()
  }, [])

  const loadAlgorithms = async () => {
    setLoading(true)
    const data = await getAlgorithms()
    setAlgorithms(data)
    setLoading(false)
  }

  const handleSuspend = async (algorithmId) => {
    try {
      await updateAlgorithmStatus(algorithmId, 'Suspended')
      setAlgorithms(
        algorithms.map((alg) =>
          alg.id === algorithmId ? { ...alg, status: 'Suspended' } : alg
        )
      )
      toast.success('Algorithm suspended')
    } catch (error) {
      toast.error('Failed to suspend algorithm')
    }
  }

  const handleActivate = async (algorithmId) => {
    try {
      await updateAlgorithmStatus(algorithmId, 'Active')
      setAlgorithms(
        algorithms.map((alg) =>
          alg.id === algorithmId ? { ...alg, status: 'Active' } : alg
        )
      )
      toast.success('Algorithm activated')
    } catch (error) {
      toast.error('Failed to activate algorithm')
    }
  }

  const filteredAlgorithms = algorithms.filter((alg) =>
    alg.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    { key: 'name', label: 'Module Name' },
    { key: 'version', label: 'Version' },
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
      key: 'lastUpdated',
      label: 'Last Updated',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="secondary">
            View
          </Button>
          <Button size="sm" variant="secondary">
            Update
          </Button>
          {row.status === 'Active' ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleSuspend(row.id)}
            >
              Suspend
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleActivate(row.id)}
            >
              Activate
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
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Algorithm Modules</h2>
            <p className="text-gray-600">Manage and monitor algorithm modules</p>
          </div>
          <Input
            placeholder="Search algorithms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredAlgorithms}
            emptyMessage="No algorithms found"
          />
        )}
      </Card>
    </div>
  )
}

export default DevAlgorithms

