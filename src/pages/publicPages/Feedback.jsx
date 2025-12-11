import { useState } from 'react'
import { submitFeedback } from '../../api/mockApi'
import Card from '../../components/Card'
import Select from '../../components/Select'
import Button from '../../components/Button'
import { toast, ToastContainer } from '../../components/Toast'

const PublicFeedback = () => {
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!category || !message.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    setSubmitting(true)
    try {
      await submitFeedback({ category, message })
      setSubmitted(true)
      setCategory('')
      setMessage('')
      toast.success('Thank you for your feedback!')
    } catch (error) {
      toast.error('Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600">
            Your feedback has been received. We appreciate your input.
          </p>
          <Button
            onClick={() => setSubmitted(false)}
            className="mt-6"
            variant="secondary"
          >
            Submit Another Feedback
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <ToastContainer />
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Feedback</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: '', label: 'Select category' },
              { value: 'Bug', label: 'Bug' },
              { value: 'Feature Request', label: 'Feature Request' },
              { value: 'UX Issue', label: 'UX Issue' },
              { value: 'Other', label: 'Other' },
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input-field"
              rows={6}
              placeholder="Share your thoughts, suggestions, or report issues..."
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full md:w-auto">
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default PublicFeedback

