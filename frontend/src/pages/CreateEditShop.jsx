import { useEffect, useRef, useState } from 'react'
import { FaUtensils } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import { createMyShop, editMyShop } from '../lib/shops'
import { setMyShopData, setMyShopError, setMyShopNotFound } from '../redux/ownerSlice'

const inputClassName =
  'w-full rounded-lg border border-gray-400 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#ff4d2d] focus:ring-2 focus:ring-[#ff4d2d]/20'

const CreateEditShop = ({ location, isEditing = false }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.user.userData)
  const { myShopData, myShopLoading, myShopError } = useSelector(
    (state) => state.owner,
  )
  const [isCreatingShop, setIsCreatingShop] = useState(false)
  const [createShopError, setCreateShopError] = useState('')
  const [city, setCity] = useState(null)
  const [state, setState] = useState(null)
  const [address, setAddress] = useState(null)
  const [shopImagePreview, setShopImagePreview] = useState('')
  const shopImagePreviewUrl = useRef('')
  const shopImageInput = useRef(null)

  useEffect(() => {
    return () => {
      if (shopImagePreviewUrl.current) URL.revokeObjectURL(shopImagePreviewUrl.current)
    }
  }, [])

  const handleShopImageChange = (event) => {
    if (shopImagePreviewUrl.current) {
      URL.revokeObjectURL(shopImagePreviewUrl.current)
      shopImagePreviewUrl.current = ''
    }

    const file = event.target.files?.[0]
    if (!file) {
      setShopImagePreview('')
      return
    }

    shopImagePreviewUrl.current = URL.createObjectURL(file)
    setShopImagePreview(shopImagePreviewUrl.current)
  }

  const handleRemoveShopImage = () => {
    if (shopImagePreviewUrl.current) {
      URL.revokeObjectURL(shopImagePreviewUrl.current)
      shopImagePreviewUrl.current = ''
    }
    setShopImagePreview('')
    if (shopImageInput.current) shopImageInput.current.value = ''
  }

  const getShopCoordinates = () => {
    if (location.latitude != null && location.longitude != null) {
      return Promise.resolve({
        latitude: location.latitude,
        longitude: location.longitude,
      })
    }

    if (!navigator.geolocation) {
      return Promise.reject(new Error('Location is not supported by this browser.'))
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
        (error) => {
          const message =
            error.code === error.PERMISSION_DENIED
              ? 'Allow location access in your browser to save your shop.'
              : 'Could not detect your location. Please try again.'
          reject(new Error(message))
        },
        { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 },
      )
    })
  }

  const handleCreateShop = async (event) => {
    event.preventDefault()
    setCreateShopError('')
    setIsCreatingShop(true)

    const formData = new FormData(event.currentTarget)

    try {
      let shop
      if (isEditing) {
        shop = await editMyShop(myShopData._id, formData)
      } else {
        const { latitude, longitude } = await getShopCoordinates()
        formData.set('latitude', String(latitude))
        formData.set('longitude', String(longitude))
        shop = await createMyShop(formData)
      }
      dispatch(setMyShopData(shop))
      dispatch(setMyShopNotFound(false))
      dispatch(setMyShopError(''))
      navigate('/home', { replace: true })
    } catch (error) {
      setCreateShopError(error.message || 'Unable to create your shop.')
    } finally {
      setIsCreatingShop(false)
    }
  }

  if (user?.role !== 'owner') {
    return <Navigate to="/home" replace />
  }

  if (isEditing && !myShopLoading && !myShopData) {
    if (!myShopError) return <Navigate to="/home" replace />
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-orange-50 to-white p-6">
      <button
        type="button"
        onClick={() => navigate('/home')}
        aria-label="Go back to home"
        className="absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full text-[#ff4d2d] transition hover:bg-orange-100"
      >
        <IoArrowBack className="h-7 w-7" aria-hidden="true" />
      </button>
      <section className="w-100 max-w-full rounded-2xl border border-orange-100 bg-white p-5 shadow-xl">
        {myShopLoading ? (
          <p className="text-center text-sm text-gray-600">Checking your shop...</p>
        ) : isEditing && myShopError && !myShopData ? (
          <p role="alert" className="text-sm text-red-600">{myShopError}</p>
        ) : isEditing ? (
          myShopData ? (
            <form className="space-y-4" onSubmit={handleCreateShop}>
              <div className="mb-6 flex flex-col items-center">
                <div className="mb-4 flex h-22 w-22 items-center justify-center rounded-full bg-[#fff1ce]">
                  <FaUtensils className="h-10 w-10 text-[#ff3d1f]" aria-hidden="true" />
                </div>
                <h1 className="text-[28px] font-bold text-gray-900">Edit Shop</h1>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Name
                <input
                  className={`${inputClassName} mt-1`}
                  name="name"
                  placeholder="Enter Shop Name"
                  defaultValue={myShopData.name}
                  required
                  maxLength={120}
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Shop image
                <input
                  className={`${inputClassName} mt-1 file:mr-3 file:border-0 file:bg-transparent file:text-sm`}
                  name="image"
                  type="file"
                  accept="image/*"
                  ref={shopImageInput}
                  onChange={handleShopImageChange}
                />
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  Optional. Maximum 5 MB.
                </span>
                {(shopImagePreview || myShopData.image) && (
                  <div className="mt-3">
                    <img
                      src={
                        shopImagePreview ||
                        (myShopData.image.startsWith('http')
                          ? myShopData.image
                          : `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')}${myShopData.image}`)
                      }
                      alt="Shop"
                      className="h-32 w-full rounded-lg border border-gray-200 object-cover"
                    />
                    {shopImagePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveShopImage}
                        className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Remove selected image
                      </button>
                    )}
                  </div>
                )}
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-gray-700">
                  City
                  <input
                    className={`${inputClassName} mt-1`}
                    name="city"
                    placeholder="City"
                    value={city ?? myShopData.address?.city ?? ''}
                    onChange={(event) => setCity(event.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  State
                  <input
                    className={`${inputClassName} mt-1`}
                    name="state"
                    placeholder="State"
                    value={state ?? myShopData.address?.state ?? ''}
                    onChange={(event) => setState(event.target.value)}
                    required
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Address
                <textarea
                  className={`${inputClassName} mt-1`}
                  name="address"
                  placeholder="Enter Shop Address"
                  rows={2}
                  value={address ?? myShopData.address?.street ?? ''}
                  onChange={(event) => setAddress(event.target.value)}
                  required
                />
              </label>

              {createShopError && (
                <p role="alert" className="text-sm text-red-600">{createShopError}</p>
              )}

              <button
                type="submit"
                disabled={isCreatingShop}
                className="w-full rounded-lg bg-[#ff4d2d] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e64327] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingShop ? 'Saving...' : 'Update shop'}
              </button>
            </form>
          ) : (
            <p className="text-center text-sm text-gray-600">Loading your shop...</p>
          )
        ) : (
          <form className="space-y-4" onSubmit={handleCreateShop}>
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-4 flex h-22 w-22 items-center justify-center rounded-full bg-[#fff1ce]">
                <FaUtensils className="h-10 w-10 text-[#ff3d1f]" aria-hidden="true" />
              </div>
              <h1 className="text-[28px] font-bold text-gray-900">Add Shop</h1>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              Name
              <input
                className={`${inputClassName} mt-1`}
                name="name"
                placeholder="Enter Shop Name"
                required
                maxLength={120}
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              shop Image
              <input
                className={`${inputClassName} mt-1 file:mr-3 file:border-0 file:bg-transparent file:text-sm`}
                name="image"
                type="file"
                accept="image/*"
                ref={shopImageInput}
                onChange={handleShopImageChange}
                required
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">Maximum 5 MB.</span>
              {shopImagePreview && (
                <div className="mt-3">
                  <img
                    src={shopImagePreview}
                    alt="Selected shop"
                    className="h-32 w-full rounded-lg border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveShopImage}
                    className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-gray-700">
                City
                <input
                  className={`${inputClassName} mt-1`}
                  name="city"
                  placeholder="City"
                  value={city ?? location.city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                State
                <input
                  className={`${inputClassName} mt-1`}
                  name="state"
                  placeholder="State"
                  value={state ?? location.state}
                  onChange={(event) => setState(event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-gray-700">
              Address
              <textarea
                className={`${inputClassName} mt-1`}
                name="address"
                placeholder="Enter Shop Address"
                rows={2}
                value={address ?? location.address}
                onChange={(event) => setAddress(event.target.value)}
                required
              />
            </label>

            {createShopError && (
              <p role="alert" className="text-sm text-red-600">{createShopError}</p>
            )}

            <button
              type="submit"
              disabled={isCreatingShop}
              className="w-full rounded-lg bg-[#ff4d2d] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e64327] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingShop ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default CreateEditShop