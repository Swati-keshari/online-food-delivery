import { useEffect, useRef, useState } from 'react'
import { FaUtensils } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { createMenuItem } from '../lib/items'
import { setMyShopData } from '../redux/ownerSlice'

const inputClassName =
  'w-full rounded-lg border border-gray-500 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#ff4d2d] focus:ring-2 focus:ring-[#ff4d2d]/20'

const categories = [
  'Snacks',
  'Main Course',
  'Desserts',
  'Pizza',
  'Burgers',
  'Sandwiches',
  'South Indian',
  'North Indian',
  'Chinese',
  'Fast Food',
  'Others',
]

const AddItem = ({ location }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.user.userData)
  const { myShopData, myShopLoading, myShopError } = useSelector((state) => state.owner)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const previewUrl = useRef('')

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    },
    [],
  )

  const handleImageChange = (event) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    const file = event.target.files?.[0]
    previewUrl.current = file ? URL.createObjectURL(file) : ''
    setImagePreview(previewUrl.current)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const formData = new FormData(event.currentTarget)
      formData.set('shopId', myShopData._id)
      const description = (formData.get('description') || '').toString().trim()
      if (!description) {
        formData.set('description', 'Freshly prepared and full of flavor.')
      }

      const shop = await createMenuItem(formData)
      dispatch(setMyShopData(shop))
      setIsSaved(true)
    } catch (requestError) {
      setError(requestError.message || 'Unable to add the food item.')
    } finally {
      setIsSaving(false)
    }
  }

  if (user?.role !== 'owner') return <Navigate to="/home" replace />
  if (!myShopLoading && !myShopData) return <Navigate to="/home" replace />
  if (isSaved) return <Navigate to="/home" replace />

  return (
    <main className="min-h-screen bg-[#fffaf7]">
      <Nav
        role="owner"
        fullName={user?.fullName}
        city={location.city}
        setCity={location.setCity}
        cityLoading={location.loading}
        cityError={location.error}
      />
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label="Go back to home"
          className="absolute left-4 top-5 flex h-10 w-10 items-center justify-center rounded-full text-[#ff4d2d] transition hover:bg-orange-100 sm:left-6"
        >
          <IoArrowBack className="h-7 w-7" aria-hidden="true" />
        </button>

        <section className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-6 shadow-xl sm:p-8">
          {myShopLoading ? (
            <p className="text-center text-sm text-gray-600">Loading your shop...</p>
          ) : myShopError ? (
            <p role="alert" className="text-center text-sm text-red-600">{myShopError}</p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#fff1ce]">
                  <FaUtensils className="h-10 w-10 text-[#ff3d1f]" aria-hidden="true" />
                </div>
                <h1 className="text-[28px] font-bold text-gray-900">Add Food</h1>
                <p className="mt-1 text-sm text-gray-600">Add a dish to {myShopData.name}</p>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Name
                <input
                  className={`${inputClassName} mt-1`}
                  name="name"
                  placeholder="Enter Food Name"
                  required
                  maxLength={120}
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Food Image
                <input
                  className={`${inputClassName} mt-1 file:mr-3 file:border-0 file:bg-transparent file:text-sm`}
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  onChange={handleImageChange}
                  required
                />
                <span className="mt-1 block text-xs font-normal text-gray-500">Maximum 5 MB.</span>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Selected food item"
                    className="mt-3 h-44 w-full rounded-lg border border-gray-500 object-cover"
                  />
                )}
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Price
                <input
                  className={`${inputClassName} mt-1`}
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1 block">Select Category</span>
                <select
                  className={`${inputClassName} px-4`}
                  name="category"
                  required
                  defaultValue="Snacks"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1 block">Select Food Type</span>
                <select
                  className={`${inputClassName} px-4`}
                  name="foodType"
                  defaultValue="veg"
                >
                  <option value="veg">veg</option>
                  <option value="non-veg">non-veg</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Description
                <textarea
                  className={`${inputClassName} mt-1 min-h-24 resize-none`}
                  name="description"
                  placeholder="Write a short description..."
                  maxLength={1000}
                />
              </label>

              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-lg bg-[#ff4d2d] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e64327] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

export default AddItem
