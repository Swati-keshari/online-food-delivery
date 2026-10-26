import { useEffect, useRef, useState } from 'react'
import { FaUtensils } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import Nav from '../components/Nav'
import { editMenuItem, getMenuItem } from '../lib/items'
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

const getImageUrl = (image) => {
  if (!image) return ''
  if (image.startsWith('http')) return image

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  return `${apiUrl}${image}`
}

const EditItem = ({ location }) => {
  const { itemId } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.user.userData)
  const myShopData = useSelector((state) => state.owner.myShopData)
  const shopItem = myShopData?.items?.find((item) => item._id === itemId) || null

  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingItem, setIsLoadingItem] = useState(true)
  const [error, setError] = useState('')
  const [currentItem, setCurrentItem] = useState(shopItem)
  const previewUrl = useRef('')
  // Read inside the load effect without re-running it: the shop list arriving later
  // must not reset fields the owner is already editing.
  const shopItemRef = useRef(shopItem)
  // Declared before the load effect, so it runs first and the load sees the latest item.
  useEffect(() => {
    shopItemRef.current = shopItem
  }, [shopItem])

  const [name, setName] = useState(shopItem?.name || '')
  const [price, setPrice] = useState(shopItem?.price ?? '')
  const [category, setCategory] = useState(shopItem?.category || 'Snacks')
  const [foodType, setFoodType] = useState(shopItem?.foodType || 'veg')
  const [description, setDescription] = useState(shopItem?.description || '')
  const [imagePreview, setImagePreview] = useState(getImageUrl(shopItem?.image))

  useEffect(() => {
    let isActive = true

    const loadItem = async () => {
      setIsLoadingItem(true)
      setError('')

      try {
        const item = shopItemRef.current || await getMenuItem(itemId)
        if (!isActive) return

        setCurrentItem(item)
        setName(item.name || '')
        setPrice(item.price ?? '')
        setCategory(item.category || 'Snacks')
        setFoodType(item.foodType || 'veg')
        setDescription(item.description || '')
        setImagePreview(getImageUrl(item.image))
      } catch (requestError) {
        if (isActive) setError(requestError.message || 'Unable to load the food item.')
      } finally {
        if (isActive) setIsLoadingItem(false)
      }
    }

    loadItem()
    return () => {
      isActive = false
    }
  }, [itemId])

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
    setImagePreview(previewUrl.current || getImageUrl(currentItem?.image))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('price', String(price))
      formData.append('category', category)
      formData.append('foodType', foodType)
      formData.append('description', (description || '').trim() || 'Freshly prepared and full of flavor.')

      const file = event.currentTarget.image.files?.[0]
      if (file) {
        formData.append('image', file)
      }

      const shop = await editMenuItem(itemId, formData)
      dispatch(setMyShopData(shop))
      navigate('/home')
    } catch (requestError) {
      setError(requestError.message || 'Unable to update the food item.')
    } finally {
      setIsSaving(false)
    }
  }

  if (user?.role !== 'owner') return <Navigate to="/home" replace />
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
          {isLoadingItem ? (
            <p className="text-center text-sm text-gray-600">Loading your item...</p>
          ) : error && !currentItem ? (
            <p role="alert" className="text-center text-sm text-red-600">{error}</p>
          ) : (
            <form key={itemId} className="space-y-4" onSubmit={handleSubmit}>
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#fff1ce]">
                  <FaUtensils className="h-10 w-10 text-[#ff3d1f]" aria-hidden="true" />
                </div>
                <h1 className="text-[28px] font-bold text-gray-900">Edit Food</h1>
                <p className="mt-1 text-sm text-gray-600">Update dish details</p>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Name
                <input
                  className={`${inputClassName} mt-1`}
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1 block">Select Category</span>
                <select
                  className={`${inputClassName} px-4`}
                  name="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                >
                  {categories.map((itemCategory) => (
                    <option key={itemCategory} value={itemCategory}>
                      {itemCategory}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-gray-700">
                <span className="mb-1 block">Select Food Type</span>
                <select
                  className={`${inputClassName} px-4`}
                  name="foodType"
                  value={foodType}
                  onChange={(event) => setFoodType(event.target.value)}
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
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Write a short description..."
                />
              </label>

              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full cursor-pointer rounded-lg bg-[#ff4d2d] px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-orange-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <ClipLoader size={20} color="white" /> : 'Save'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

export default EditItem
