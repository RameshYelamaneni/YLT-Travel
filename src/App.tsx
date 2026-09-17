import { useState, useEffect } from 'react';
import { useNav } from './store/nav';
import { useAuth } from './lib/auth';
import { useTheme, applyTheme } from './store/theme';
import Header from './components/Header';
import HomePage from './components/HomePage';
import LoginModal from './components/LoginModal';
import ResultsPage from './components/ResultsPage';
import SearchWidget from './components/SearchWidget';
import CarMarketplacePage from './components/CarMarketplacePage';
import HelpPage from './components/HelpPage';
import AboutPage from './components/AboutPage';
import AdminPanel from './components/AdminPanel';
import OperatorPortalPage from './components/operator/OperatorPortalPage';
import PartnerPortalPage from './components/partner/PartnerPortalPage';
import MyBookingsPage from './components/MyBookingsPage';
import SettingsPanel from './components/SettingsPanel';
import ChatAssistant from './components/ChatAssistant';
import HotelSearchPage from './components/hotel/HotelSearchPage';
import HotelResultsPage from './components/hotel/HotelResultsPage';
import HotelDetailsPage from './components/hotel/HotelDetailsPage';
import HotelCheckoutPage from './components/hotel/HotelCheckoutPage';
import HotelBookingConfirmationPage from './components/hotel/HotelBookingConfirmationPage';
import Footer from './components/Footer';

export default function App() {
  const { view, go } = useNav();
  const { user, loading, signOut, isAgent, isAdmin } = useAuth();
  const isOperator = isAdmin && (user?.role === 'operator' || user?.role === 'manager');
  const { theme } = useTheme();
  const [loginModal, setLoginModal] = useState<{ open: boolean; message?: string }>({ open: false });
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => { applyTheme(theme); }, [theme]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crimson-500 border-t-transparent" />
      </div>
    );
  }

  function gateAction(action: string, proceed: () => void) {
    if (!user) {
      setPendingAction(() => proceed);
      setLoginModal({ open: true, message: `Please sign in to ${action}.` });
    } else {
      proceed();
    }
  }

  function onLoginClose() {
    setLoginModal({ open: false });
    if (pendingAction && user) { pendingAction(); setPendingAction(null); }
    else { setPendingAction(null); }
  }

  const isErpView = view.name === 'partner' || view.name === 'operator';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      {!isErpView && <Header onLoginClick={() => setLoginModal({ open: true })} />}

      <main>
        {view.name === 'home' && <HomePage />}
        {view.name === 'results' && (
          <ResultsPage
            from={view.from} to={view.to} date={view.date} returnDate={view.returnDate} go={go}
            onRequireAuth={(action, proceed) => gateAction(action, proceed ?? (() => {}))}
          />
        )}
        {view.name === 'routes' && (
          <div className="container-fluid py-10">
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Bus Routes</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Search for buses across South India.</p>
            <div className="mt-6"><SearchWidget /></div>
          </div>
        )}
        {view.name === 'offers' && (
          <div className="container-fluid py-20 text-center">
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Offers</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Special fares and seasonal discounts coming soon.</p>
          </div>
        )}
        {view.name === 'about' && <AboutPage />}
        {view.name === 'dashboard' && (
          <div className="container-fluid py-20 text-center">
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Your Dashboard</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Bookings and trip history will appear here.</p>
          </div>
        )}
        {view.name === 'admin' && (isOperator ? <OperatorPortalPage /> : isAdmin ? <AdminPanel /> : isAgent ? <PartnerPortalPage /> : <MyBookingsPage />)}
        {view.name === 'operator' && ((isAgent || isAdmin) ? <OperatorPortalPage /> : <MyBookingsPage />)}
        {view.name === 'partner' && (isAgent ? <PartnerPortalPage /> : <MyBookingsPage />)}
        {view.name === 'bookings' && <MyBookingsPage />}
        {view.name === 'cars' && (
          <CarMarketplacePage go={go} onRequireAuth={(action, proceed) => gateAction(action, proceed ?? (() => {}))} />
        )}
        {view.name === 'hotels' && <HotelSearchPage go={go} />}
        {view.name === 'hotelResults' && <HotelResultsPage go={go} />}
        {view.name === 'hotelDetails' && <HotelDetailsPage hotelId={view.hotelId} go={go} />}
        {view.name === 'hotelCheckout' && <HotelCheckoutPage hotelId={view.hotelId} roomId={view.roomId} go={go} />}
        {view.name === 'hotelConfirmation' && <HotelBookingConfirmationPage booking={view.booking} go={go} />}
        {view.name === 'help' && <HelpPage go={go} />}
      </main>

      <LoginModal
        open={loginModal.open}
        message={loginModal.message}
        onClose={onLoginClose}
      />
      <SettingsPanel />
      <ChatAssistant />
      <Footer />
    </div>
  );
}
