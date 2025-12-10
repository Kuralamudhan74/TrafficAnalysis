import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import { FiFileText } from 'react-icons/fi'

const DevLogs = () => {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Maintenance & Logs</h2>
        <p className="text-gray-600">View system logs and maintenance history</p>
      </Card>

      <Card>
        <EmptyState
          icon={FiFileText}
          message="Log viewer feature coming soon"
        />
      </Card>
    </div>
  )
}

export default DevLogs

