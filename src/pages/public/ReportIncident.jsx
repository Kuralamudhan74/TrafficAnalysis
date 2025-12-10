import { useState } from 'react'
import { submitIncident } from '../../api/mockApi'
import Card from '../../components/Card'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Button from '../../components/Button'
import { toast, ToastContainer } from '../../components/Toast'

const PublicReportIncident = () => {
  const [formData, setFormData] = useState({
    type: '',
    location: '',
    time: new Date().toISOString().slice(0, 16),
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.type || !formData.location) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      await submitIncident(formData)
      toast.success('Incident reported successfully (mock, no backend)')
      setFormData({
        type: '',
        location: '',
        time: new Date().toISOString().slice(0, 16),
        description: '',
      })
    } catch (error) {
      toast.error('Failed to submit incident')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer />
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Report Road Incident</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Incident Type *"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: '', label: 'Select incident type' },
              { value: 'Accident', label: 'Accident' },
              { value: 'Vehicle breakdown', label: 'Vehicle breakdown' },
              { value: 'Roadworks', label: 'Roadworks' },
              { value: 'Obstruction', label: 'Obstruction' },
            ]}
          />

          <div>
            <Input
              label="Location *"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter location or click 'Select on map'"
            />
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => toast.info('Map picker feature coming soon')}
            >
              Select on Map
            </Button>
          </div>

          <Input
            label="Time"
            type="datetime-local"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={4}
              placeholder="Provide additional details about the incident"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full md:w-auto">
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default PublicReportIncident

