import Card from '../../components/Card'
import Button from '../../components/Button'
import { toast, ToastContainer } from '../../components/Toast'

const DevBackup = () => {
  const handleBackup = () => {
    toast.info('Backup feature coming soon')
  }

  const handleRestore = () => {
    toast.info('Restore feature coming soon')
  }

  return (
    <div className="space-y-4">
      <ToastContainer />
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Backup & Restore</h2>
        <p className="text-gray-600">Manage system backups and restore points</p>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Button onClick={handleBackup}>Create Backup</Button>
            <Button onClick={handleRestore} variant="secondary">
              Restore from Backup
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Backup and restore functionality will be available here.
          </p>
        </div>
      </Card>
    </div>
  )
}

export default DevBackup

