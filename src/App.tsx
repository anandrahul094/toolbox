import { Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Favourites from './pages/Favourites'
import Pockets, { PocketDetail, StarterPocket } from './pages/Pockets'
import Recent from './pages/Recent'
import Settings from './pages/Settings'
import ToolPage from './pages/ToolPage'
import NotFound from './pages/NotFound'
import Feedback from './pages/Feedback'
import { Privacy, Terms } from './pages/Legal'
import { ForgotPassword, Join, Login, ResetPassword } from './pages/Auth'

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/category/:slug" element={<Explore />} />
        <Route path="/favourites" element={<Favourites />} />
        <Route path="/pockets" element={<Pockets />} />
        <Route path="/pockets/starter/:slug" element={<StarterPocket />} />
        <Route path="/pockets/:id" element={<PocketDetail />} />
        <Route path="/recent" element={<Recent />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/tool/:id" element={<ToolPage />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  )
}
