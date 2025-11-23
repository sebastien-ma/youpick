import { useState, useEffect } from 'react'
import config from './config'

function App() {
  const [items, setItems] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [pickedItem, setPickedItem] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')

  // Check for stored password on component mount
  useEffect(() => {
    const storedPassword = sessionStorage.getItem('youpick-password')
    if (storedPassword) {
      setPassword(storedPassword)
      setIsAuthenticated(true)
      fetchItems(storedPassword)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchItems = async (userPassword = password) => {
    if (!userPassword) return

    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`${config.API_URL}/items`, {
        headers: {
          'X-Password': userPassword
        }
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to fetch items')
      }
      const data = await response.json()
      setItems(data)
    } catch (err) {
      setError('Failed to load items. Make sure the server is running.')
      console.error('Error fetching items:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      try {
        setError(null)
        const response = await fetch(`${config.API_URL}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Password': password
          },
          body: JSON.stringify({ item: inputValue.trim() })
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to add item')
        }
        const data = await response.json()
        setItems(data.items)
        setInputValue('')
      } catch (err) {
        setError('Failed to add item. Please try again.')
        console.error('Error adding item:', err)
      }
    }
  }

  const handleRemoveItem = async (indexToRemove) => {
    try {
      setError(null)
      const response = await fetch(`${config.API_URL}/items/${indexToRemove}`, {
        method: 'DELETE',
        headers: {
          'X-Password': password
        }
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to remove item')
      }
      const data = await response.json()
      setItems(data.items)
      if (pickedItem && pickedItem.index === indexToRemove) {
        setPickedItem(null)
      }
    } catch (err) {
      setError('Failed to remove item. Please try again.')
      console.error('Error removing item:', err)
    }
  }

  const handleRandomPick = async () => {
    if (items.length === 0) return

    setIsAnimating(true)
    setPickedItem(null)

    // Simulate animation
    setTimeout(async () => {
      const randomIndex = Math.floor(Math.random() * items.length)
      const picked = {
        name: items[randomIndex],
        index: randomIndex
      }
      setPickedItem(picked)
      setIsAnimating(false)

      // Optionally save the picked item to server
      try {
        await fetch(`${config.API_URL}/picked`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Password': password
          },
          body: JSON.stringify({ item: picked.name, index: picked.index })
        })
      } catch (err) {
        // Don't show error for this optional feature
        console.log('Could not save picked item:', err)
      }
    }, 500)
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordInput.trim()) {
      const trimmedPassword = passwordInput.trim()
      setPassword(trimmedPassword)
      sessionStorage.setItem('youpick-password', trimmedPassword)
      setIsAuthenticated(true)
      fetchItems(trimmedPassword)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('youpick-password')
    setPassword('')
    setIsAuthenticated(false)
    setItems([])
    setPickedItem(null)
    setPasswordInput('')
  }

  // Show password login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              You Pick
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Enter a password to access your shared space
            </p>

            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your group's password..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-500">
                  Anyone with the same password will see the same items
                </p>
              </div>

              <button
                type="submit"
                disabled={!passwordInput.trim()}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  passwordInput.trim()
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Enter Space
              </button>
            </form>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">How it works:</span> Your password creates a private space.
                Everyone using the same password shares the same list of items.
                No account needed!
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                You Pick
              </h1>
              <p className="text-center text-sm text-gray-600 mt-2">
                Space: <span className="font-semibold">{password}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Switch to a different space"
            >
              Switch Space
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">Loading items...</p>
            </div>
          ) : (
            <>
          {/* Add Item Form */}
          <form onSubmit={handleAddItem} className="mb-8">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter item name..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
              >
                Add
              </button>
            </div>
          </form>

          {/* Items List */}
          {items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Items ({items.length})
              </h2>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                      pickedItem?.index === index
                        ? 'bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-400'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-gray-800">{item}</span>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-700 font-semibold text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pick Button */}
          <button
            onClick={handleRandomPick}
            disabled={items.length === 0 || isAnimating}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              items.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isAnimating
                ? 'bg-blue-400 text-white cursor-wait animate-pulse'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isAnimating ? 'Picking...' : 'Pick Random Item'}
          </button>

          {/* Result */}
          {pickedItem && !isAnimating && (
            <div className="mt-8 text-center animate-fadeIn">
              <p className="text-gray-600 mb-2">Selected:</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {pickedItem.name}
              </p>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
