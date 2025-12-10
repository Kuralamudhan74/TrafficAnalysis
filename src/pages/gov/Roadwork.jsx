import { useState } from 'react'
import { createRoadwork } from '../../api/mockApi'
import Card from '../../components/Card'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import { toast, ToastContainer } from '../../components/Toast'

const GovRoadwork = () => {
  const [formData, setFormData] = useState({
    location: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    emasIncident: false,
  })
  const [activeEvents, setActiveEvents] = useState([
    {
      id: 1,
      location: 'Orchard Road',
      startTime: '2024-01-15T08:00',
      endTime: '2024-01-15T18:00',
      emas: true,
    },
  ])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.location || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      await createRoadwork(formData)
      setActiveEvents([
        ...activeEvents,
        {
          id: activeEvents.length + 1,
          ...formData,
        },
      ])
      toast.success('Roadwork event created successfully')
      setFormData({
        location: '',
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        emasIncident: false,
      })
    } catch (error) {
      toast.error('Failed to create roadwork event')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Input Roadwork Event</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Location *"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                options={[
                  { value: '', label: 'Select location' },
                  { value: 'Orchard Road', label: 'Orchard Road' },
                  { value: 'Marina Bay', label: 'Marina Bay' },
                  { value: 'Jurong East', label: 'Jurong East' },
                  { value: 'Tampines Avenue', label: 'Tampines Avenue' },
                  { value: 'Woodlands Road', label: 'Woodlands Road' },
                ]}
              />

              <Input
                label="Start Time *"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />

              <Input
                label="End Time *"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emas"
                  checked={formData.emasIncident}
                  onChange={(e) =>
                    setFormData({ ...formData, emasIncident: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="emas" className="ml-2 text-sm text-gray-700">
                  EMAS Incident
                </label>
              </div>

              <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                {submitting ? 'Creating...' : 'Create Roadwork Event'}
              </Button>
            </form>
          </Card>
        </div>

        <div>
          <Card>
            <h3 className="text-lg font-semibold mb-4">Active Road Events</h3>
            <div className="space-y-3">
              {activeEvents.length === 0 ? (
                <p className="text-sm text-gray-500">No active events</p>
              ) : (
                activeEvents.map((event) => (
                  <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-gray-900">{event.location}</p>
                      {event.emas && <Badge variant="danger">EMAS</Badge>}
                    </div>
                    <p className="text-xs text-gray-600">
                      {new Date(event.startTime).toLocaleString()} -{' '}
                      {new Date(event.endTime).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default GovRoadwork

