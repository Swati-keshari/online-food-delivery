import { useState } from 'react'
import { useSelector } from 'react-redux'
import Nav from '../components/Nav'
import OwnerDashboard from '../components/OwnerDashboard'
import UserDashboard from '../components/UserDashboard'
import DilveryBoy from '../components/DilveryBoy'

const Home = ({ location }) => {
  const user = useSelector((state) => state.user.userData)
  const [searchValue, setSearchValue] = useState('')

  if (user?.role === 'owner') {
    return <OwnerDashboard user={user} location={location} />
  }

  if (user?.role === 'user') {
    return (
      <>
        <Nav
          role={user?.role}
          fullName={user?.fullName}
          city={location.city}
          setCity={location.setCity}
          cityLoading={location.loading}
          cityError={location.error}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
        <UserDashboard
          city={location.city}
          detectedCity={location.detectedCity}
          latitude={location.latitude}
          longitude={location.longitude}
          cityLoading={location.loading}
          cityError={location.error}
          searchValue={searchValue}
        />
      </>
    )
  }

  return (
    <main className="min-h-screen bg-[#fff9f6]">
      <Nav
        role={user?.role}
        fullName={user?.fullName}
        city={location.city}
        setCity={location.setCity}
        cityLoading={location.loading}
        cityError={location.error}
      />
      {user?.role === 'deliveryBoy' && (
        <DilveryBoy user={user} latitude={location.latitude} longitude={location.longitude} />
      )}
    </main>
  )
}

export default Home