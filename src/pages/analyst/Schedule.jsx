import { useState, useEffect } from 'react'
import { getSchedules, createSchedule } from '../../api/mockApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import Card from '../../components/Card'
import Table from '../../components/Table'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Select from '../../components/Select'
import Badge from '../../components/Badge'
import { toast, ToastContainer } from '../../components/Toast'

const AnalystSchedule = () => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    model: '',
    frequency: 'daily',
  })

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    setLoading(true)
    const data = await getSchedules()
    setSchedules(data)
    setLoading(false)
  }

  const handleCreate = () => {
    setFormData({ model: '', frequency: 'daily' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.model) {
      toast.error('Please select a model')
      return
    }

    try {
      await createSchedule(formData)
      await loadSchedules()
      setModalOpen(false)
      toast.success('Schedule created successfully')
    } catch (error) {
      toast.error('Failed to create schedule')
    }
  }

  const columns = [
    { key: 'model', label: 'Model' },
    {
      key: 'frequency',
      label: 'Frequency',
      render: (value) => <Badge variant="info">{value}</Badge>,
    },
    {
      key: 'lastRun',
      label: 'Last Run',
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      key: 'nextRun',
      label: 'Next Run',
      render: (value) => new Date(value).toLocaleString(),
    },
  ]

  return (
    <div className="space-y-4">
      <ToastContainer />
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule Automated Runs</h2>
            <p className="text-gray-600">Manage automated model execution schedules</p>
          </div>
          <Button onClick={handleCreate}>Create Schedule</Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <Table columns={columns} data={schedules} emptyMessage="No schedules found" />
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Schedule"
      >
        <div className="space-y-4">
          <Select
            label="Choose Model"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            options={[
              { value: '', label: 'Select model' },
              { value: 'Traffic Flow Prediction', label: 'Traffic Flow Prediction' },
              { value: 'Congestion Detection', label: 'Congestion Detection' },
              { value: 'Route Optimization', label: 'Route Optimization' },
            ]}
          />

          <Select
            label="Choose Frequency"
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            options={[
              { value: 'hourly', label: 'Hourly' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />

          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Confirm</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AnalystSchedule

