import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import SignUp from './pages/signUp'
import SignIn from './pages/signIn'
import ForgetPassword from './pages/ForgetPassword'
import CreateEditShop from './pages/CreateEditShop'
import AddItem from './pages/AddItem'
import EditItem from './pages/EditItem'
import Home from './pages/Home'
import CheckOut from './pages/CheckOut'
import MyOrders from './pages/MyOrders'
import OwnerOrders from './pages/OwnerOrders'
import TrackOrderPage from './pages/TrackOrderPage'
import ShopPage from './pages/ShopPage'
import Profile from './pages/Profile'
import useGetCurrentUser from './hooks/useGetCurrentUser'
import useGetCity from './hooks/useGetCity'
import useGetMyShop from './hooks/useGetMyShop'
import useUpdateLocation from './hooks/useUpdateLocation'
import useOrderAlerts from './hooks/useOrderAlerts'
import { socket } from './lib/socket'

const App = () => {
  const { loading } = useGetCurrentUser()
  const location = useGetCity()
  const userData = useSelector((state) => state.user.userData)
  useGetMyShop(userData?.role === 'owner')
  useUpdateLocation(userData?.role === 'deliveryBoy')
  useOrderAlerts(userData?.role)

  // Live updates: (re)connect for whoever is logged in, disconnect on logout.
  const userId = userData?._id
  useEffect(() => {
    if (!userId) return undefined
    socket.connect()
    return () => {
      socket.disconnect()
    }
  }, [userId])

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={userData ? '/home' : '/signin'} replace />} />
      <Route
        path="/home"
        element={userData ? <Home location={location} /> : <Navigate to="/signin" replace />}
      />
      <Route
        path="/owner/create-shop"
        element={
          userData?.role === 'owner' ? (
            <CreateEditShop location={location} />
          ) : (
            <Navigate to={userData ? '/home' : '/signin'} replace />
          )
        }
      />
      <Route
        path="/owner/edit-shop"
        element={
          userData?.role === 'owner' ? (
            <CreateEditShop location={location} isEditing />
          ) : (
            <Navigate to={userData ? '/home' : '/signin'} replace />
          )
        }
      />
      <Route
        path="/owner/add-item"
        element={
          userData?.role === 'owner' ? (
            <AddItem location={location} />
          ) : (
            <Navigate to={userData ? '/home' : '/signin'} replace />
          )
        }
      />
      <Route
        path="/owner/edit-item/:itemId"
        element={
          userData?.role === 'owner' ? (
            <EditItem location={location} />
          ) : (
            <Navigate to={userData ? '/home' : '/signin'} replace />
          )
        }
      />
      <Route
        path="/checkout"
        element={
          userData?.role === 'user' ? (
            <CheckOut location={location} />
          ) : (
            <Navigate to={userData ? '/home' : '/signin'} replace />
          )
        }
      />
      <Route
        path="/owner/orders"
        element={
          userData?.role === 'owner' ? (
            <OwnerOrders />
          ) : (
            <Navigate to={userData ? '/home' : '/signin'} replace />
          )
        }
      />
      <Route
        path="/my-orders"
        element={
          userData?.role === 'user' ? (
            <MyOrders />
          ) : userData?.role === 'owner' ? (
            <OwnerOrders />
          ) : (
            <Navigate to={userData ? '/home' : '/signin'} replace />
          )
        }
      />
      <Route path="/profile" element={userData ? <Profile /> : <Navigate to="/signin" replace />} />
      <Route
        path="/shop/:shopId"
        element={userData?.role === 'user' ? <ShopPage /> : <Navigate to={userData ? '/home' : '/signin'} replace />}
      />
      <Route
        path="/track-order/:orderId"
        element={
          userData?.role === 'user' || userData?.role === 'owner' ? (
            <TrackOrderPage />
          ) : (
            <Navigate to={userData ? '/home' : '/signin'} replace />
          )
        }
      />
      <Route path="/signup" element={userData ? <Navigate to="/home" replace /> : <SignUp />} />
      <Route path="/signin" element={userData ? <Navigate to="/home" replace /> : <SignIn />} />
      <Route path="/forget-password" element={userData ? <Navigate to="/home" replace /> : <ForgetPassword />} />
      <Route path="*" element={<Navigate to={userData ? '/home' : '/signin'} replace />} />
    </Routes>
  )
}

export default App
