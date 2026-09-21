import { useState, useEffect } from 'react';
import { useNav } from './store/nav';
import { useAuth } from './lib/auth';
import { useTheme, applyTheme } from './store/theme';
import Header from './components/Header';
import HomePage from './components/HomePage';
import AccountDrawer from './components/AccountDrawer';
import ResultsPage from './components/ResultsPage';
import SearchWidget from './components/SearchWidget';
import CarMarketplacePage from './components/CarMarketplacePage';
import HelpPage from './components/HelpPage';
import CareersPage from './components/CareersPage';
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
import FeedbackPage from './components/FeedbackPage';
import Footer from './components/Footer';
import OffersForYou from './components/OffersForYou';
import ErrorBoundary from './components/ErrorBoundary';
import PartnerOnboardPage from './components/onboard/PartnerOnboardPage';
import PackagesPage from './components/PackagesPage';

export default function App() {
  const { view, go } = useNav();
  const { user, loading, isAgent, isAdmin } = useAuth();
  const isOperator = isAdmin && (user?.role === 'operator' || user?.role === 'manager');
  const { theme } = useTheme();
  const [loginModal, setLoginModal] = useState<{ open: boolean; message?: string }>({ open: false });
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => { applyTheme(theme); }, [theme]);

  useEffect(() => {
    if (loading) return;
    const staffView = view.name === 'partner' || view.name === 'admin' || view.name === 'operator';
    if (!staffView) return;
    let storedType = '';
    let storedRole = '';
    try {
      const raw = sessionStorage.getItem('ylt_auth_user') || localStorage.getItem('ylt_auth_user');
      if (raw) {
        const s = JSON.parse(raw) as { type?: string; role?: string };
        storedType = s.type || '';
        storedRole = s.role || '';
      }
    } catch { /* ignore */ }
    const storedAgent = storedType === 'agent';
    const storedAdmin = storedType === 'admin';
    const storedOperator = storedAdmin && (storedRole === 'operator' || storedRole === 'manager');
    const ok =
      (view.name === 'partner' && (isAgent || storedAgent)) ||
      (view.name === 'operator' && (isAgent || isAdmin || storedAgent || storedOperator)) ||
      (view.name === 'admin' && (isAdmin || isAgent || storedAdmin || storedAgent));
    if (!ok) go({ name: 'home' });
  }, [loading, view.name, isAgent, isAdmin, go]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const token = q.get('rate') || q.get('feedback');
    if (token) go({ name: 'feedback', token });
    if (q.get('login') === '1' && !user) {
      setLoginModal({ open: true, message: 'Your session ended after 30 minutes of inactivity. Please sign in again.' });
    }
  }, [go, user]);

  if (loading && !user && view.name !== 'onboard') {
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

  const isErpView =
    (view.name === 'partner' && isAgent) ||
    (view.name === 'operator' && (isAgent || isAdmin));
  const hideChrome = isErpView || view.name === 'feedback' || view.name === 'onboard';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      {!hideChrome && <Header onLoginClick={() => setLoginModal({ open: true })} />}

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
        {view.name === 'offers' && <OffersPage go={go} />}
        {view.name === 'about' && <AboutPage />}
        {view.name === 'dashboard' && (
          <div className="container-fluid py-20 text-center">
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Your Dashboard</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Bookings and trip history will appear here.</p>
          </div>
        )}
        {view.name === 'admin' && (isOperator ? <OperatorPortalPage /> : isAdmin ? <AdminPanel /> : isAgent ? (
          <ErrorBoundary fallbackLabel="Partner ERP failed to render."><PartnerPortalPage /></ErrorBoundary>
        ) : <MyBookingsPage />)}
        {view.name === 'operator' && ((isAgent || isAdmin) ? <OperatorPortalPage /> : <MyBookingsPage />)}
        {view.name === 'partner' && (isAgent ? (
          <ErrorBoundary fallbackLabel="Partner ERP failed to render."><PartnerPortalPage /></ErrorBoundary>
        ) : <MyBookingsPage />)}
        {view.name === 'bookings' && <MyBookingsPage />}
        {view.name === 'cars' && (
          <CarMarketplacePage go={go} onRequireAuth={(action, proceed) => gateAction(action, proceed ?? (() => {}))} />
        )}
        {view.name === 'hotels' && <HotelSearchPage go={go} />}
        {view.name === 'hotelResults' && <HotelResultsPage go={go} />}
        {view.name === 'hotelDetails' && <HotelDetailsPage hotelId={view.hotelId} go={go} />}
        {view.name === 'hotelCheckout' && <HotelCheckoutPage hotelId={view.hotelId} roomId={view.roomId} go={go} />}
        {view.name === 'hotelConfirmation' && <HotelBookingConfirmationPage booking={view.booking} go={go} />}
        {view.name === 'packages' && <PackagesPage slug={view.slug} />}
        {view.name === 'help' && <HelpPage go={go} />}
        {view.name === 'careers' && <CareersPage />}
        {view.name === 'feedback' && <FeedbackPage token={view.token} />}
        {view.name === 'onboard' && <PartnerOnboardPage kind={view.kind} screen={view.screen} />}
      </main>

      <AccountDrawer
        open={loginModal.open}
        message={loginModal.message}
        startOnLogin={Boolean(loginModal.message)}
        onClose={onLoginClose}
      />
      <SettingsPanel />
      {!hideChrome && <ChatAssistant />}
      {!hideChrome && <Footer />}
    </div>
  );
}

function OffersPage({ go }: { go: (v: any) => void }) {
  return (
    <div className="pb-16" style={{ backgroundColor: 'var(--bg-page)' }}>
      <OffersForYou go={go} variant="page" />
    </div>
  );
}
