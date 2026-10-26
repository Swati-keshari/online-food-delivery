import { useState } from 'react'
import { FaMapMarkerAlt, FaTrashAlt } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { searchAddress } from '../lib/geocode'
import { addAddress, deleteAddress, updateProfile } from '../lib/user'
import { setUserData } from '../redux/userSlice'

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]'

const roleLabels = { user: 'Customer', owner: 'Shop Owner', deliveryBoy: 'Delivery Partner' }

const Profile = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((state) => state.user.userData)
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [mobile, setMobile] = useState(user?.mobile || '')
  const [isSaving, setIsSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')

  const [label, setLabel] = useState('Home')
  const [addressText, setAddressText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addressMessage, setAddressMessage] = useState('')

  const addresses = user?.addresses || []

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setProfileMessage('')
    try {
      const updated = await updateProfile({ fullName, mobile })
      dispatch(setUserData({ ...user, ...updated }))
      setProfileMessage('Profile saved.')
    } catch (requestError) {
      setProfileMessage(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddAddress = async (event) => {
    event.preventDefault()
    if (!addressText.trim()) return
    setIsAdding(true)
    setAddressMessage('')
    try {
      // The address is located on the map so orders to it get the right coordinates.
      const place = await searchAddress(addressText.trim())
      const saved = await addAddress({
        label,
        text: place.address,
        latitude: place.position.lat,
        longitude: place.position.lng,
      })
      dispatch(setUserData({ ...user, addresses: saved }))
      setAddressText('')
      setAddressMessage(`Saved: ${place.address}`)
    } catch (requestError) {
      setAddressMessage(requestError.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteAddress = async (addressId) => {
    try {
      dispatch(setUserData({ ...user, addresses: await deleteAddress(addressId) }))
    } catch (requestError) {
      setAddressMessage(requestError.message)
    }
  }

  return (
    <main className="min-h-screen bg-[#fff9f6] px-4 py-6">
      <div className="mx-auto w-full max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Go back to home"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#ff4d2d] transition hover:bg-orange-100"
          >
            <IoArrowBack className="h-6 w-6" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 rounded-2xl bg-white p-5 shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff4d2d] text-xl font-bold text-white">
              {(user?.fullName || '?').charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-semibold text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500">{roleLabels[user?.role] || user?.role}</p>
            </div>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Mobile
            <input
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              inputMode="tel"
              className={inputClass}
            />
          </label>
          {profileMessage && (
            <p role="status" className="text-sm text-gray-700">
              {profileMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[#ff4d2d] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#e64327] disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </form>

        {user?.role === 'user' && (
          <section aria-labelledby="addresses-heading" className="space-y-4 rounded-2xl bg-white p-5 shadow-md">
            <h2 id="addresses-heading" className="text-lg font-semibold text-gray-900">
              Saved Addresses
            </h2>
            {addresses.length === 0 ? (
              <p className="text-sm text-gray-500">No saved addresses yet. Add one to pick it quickly at checkout.</p>
            ) : (
              <ul className="space-y-2">
                {addresses.map((address) => (
                  <li key={address._id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3">
                    <span className="flex items-start gap-2 text-sm text-gray-700">
                      <FaMapMarkerAlt className="mt-0.5 shrink-0 text-[#ff4d2d]" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-gray-900">{address.label}</span>
                        <span className="block">{address.text}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(address._id)}
                      aria-label={`Remove ${address.label} address`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#ff4d2d] hover:bg-orange-50"
                    >
                      <FaTrashAlt size={13} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {addresses.length < 5 && (
              <form onSubmit={handleAddAddress} className="space-y-3 border-t border-gray-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  {['Home', 'Office', 'Other'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={label === option}
                      onClick={() => setLabel(option)}
                      className={`rounded-full border px-3 py-1 text-sm ${
                        label === option ? 'border-[#ff4d2d] bg-[#ff4d2d] text-white' : 'border-gray-300 text-gray-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                  <input
                    value={addressText}
                    onChange={(event) => setAddressText(event.target.value)}
                    placeholder="House no, street, area, city"
                    className={inputClass}
                  />
                </label>
                {addressMessage && (
                  <p role="status" className="text-sm text-gray-700">
                    {addressMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isAdding || !addressText.trim()}
                  className="rounded-lg border border-[#ff4d2d] px-5 py-2 text-sm font-semibold text-[#ff4d2d] transition hover:bg-orange-50 disabled:opacity-60"
                >
                  {isAdding ? 'Saving...' : 'Save Address'}
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

export default Profile
