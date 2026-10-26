import { FaPen, FaTrashAlt } from 'react-icons/fa'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { deleteMenuItem, setItemAvailability } from '../lib/items'
import { setMyShopData } from '../redux/ownerSlice'

const OwnerItemCard = ({ data, apiUrl }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const fallbackImage =
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80'

  const imageUrl = data?.image
    ? data.image.startsWith('http')
      ? data.image
      : `${apiUrl}${data.image}`
    : fallbackImage

  const itemName = data?.name ?? 'Food Item'
  const itemPrice = Number(data?.price ?? 0)
  const itemCategory = data?.category ?? 'General'
  const itemFoodType = data?.foodType === 'non-veg' ? 'Non-veg' : 'Veg'
  const itemDescription = data?.description?.trim() || 'Freshly prepared and full of flavor.'

  const handleEdit = () => {
    if (data?._id) {
      navigate(`/owner/edit-item/${data._id}`)
    } else {
      navigate('/owner/add-item')
    }
  }

  const isAvailable = data?.isAvailable !== false

  const handleToggleStock = async () => {
    try {
      dispatch(setMyShopData(await setItemAvailability(data._id, !isAvailable)))
    } catch (error) {
      alert(error.message || 'Unable to update the item.')
    }
  }

  const handleDelete = async () => {
    if (!data?._id) return

    const confirmed = window.confirm(`Delete "${itemName}" from your menu?`)
    if (!confirmed) return

    try {
      const updatedShop = await deleteMenuItem(data._id)
      dispatch(setMyShopData(updatedShop))
    } catch (error) {
      alert(error.message || 'Unable to delete the food item.')
    }
  }

  return (
    <article
      className={`flex overflow-hidden rounded-lg border border-[#ff4d2d] bg-white shadow-md transition-shadow hover:shadow-lg ${
        isAvailable ? '' : 'opacity-70'
      }`}
    >
      <img
        src={imageUrl}
        alt={itemName}
        className="h-auto min-h-32 w-32 shrink-0 object-cover sm:w-36"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = fallbackImage
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
        <div>
          <h3 className="truncate font-semibold text-[#ff4d2d]">{itemName}</h3>
          <p className="mt-1 text-sm text-gray-700">
            <span className="font-medium text-gray-800">Category:</span> {itemCategory}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium text-gray-800">Food Type:</span> {itemFoodType}
          </p>
          {itemDescription && (
            <p className="mt-1 line-clamp-1 text-xs text-gray-500">{itemDescription}</p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-semibold text-[#ff4d2d]">₹{itemPrice.toFixed(2)}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleStock}
              aria-pressed={isAvailable}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                isAvailable ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {isAvailable ? 'In stock' : 'Out of stock'}
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#ff4d2d] transition hover:bg-orange-50"
              aria-label="Edit item"
              title="Edit item"
            >
              <FaPen size={14} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#ff4d2d] transition hover:bg-orange-50"
              aria-label="Delete item"
              title="Delete item"
            >
              <FaTrashAlt size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default OwnerItemCard
