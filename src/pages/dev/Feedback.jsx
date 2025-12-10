import { useState, useEffect } from 'react'
import { getAllFeedback } from '../../api/mockApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import Card from '../../components/Card'
import Table from '../../components/Table'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import { toast, ToastContainer } from '../../components/Toast'

const DevFeedback = () => {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeedback()
  }, [])

  const loadFeedback = async () => {
    setLoading(true)
    const data = await getAllFeedback()
    setFeedback(data)
    setLoading(false)
  }

  const handleMarkAsShown = (feedbackId) => {
    setFeedback(
      feedback.map((fb) => (fb.id === feedbackId ? { ...fb, shown: true } : fb))
    )
    toast.success('Feedback marked as shown in alert')
  }

  const columns = [
    {
      key: 'category',
      label: 'Category',
      render: (value) => <Badge variant="info">{value}</Badge>,
    },
    {
      key: 'message',
      label: 'Message',
      render: (value) => <div className="max-w-md">{value}</div>,
    },
    {
      key: 'date',
      label: 'Date',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'source',
      label: 'Source',
      render: (value) => <Badge variant="default">{value}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleMarkAsShown(row.id)}
          disabled={row.shown}
        >
          Mark as Shown in Alert
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ToastContainer />
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Feedback Management</h2>
        <p className="text-gray-600">View and manage user feedback</p>
      </Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <Table columns={columns} data={feedback} emptyMessage="No feedback found" />
        )}
      </Card>
    </div>
  )
}

export default DevFeedback

