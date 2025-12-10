import { useState, useEffect } from 'react'
import { getHistoricalTrends } from '../../api/mockApi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import LoadingSpinner from '../../components/LoadingSpinner'
import Card from '../../components/Card'
import Select from '../../components/Select'

const AnalystTrends = () => {
  const [timescale, setTimescale] = useState('daily')
  const [region, setRegion] = useState('All')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTrends()
  }, [timescale, region])

  const loadTrends = async () => {
    setLoading(true)
    const result = await getHistoricalTrends(timescale, region)
    setData(result)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">View Historical Trends</h2>
            <p className="text-gray-600">Analyze traffic patterns over time</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select
              value={timescale}
              onChange={(e) => setTimescale(e.target.value)}
              options={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
              className="w-full sm:w-48"
            />
            <Select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              options={[
                { value: 'All', label: 'All Regions' },
                { value: 'North', label: 'North' },
                { value: 'South', label: 'South' },
                { value: 'East', label: 'East' },
                { value: 'West', label: 'West' },
                { value: 'Central', label: 'Central' },
              ]}
              className="w-full sm:w-48"
            />
          </div>
        </div>
      </Card>

      {data && (
        <>
          <Card>
            <h3 className="text-lg font-semibold mb-4">Congestion Index Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.congestionIndex}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  name="Congestion Index"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Number of Incidents vs Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.incidents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#ef4444"
                  name="Incidents"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  )
}

export default AnalystTrends

