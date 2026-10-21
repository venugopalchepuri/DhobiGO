/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { localDB } from './db/indexedDb';
import {
  AppSettings,
  ClothingCategory,
  IDProofCredential,
  LaundryItem,
  LaundryRecord,
  RegistrationFormData,
  UserProfile,
  UserSession,
} from './types';
import { Header } from './components/Header';
import { Navigation, TabDestination } from './components/Navigation';
import { HomeScreen } from './screens/HomeScreen';
import { AddLaundryScreen } from './screens/AddLaundryScreen';
import { RecordDetailsScreen } from './screens/RecordDetailsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { SignInScreen } from './screens/SignInScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ChitViewerModal } from './components/ChitViewerModal';
import { IDProofModal } from './components/IDProofModal';
import { hashPassword, verifyPassword } from './utils/auth';
import { WifiOff, Loader2 } from 'lucide-react';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [authView, setAuthView] = useState<'welcome' | 'signin' | 'register' | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Navigation & Screen View State
  const [currentTab, setCurrentTab] = useState<TabDestination>('home');
  const [activeView, setActiveView] = useState<
    'tabs' | 'add_laundry' | 'edit_laundry' | 'record_details' | 'profile'
  >('tabs');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // App Database State (Strictly account-scoped)
  const [records, setRecords] = useState<LaundryRecord[]>([]);
  const [itemsByRecordId, setItemsByRecordId] = useState<Record<string, LaundryItem[]>>({});
  const [categories, setCategories] = useState<ClothingCategory[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    defaultDhobiName: '',
    currencySymbol: '₹',
    autoOcrEnabled: true,
    themeMode: 'light',
  });
  const [nextRecordId, setNextRecordId] = useState<string>('DT-0001');
  const [idProof, setIdProof] = useState<IDProofCredential | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chit Fullscreen Zoom Modal State
  const [zoomChitUrl, setZoomChitUrl] = useState<string | null>(null);
  const [zoomChitTitle, setZoomChitTitle] = useState<string>('Dhobi Slip');

  // ID Proof Modal State
  const [isIDProofModalOpen, setIsIDProofModalOpen] = useState(false);

  // Device Frame View State (Phone Frame vs Full Responsive)
  const [isMobileFrame, setIsMobileFrame] = useState(true);

  // Online status indicator
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  /**
   * Refreshes data strictly scoped to the target user ID.
   * If user is not authenticated and not in guest mode, clears all in-memory records.
   */
  const refreshData = useCallback(async (targetUserId?: string) => {
    const activeUserId = targetUserId || currentUser?.userId || (isGuestMode ? 'guest' : '');

    try {
      if (!activeUserId) {
        // Immediate clean in-memory state teardown
        setRecords([]);
        setItemsByRecordId({});
        setIdProof(null);
        setSelectedRecordId(null);
        return;
      }

      // Fetch ONLY this user's records from IndexedDB
      const userRecords = await localDB.getAllRecords(activeUserId);
      setRecords(userRecords);

      // Load items mapped by record ID
      const itemsMap: Record<string, LaundryItem[]> = {};
      await Promise.all(
        userRecords.map(async (r) => {
          const items = await localDB.getItemsForRecord(r.id, activeUserId);
          itemsMap[r.id] = items;
        })
      );
      setItemsByRecordId(itemsMap);

      const allCats = await localDB.getAllCategories();
      setCategories(allCats);

      const appSettings = await localDB.getSettings();
      setSettings(appSettings);

      const currentIDProof = await localDB.getIDProof(activeUserId);
      setIdProof(currentIDProof);

      const nextId = await localDB.getNextRecordId(activeUserId);
      setNextRecordId(nextId);
    } catch (err) {
      console.error('Failed to load scoped data from IndexedDB:', err);
    }
  }, [currentUser?.userId, isGuestMode]);

  // Initialize DB and authenticate session on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        await localDB.init();

        // Check if an active session exists
        const session = await localDB.getActiveSession();
        if (session) {
          const user = await localDB.getUserById(session.userId);
          if (user) {
            setCurrentUser(user);
            setCurrentSession(session);
            setAuthView(null);
            await refreshData(user.userId);
          } else {
            setAuthView('welcome');
          }
        } else {
          // No active session: show welcome onboarding screen
          setAuthView('welcome');
        }
      } catch (err) {
        console.error('Database initialization error:', err);
        setAuthView('welcome');
      } finally {
        setIsLoading(false);
      }
    };
    initApp();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshData]);

  // Auth Flow: Email & Password Registration (Direct, no OTP)
  const handleRegisterSubmit = async (
    formData: RegistrationFormData
  ): Promise<{ success: boolean; errorMessage?: string }> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();

      // Check for existing account
      const existingUser = await localDB.getUserByEmail(normalizedEmail);
      if (existingUser) {
        const msg = `An account with ${normalizedEmail} is already registered. Please sign in instead.`;
        setAuthError(msg);
        return { success: false, errorMessage: msg };
      }

      // Hash password securely with PBKDF2
      const { hash, salt } = await hashPassword(formData.password);
      const nextId = await localDB.getNextUserId();

      const profile: UserProfile = {
        userId: nextId,
        fullName: formData.fullName,
        email: normalizedEmail,
        passwordHash: hash,
        passwordSalt: salt,
        phoneNumber: formData.phoneNumber,
        isStudent: !!formData.isStudent,
        enrollmentNumber: formData.enrollmentNumber,
        university: formData.university,
        course: formData.course,
        yearOfStudy: formData.yearOfStudy,
        batchYear: formData.batchYear,
        roomOrFlatNo: formData.roomOrFlatNo,
        profilePhoto: formData.profilePhoto,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await localDB.saveUserProfile(profile);

      // Auto-create ID proof credential if enrollment number is supplied
      if (profile.enrollmentNumber) {
        const initialProof: IDProofCredential = {
          idType: profile.isStudent ? 'College / Student ID' : 'Employee / Office ID',
          fullName: profile.fullName,
          idNumber: profile.enrollmentNumber,
          phoneNumber: profile.phoneNumber,
          roomOrFlatNo: profile.roomOrFlatNo,
          updatedAt: Date.now(),
        };
        await localDB.saveIDProof(initialProof, profile.userId);
        setIdProof(initialProof);
      }

      // Save persistent session (30 days validity)
      const session: UserSession = {
        userId: profile.userId,
        email: profile.email,
        fullName: profile.fullName,
        token: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      await localDB.saveActiveSession(session);

      // Immediate in-memory state transition: new user starts with empty dashboard!
      setRecords([]);
      setItemsByRecordId({});
      setSelectedRecordId(null);
      setCurrentUser(profile);
      setCurrentSession(session);
      setIsGuestMode(false);
      setAuthView(null);

      await refreshData(profile.userId);
      return { success: true };
    } catch (err) {
      const msg = (err as Error).message;
      setAuthError(msg);
      return { success: false, errorMessage: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth Flow: Email & Password Sign In
  const handleSignInSubmit = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; errorMessage?: string }> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await localDB.getUserByEmail(normalizedEmail);
      if (!existingUser) {
        const msg = `No account found with ${normalizedEmail}. Please check spelling or create an account.`;
        setAuthError(msg);
        return { success: false, errorMessage: msg };
      }

      // Verify password against stored PBKDF2 hash & salt
      if (!existingUser.passwordHash || !existingUser.passwordSalt) {
        const msg = 'Account security credentials error. Please reset your password.';
        setAuthError(msg);
        return { success: false, errorMessage: msg };
      }

      const isValidPassword = await verifyPassword(
        password,
        existingUser.passwordHash,
        existingUser.passwordSalt
      );

      if (!isValidPassword) {
        const msg = 'Incorrect password. Please verify your credentials or reset your password.';
        setAuthError(msg);
        return { success: false, errorMessage: msg };
      }

      // Immediately clear previous user's in-memory data before loading new account
      setRecords([]);
      setItemsByRecordId({});
      setIdProof(null);
      setSelectedRecordId(null);

      // Create persistent session
      const session: UserSession = {
        userId: existingUser.userId,
        email: existingUser.email,
        fullName: existingUser.fullName,
        token: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };

      await localDB.saveActiveSession(session);
      setCurrentUser(existingUser);
      setCurrentSession(session);
      setIsGuestMode(false);
      setAuthView(null);

      await refreshData(existingUser.userId);
      return { success: true };
    } catch (err) {
      const msg = (err as Error).message;
      setAuthError(msg);
      return { success: false, errorMessage: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth Flow: Password Reset Request
  const handleRequestPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; token?: string; errorMessage?: string }> => {
    try {
      const res = await localDB.createPasswordResetToken(email);
      if (!res) {
        return { success: false, errorMessage: 'No account registered with this email address.' };
      }
      return { success: true, token: res.token };
    } catch (err) {
      return { success: false, errorMessage: (err as Error).message };
    }
  };

  // Auth Flow: Password Reset Complete
  const handleCompletePasswordReset = async (
    email: string,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; errorMessage?: string }> => {
    try {
      const { hash, salt } = await hashPassword(newPassword);
      const success = await localDB.resetPasswordWithToken(email, token, hash, salt);
      if (!success) {
        return { success: false, errorMessage: 'Invalid or expired reset code. Please generate a new code.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, errorMessage: (err as Error).message };
    }
  };

  // Sign Out Handler (Instant Teardown of all in-memory user data)
  const handleSignOut = async () => {
    await localDB.clearActiveSession();
    // Clear all in-memory user data immediately
    setRecords([]);
    setItemsByRecordId({});
    setIdProof(null);
    setSelectedRecordId(null);
    setCurrentUser(null);
    setCurrentSession(null);
    setIsGuestMode(false);
    setActiveView('tabs');
    setCurrentTab('home');
    setAuthView('welcome');
  };

  // Delete Account Handler (Google Play Data Safety & GDPR Right to Erasure)
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    await localDB.clearAllUserData(currentUser.userId);
    await handleSignOut();
  };

  // Profile Update Handler
  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    if (!currentUser) return;
    const newProfile: UserProfile = {
      ...currentUser,
      ...updated,
      updatedAt: Date.now(),
    };
    await localDB.saveUserProfile(newProfile);
    setCurrentUser(newProfile);

    // Keep ID proof full name synchronized if exists
    if (idProof && updated.fullName) {
      const updatedProof: IDProofCredential = {
        ...idProof,
        fullName: updated.fullName,
        updatedAt: Date.now(),
      };
      await localDB.saveIDProof(updatedProof, currentUser.userId);
      setIdProof(updatedProof);
    }

    await refreshData(currentUser.userId);
  };

  // Record Save Handler (Add or Edit) - Strictly scoped to authenticated user
  const handleSaveRecord = async (record: LaundryRecord, items: LaundryItem[]) => {
    const activeUserId = currentUser ? currentUser.userId : (isGuestMode ? 'guest' : '');
    if (!activeUserId) {
      setAuthView('welcome');
      return;
    }

    await localDB.saveRecordWithItems(record, items, activeUserId);
    await refreshData(activeUserId);
    setSelectedRecordId(record.id);
    setActiveView('record_details');
  };

  // Delete Record Handler - Enforces user ownership
  const handleDeleteRecord = async (recordId: string) => {
    const activeUserId = currentUser ? currentUser.userId : (isGuestMode ? 'guest' : '');
    if (!activeUserId) return;

    await localDB.deleteRecord(recordId, activeUserId);
    await refreshData(activeUserId);
    setSelectedRecordId(null);
    setActiveView('tabs');
    setCurrentTab('home');
  };

  // Update item return count - Scoped to user
  const handleUpdateItemReturn = async (itemId: string, newQty: number) => {
    const activeUserId = currentUser ? currentUser.userId : (isGuestMode ? 'guest' : '');
    if (!selectedRecordId || !activeUserId) return;
    await localDB.updateItemReturn(selectedRecordId, itemId, newQty, activeUserId);
    await refreshData(activeUserId);
  };

  // Mark all returned in record - Scoped to user
  const handleMarkAllReturned = async () => {
    const activeUserId = currentUser ? currentUser.userId : (isGuestMode ? 'guest' : '');
    if (!selectedRecordId || !activeUserId) return;
    await localDB.markAllReturned(selectedRecordId, activeUserId);
    await refreshData(activeUserId);
  };

  // Force mark collected - Scoped to user
  const handleForceMarkCollected = async () => {
    const activeUserId = currentUser ? currentUser.userId : (isGuestMode ? 'guest' : '');
    if (!selectedRecordId || !activeUserId) return;
    await localDB.setRecordStatus(selectedRecordId, 'collected', activeUserId);
    await refreshData(activeUserId);
  };

  // Category Actions
  const handleAddCategory = async (name: string) => {
    const cat = await localDB.addCategory(name);
    await refreshData();
    return cat;
  };

  const handleToggleCategoryActive = async (id: string, isActive: boolean) => {
    await localDB.toggleCategoryActive(id, isActive);
    await refreshData();
  };

  const handleDeleteCategory = async (id: string) => {
    await localDB.deleteCategory(id);
    await refreshData();
  };

  // Settings Actions
  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    await localDB.saveSettings(newSettings);
    await refreshData();
  };

  // ID Proof Actions (Scoped to current user)
  const handleSaveIDProof = async (proof: IDProofCredential) => {
    const activeUserId = currentUser ? currentUser.userId : (isGuestMode ? 'guest' : '');
    if (!activeUserId) return;
    await localDB.saveIDProof(proof, activeUserId);
    await refreshData(activeUserId);
  };

  const handleDeleteIDProof = async () => {
    const activeUserId = currentUser ? currentUser.userId : (isGuestMode ? 'guest' : '');
    if (!activeUserId) return;
    await localDB.deleteIDProof(activeUserId);
    await refreshData(activeUserId);
  };

  // Navigation handlers
  const handleSelectTab = (tab: TabDestination) => {
    setCurrentTab(tab);
    setActiveView('tabs');
  };

  const handleOpenAddLaundry = () => {
    setSelectedRecordId(null);
    setActiveView('add_laundry');
  };

  const handleOpenRecordDetails = (recordId: string) => {
    // Only open if the record belongs to the active scoped records list
    const exists = records.some((r) => r.id === recordId);
    if (!exists) {
      console.warn('Blocked unauthorized navigation: record not found in user scope.');
      return;
    }
    setSelectedRecordId(recordId);
    setActiveView('record_details');
  };

  const handleBackToMain = () => {
    setSelectedRecordId(null);
    setActiveView('tabs');
  };

  // Currently viewed record in detail screen
  const selectedRecord = selectedRecordId
    ? records.find((r) => r.id === selectedRecordId) || null
    : null;
  const selectedItems = selectedRecord ? itemsByRecordId[selectedRecord.id] || [] : [];

  // Active Screen Title
  let screenTitle = 'DhobiGo';
  if (authView !== null) {
    screenTitle = authView === 'welcome' ? 'Welcome' : authView === 'signin' ? 'Sign In' : 'Register';
  } else if (activeView === 'add_laundry') {
    screenTitle = 'New Laundry Bag';
  } else if (activeView === 'edit_laundry') {
    screenTitle = 'Edit Laundry Bag';
  } else if (activeView === 'record_details') {
    screenTitle = selectedRecord ? `Slip ${selectedRecord.id}` : 'Record Details';
  } else if (activeView === 'profile') {
    screenTitle = 'My Profile';
  } else if (currentTab === 'history') {
    screenTitle = 'Laundry History';
  } else if (currentTab === 'settings') {
    screenTitle = 'Settings & Security';
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Initializing Dhobi Vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F3F5] sm:py-6 flex flex-col items-center justify-start font-sans">
      {/* Device Shell Frame */}
      <div
        className={`w-full min-h-screen sm:min-h-[844px] bg-[#F8F9FA] flex flex-col relative transition-all duration-300 ${
          isMobileFrame
            ? 'max-w-[420px] shadow-2xl sm:rounded-[44px] border border-slate-300/80 overflow-hidden'
            : 'max-w-4xl shadow-md sm:rounded-3xl overflow-hidden'
        }`}
      >
        {/* Android status bar mockup on phone frame */}
        {isMobileFrame && (
          <div className="hidden sm:flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-slate-600 select-none bg-[#F8F9FA]">
            <span>9:41</span>
            <div className="w-20 h-4 bg-slate-900/10 rounded-full mx-auto" />
            <div className="flex items-center gap-1.5 font-mono">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Offline notification banner if offline */}
        {!isOnline && (
          <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline Mode — All changes saved locally on device</span>
          </div>
        )}

        {/* AUTHENTICATION SCREENS (When user is not signed in and in auth flow) */}
        {authView !== null ? (
          <div className="flex-1 px-4 pt-4 overflow-y-auto">
            {authView === 'welcome' ? (
              <WelcomeScreen
                onCreateAccountClick={() => {
                  setAuthError(null);
                  setAuthView('register');
                }}
                onSignInClick={() => {
                  setAuthError(null);
                  setAuthView('signin');
                }}
                onContinueOfflineClick={() => {
                  setIsGuestMode(true);
                  setAuthView(null);
                  refreshData('guest');
                }}
              />
            ) : authView === 'signin' ? (
              <SignInScreen
                onBack={() => {
                  setAuthError(null);
                  setAuthView('welcome');
                }}
                onGoToRegister={() => {
                  setAuthError(null);
                  setAuthView('register');
                }}
                onSubmit={handleSignInSubmit}
                onRequestPasswordReset={handleRequestPasswordReset}
                onCompletePasswordReset={handleCompletePasswordReset}
                isLoading={authLoading}
                userNotFoundMessage={authError}
              />
            ) : authView === 'register' ? (
              <RegisterScreen
                onBack={() => {
                  setAuthError(null);
                  setAuthView('welcome');
                }}
                onGoToSignIn={() => {
                  setAuthError(null);
                  setAuthView('signin');
                }}
                onSubmit={handleRegisterSubmit}
                isLoading={authLoading}
              />
            ) : null}
          </div>
        ) : (
          /* MAIN APPLICATION SCREEN */
          <>
            {/* Top Header */}
            <Header
              isMobileFrame={isMobileFrame}
              onToggleFrame={() => setIsMobileFrame((v) => !v)}
              activeScreenTitle={screenTitle}
              onBack={activeView !== 'tabs' ? handleBackToMain : undefined}
              onNewBagClick={handleOpenAddLaundry}
              onOpenIDProof={() => setIsIDProofModalOpen(true)}
              hasIDProof={!!idProof}
              currentUser={currentUser}
              onOpenProfile={() => {
                if (currentUser) {
                  setActiveView('profile');
                } else {
                  setAuthView('welcome');
                }
              }}
            />

            {/* Main Body Screen Content */}
            <main className="flex-1 px-4 pt-4 overflow-y-auto">
              {activeView === 'profile' && currentUser ? (
                <ProfileScreen
                  user={currentUser}
                  idProof={idProof}
                  onOpenIDProof={() => setIsIDProofModalOpen(true)}
                  onBack={handleBackToMain}
                  onUpdateProfile={handleUpdateProfile}
                  onSignOut={handleSignOut}
                />
              ) : activeView === 'add_laundry' ? (
                <AddLaundryScreen
                  initialRecordId={nextRecordId}
                  defaultDhobiName={settings.defaultDhobiName}
                  categories={categories}
                  onSave={handleSaveRecord}
                  onCancel={handleBackToMain}
                  onAddCustomCategory={handleAddCategory}
                />
              ) : activeView === 'edit_laundry' && selectedRecord ? (
                <AddLaundryScreen
                  initialRecordId={selectedRecord.id}
                  defaultDhobiName={settings.defaultDhobiName}
                  categories={categories}
                  onSave={handleSaveRecord}
                  onCancel={() => setActiveView('record_details')}
                  onAddCustomCategory={handleAddCategory}
                  editingRecord={selectedRecord}
                  editingItems={selectedItems}
                />
              ) : activeView === 'record_details' && selectedRecord ? (
                <RecordDetailsScreen
                  record={selectedRecord}
                  items={selectedItems}
                  idProof={idProof}
                  onOpenIDProof={() => setIsIDProofModalOpen(true)}
                  onBack={handleBackToMain}
                  onEdit={() => setActiveView('edit_laundry')}
                  onDelete={handleDeleteRecord}
                  onUpdateItemReturn={handleUpdateItemReturn}
                  onMarkAllReturned={handleMarkAllReturned}
                  onForceMarkCollected={handleForceMarkCollected}
                  onOpenChitViewer={(imgUrl, title) => {
                    setZoomChitUrl(imgUrl);
                    setZoomChitTitle(title);
                  }}
                />
              ) : currentTab === 'home' ? (
                <HomeScreen
                  records={records}
                  itemsByRecordId={itemsByRecordId}
                  idProof={idProof}
                  onOpenIDProof={() => setIsIDProofModalOpen(true)}
                  currentUser={currentUser}
                  onOpenProfile={() => {
                    if (currentUser) {
                      setActiveView('profile');
                    } else {
                      setAuthView('welcome');
                    }
                  }}
                  onAddLaundryClick={handleOpenAddLaundry}
                  onRecordClick={handleOpenRecordDetails}
                  onViewAllHistory={() => setCurrentTab('history')}
                  onViewChitPhoto={(imgUrl, title) => {
                    setZoomChitUrl(imgUrl);
                    setZoomChitTitle(title);
                  }}
                />
              ) : currentTab === 'history' ? (
                <HistoryScreen
                  records={records}
                  itemsByRecordId={itemsByRecordId}
                  onSelectRecord={handleOpenRecordDetails}
                  onViewChitPhoto={(imgUrl, title) => {
                    setZoomChitUrl(imgUrl);
                    setZoomChitTitle(title);
                  }}
                />
              ) : currentTab === 'settings' ? (
                <SettingsScreen
                  settings={settings}
                  categories={categories}
                  totalRecordsCount={records.length}
                  totalImagesCount={records.filter((r) => r.hasChitImage).length}
                  idProof={idProof}
                  currentUser={currentUser}
                  onOpenProfile={() => setActiveView('profile')}
                  onOpenSignIn={() => setAuthView('welcome')}
                  onSignOut={handleSignOut}
                  onOpenIDProof={() => setIsIDProofModalOpen(true)}
                  onUpdateSettings={handleUpdateSettings}
                  onAddCategory={handleAddCategory}
                  onToggleCategoryActive={handleToggleCategoryActive}
                  onDeleteCategory={handleDeleteCategory}
                  onBackupRestored={async () => {
                    const activeUserId = currentUser ? currentUser.userId : 'guest';
                    await refreshData(activeUserId);
                  }}
                  onDeleteAccount={handleDeleteAccount}
                />
              ) : null}
            </main>

            {/* Bottom Navigation (Only visible on main tab screens) */}
            {activeView === 'tabs' && (
              <Navigation
                currentTab={currentTab}
                onSelectTab={handleSelectTab}
                onAddLaundry={handleOpenAddLaundry}
              />
            )}
          </>
        )}

        {/* Paper Chit Zoom Lightbox Modal */}
        {zoomChitUrl && (
          <ChitViewerModal
            isOpen={!!zoomChitUrl}
            imageUrl={zoomChitUrl}
            title={zoomChitTitle}
            onClose={() => setZoomChitUrl(null)}
          />
        )}

        {/* ID Proof Credential Modal */}
        {isIDProofModalOpen && (
          <IDProofModal
            isOpen={isIDProofModalOpen}
            onClose={() => setIsIDProofModalOpen(false)}
            idProof={idProof}
            onSave={handleSaveIDProof}
            onDelete={handleDeleteIDProof}
          />
        )}
      </div>
    </div>
  );
}
