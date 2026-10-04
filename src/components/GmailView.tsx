import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/googleAuth';
import {
  fetchUserProfile,
  listGmailMessages,
  getGmailMessageDetail,
  sendGmailEmail,
  deleteGmailMessage,
  GmailMessageSummary,
  GmailMessageDetail,
  GmailUserProfile,
} from '../services/gmailService';
import { User } from 'firebase/auth';
import {
  Mail,
  Send,
  Inbox,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  Shield,
  Sparkles,
  ArrowLeft,
  Paperclip,
  Clock,
  User as UserIcon,
  Filter,
  Check,
  X,
  Building,
  Wrench,
  Package,
} from 'lucide-react';

export const GmailView: React.FC = () => {
  const { productionEntries, machines, maintenanceTickets, qualityRecords, t } = useApp();

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<GmailUserProfile | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Email state
  const [activeMailbox, setActiveMailbox] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Composer state
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Explicit confirmation modal state (MANDATORY per Workspace guidelines)
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'send_email' | 'delete_email';
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    type: 'send_email',
    title: '',
    description: '',
    actionLabel: '',
    onConfirm: async () => {},
  });

  // Listen to Google Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user) => {
        setGoogleUser(user);
        setAuthError(null);
        try {
          const userProfile = await fetchUserProfile();
          setProfile(userProfile);
          loadMessages('inbox');
        } catch (err: any) {
          console.error('Failed to load Gmail profile:', err);
        }
      },
      () => {
        setGoogleUser(null);
        setProfile(null);
        setMessages([]);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setGoogleUser(res.user);
        const userProfile = await fetchUserProfile();
        setProfile(userProfile);
        loadMessages('inbox');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Échec de la connexion à Gmail.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setProfile(null);
      setMessages([]);
      setSelectedMessage(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const loadMessages = async (folder: 'inbox' | 'sent', customQuery = '') => {
    setIsLoadingMessages(true);
    try {
      let q = folder === 'sent' ? 'in:sent' : 'in:inbox';
      if (customQuery) {
        q += ` ${customQuery}`;
      }
      const data = await listGmailMessages(q, 15);
      setMessages(data);
    } catch (err: any) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleOpenMessage = async (summary: GmailMessageSummary) => {
    setIsLoadingDetail(true);
    try {
      const full = await getGmailMessageDetail(summary.id);
      setSelectedMessage(full);
    } catch (err: any) {
      alert(`Impossible d'ouvrir le message: ${err.message}`);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Industrial Template Injectors
  const applyTemplate = (type: 'production' | 'quality' | 'maintenance' | 'stock') => {
    const today = new Date().toISOString().split('T')[0];
    const totalProd = productionEntries.reduce((s, e) => s + e.qtyProduced, 0);
    const totalConf = productionEntries.reduce((s, e) => s + e.qtyConforming, 0);
    const totalRej = productionEntries.reduce((s, e) => s + e.qtyRejected, 0);
    const yieldPct = totalProd > 0 ? ((totalConf / totalProd) * 100).toFixed(1) : '100';

    if (type === 'production') {
      setComposeSubject(`[CTP SMART] Rapport Quotidien Production - ${today}`);
      setComposeTo('direction@ctpsmart.tn');
      setComposeBody(
        `Bonjour,\n\nVoici le point de synthèse de la production pour l'atelier d'injection CTP :\n\n` +
        `• Paires produites : ${totalProd.toLocaleString()} paires\n` +
        `• Paires conformes : ${totalConf.toLocaleString()} (${yieldPct}%)\n` +
        `• Rebuts atelier : ${totalRej.toLocaleString()} paires\n\n` +
        `Activité des presses :\n` +
        machines.map((m) => `  - ${m.code} (${m.name}) : Statut ${m.status.toUpperCase()}`).join('\n') +
        `\n\nSynthèse générée automatiquement depuis l'ERP Industriel CTP SMART.\nBien cordialement,\nL'équipe Production.`
      );
    } else if (type === 'quality') {
      setComposeSubject(`[CTP SMART] Fiche Alerte Qualité Non-Conformité - ${today}`);
      setComposeTo('qualite@ctpsmart.tn');
      setComposeBody(
        `Bonjour Monsieur le Responsable Qualité,\n\nUne alerte qualité a été émise lors du contrôle en pied de machine :\n\n` +
        `• Moule concerné : M-SAB-39 (Sabot Médical Pro Light)\n` +
        `• Défaut constaté : Présence de bulles d'air et bavures d'injection\n` +
        `• Taux de rebut constaté : 2.4% (Seuil max toléré : 1.5%)\n` +
        `• Action corrective demandée : Réajustement de la pression d'injection et contrôle température buse.\n\n` +
        `Merci de valider la reprise de série.\nService Qualité & Métrologie CTP.`
      );
    } else if (type === 'maintenance') {
      setComposeSubject(`[CTP SMART - URGENT] Demande d'Intervention Maintenance Presse EVA`);
      setComposeTo('maintenance@ctpsmart.tn');
      setComposeBody(
        `Bonjour Service Maintenance,\n\nDemande d'intervention prioritaire sur le parc machines :\n\n` +
        `• Machine : EVA #1 (Presse injection rotative 6 postes)\n` +
        `• Symptôme : Baisse anormale de pression hydraulique sur plateau 3\n` +
        `• Degré d'urgence : Élevé (Risque de ralentissement de cadence)\n` +
        `• Opérateur ayant signalé l'anomalie : Youcef Belkacem (Chef Équipe A)\n\n` +
        `Rapport envoyé depuis le terminal atelier CTP SMART.`
      );
    } else if (type === 'stock') {
      setComposeSubject(`[CTP SMART] Seuil Alerte Réapprovisionnement Résine & Colorants`);
      setComposeTo('achats@ctpsmart.tn');
      setComposeBody(
        `Bonjour Direction des Achats,\n\nLe stock de matières premières atteint le seuil de réapprovisionnement :\n\n` +
        `• Granulés EVA Vierge Shore 45 : Reste 12 sacs (300 kg) - Seuil critique : 20 sacs\n` +
        `• Colorant Noir Masterbatch : Reste 8 kg - Consommation estimée 48h\n\n` +
        `Merci d'émettre le bon de commande fournisseur sous 24 heures.\nService Logistique CTP.`
      );
    }
  };

  // Triggers user confirmation modal before sending
  const initiateSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      alert('Veuillez remplir le destinataire, l\'objet et le contenu du message.');
      return;
    }

    setConfirmationModal({
      isOpen: true,
      type: 'send_email',
      title: 'Confirmer l\'envoi de l\'e-mail via Gmail',
      description: `Vous êtes sur le point d'envoyer cet e-mail depuis votre compte Google (${googleUser?.email || profile?.emailAddress}) vers "${composeTo}". Cette action expédiera réellement le message.`,
      actionLabel: 'Envoyer l\'e-mail maintenant',
      onConfirm: async () => {
        setIsSending(true);
        setSendSuccess(null);
        setSendError(null);
        try {
          await sendGmailEmail({
            to: composeTo,
            cc: composeCc || undefined,
            subject: composeSubject,
            body: composeBody,
            isHtml: false,
          });
          setSendSuccess(`E-mail envoyé avec succès à ${composeTo}`);
          setComposeTo('');
          setComposeCc('');
          setComposeSubject('');
          setComposeBody('');
          setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
          // Refresh sent messages
          setTimeout(() => {
            loadMessages('sent');
            setActiveMailbox('sent');
          }, 1500);
        } catch (err: any) {
          setSendError(err.message || 'Erreur lors de l\'envoi de l\'e-mail.');
        } finally {
          setIsSending(false);
        }
      },
    });
  };

  // Triggers user confirmation modal before deleting
  const initiateDeleteMessage = (messageId: string, subject: string) => {
    setConfirmationModal({
      isOpen: true,
      type: 'delete_email',
      title: 'Supprimer ce message de votre boîte Gmail ?',
      description: `Êtes-vous sûr de vouloir supprimer définitivement le message "${subject}" ? Cette action impactera votre boîte de réception Gmail.`,
      actionLabel: 'Supprimer définitivement',
      onConfirm: async () => {
        try {
          await deleteGmailMessage(messageId);
          setSelectedMessage(null);
          setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
          loadMessages(activeMailbox === 'sent' ? 'sent' : 'inbox');
        } catch (err: any) {
          alert(`Erreur lors de la suppression : ${err.message}`);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-100">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Messagerie & Communications Gmail
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">
                    Google Workspace
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Consultez vos messages, rédigez des alertes industrielles et diffusez les rapports de production en 1-clic avec permission de l'utilisateur.
                </p>
              </div>
            </div>
          </div>

          {/* Account Status / Sign In Button */}
          <div>
            {googleUser ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 pr-3">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Utilisateur'}
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                    {(googleUser.email || 'G').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    {googleUser.displayName || 'Compte Google Connecté'}
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connecté" />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {googleUser.email || profile?.emailAddress}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-2 text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1 rounded hover:bg-slate-200/60 transition"
                  title="Déconnecter le compte Google"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                {/* Official Sign in with Google Button as mandated */}
                <button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="flex items-center gap-3 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-xs hover:shadow transition font-medium text-xs disabled:opacity-60 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isAuthenticating ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
                </button>
                <span className="text-[10px] text-slate-400">
                  Accès sécurisé à Gmail avec votre autorisation
                </span>
              </div>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-rose-500 hover:text-rose-800 text-xs font-bold"
            >
              Fermer
            </button>
          </div>
        )}
      </div>

      {/* Main Mail Surface */}
      {!googleUser ? (
        /* Not Logged In State */
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-xs border border-red-100">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Connectez votre compte Gmail à CTP SMART
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              L'intégration Gmail vous permet de synchroniser les alertes de l'atelier de fabrication de semelles, de diffuser instantanément les rapports de poste aux équipes de direction et de recevoir les fiches de maintenance par e-mail.
            </p>

            <div className="pt-2">
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-semibold text-xs transition active:scale-98"
              >
                <Mail className="w-4 h-4" />
                <span>Autoriser et connecter Gmail</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" /> Sécurité Google OAuth
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Jeton en mémoire
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Modèles 1-Clic
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Logged In View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-3 space-y-3">
            <button
              onClick={() => {
                setActiveMailbox('compose');
                setSelectedMessage(null);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>Nouveau Message Atelier</span>
            </button>

            <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs space-y-1">
              <button
                onClick={() => {
                  setActiveMailbox('inbox');
                  setSelectedMessage(null);
                  loadMessages('inbox');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  activeMailbox === 'inbox'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 text-blue-600" />
                  <span>Boîte de Réception</span>
                </div>
                {profile && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {profile.messagesTotal}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveMailbox('sent');
                  setSelectedMessage(null);
                  loadMessages('sent');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  activeMailbox === 'sent'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4 text-slate-500" />
                  <span>Messages Envoyés</span>
                </div>
              </button>
            </div>

            {/* Industrial Templates Quick Selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Modèles d'Emails CTP
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Pré-remplissez un e-mail avec les données réelles de l'atelier en 1 clic :
              </p>

              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => {
                    setActiveMailbox('compose');
                    setSelectedMessage(null);
                    applyTemplate('production');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 text-xs text-slate-700 flex items-center gap-2 transition"
                >
                  <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Rapport de Poste de Production</span>
                </button>

                <button
                  onClick={() => {
                    setActiveMailbox('compose');
                    setSelectedMessage(null);
                    applyTemplate('quality');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 text-xs text-slate-700 flex items-center gap-2 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span className="truncate">Fiche Alerte Non-Conformité</span>
                </button>

                <button
                  onClick={() => {
                    setActiveMailbox('compose');
                    setSelectedMessage(null);
                    applyTemplate('maintenance');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 text-xs text-slate-700 flex items-center gap-2 transition"
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Demande Intervention Maintenance</span>
                </button>

                <button
                  onClick={() => {
                    setActiveMailbox('compose');
                    setSelectedMessage(null);
                    applyTemplate('stock');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 text-xs text-slate-700 flex items-center gap-2 transition"
                >
                  <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Alerte Seuil Résine & Matière</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="lg:col-span-9">
            {activeMailbox === 'compose' ? (
              /* Composer Card */
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-red-600" />
                    <h2 className="text-sm font-bold text-slate-900">
                      Rédiger un e-mail via Gmail
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Expéditeur : <strong>{googleUser.email || profile?.emailAddress}</strong>
                  </span>
                </div>

                {sendSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{sendSuccess}</span>
                    </div>
                    <button
                      onClick={() => setSendSuccess(null)}
                      className="text-emerald-600 hover:text-emerald-900 font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}

                {sendError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{sendError}</span>
                    </div>
                    <button
                      onClick={() => setSendError(null)}
                      className="text-rose-600 hover:text-rose-900 font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}

                <form onSubmit={initiateSendEmail} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Destinataire (À) *
                    </label>
                    <input
                      type="email"
                      required
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="direction@ctpsmart.tn, client@exemple.com..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Copie (Cc) - Optionnel
                    </label>
                    <input
                      type="email"
                      value={composeCc}
                      onChange={(e) => setComposeCc(e.target.value)}
                      placeholder="chef-equipe@ctpsmart.tn"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Objet du message *
                    </label>
                    <input
                      type="text"
                      required
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Objet..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Corps de l'e-mail *
                    </label>
                    <textarea
                      required
                      rows={10}
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      placeholder="Saisissez votre message..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      Une confirmation vous sera demandée avant l'envoi réel
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setComposeTo('');
                          setComposeSubject('');
                          setComposeBody('');
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition"
                      >
                        Effacer
                      </button>
                      <button
                        type="submit"
                        disabled={isSending}
                        className="flex items-center gap-2 px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-60"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSending ? 'Envoi...' : 'Envoyer via Gmail'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : selectedMessage ? (
              /* Message Detail Reader */
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Retour aux messages
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setComposeTo(selectedMessage.from);
                        setComposeSubject(`Re: ${selectedMessage.subject}`);
                        setComposeBody(`\n\n--- Message d'origine ---\n${selectedMessage.bodyText}`);
                        setActiveMailbox('compose');
                        setSelectedMessage(null);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-medium transition"
                    >
                      Répondre
                    </button>
                    <button
                      onClick={() => initiateDeleteMessage(selectedMessage.id, selectedMessage.subject)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Supprimer ce message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedMessage.subject}
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-1 pb-3 border-b border-slate-100">
                    <div>
                      De : <strong className="text-slate-800">{selectedMessage.from}</strong>
                      {selectedMessage.to && <span> à {selectedMessage.to}</span>}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      {selectedMessage.date}
                    </div>
                  </div>
                </div>

                {/* Email Body Content */}
                <div
                  className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed py-2 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                />
              </div>
            ) : (
              /* Message List Card */
              <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                {/* List Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      {activeMailbox === 'sent' ? 'Messages Envoyés' : 'Boîte de Réception'}
                    </h2>
                    <span className="text-xs text-slate-400 font-mono">
                      ({messages.length} messages)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            loadMessages(activeMailbox === 'sent' ? 'sent' : 'inbox', searchQuery);
                          }
                        }}
                        placeholder="Rechercher dans Gmail..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-48 sm:w-60"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>

                    <button
                      onClick={() => loadMessages(activeMailbox === 'sent' ? 'sent' : 'inbox', searchQuery)}
                      disabled={isLoadingMessages}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition"
                      title="Rafraîchir"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Message Rows */}
                {isLoadingMessages ? (
                  <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                    <p>Chargement des messages Gmail...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 space-y-1">
                    <Mail className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-600">Aucun message trouvé</p>
                    <p className="text-[11px]">Votre boîte ne contient aucun e-mail pour cette recherche.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => handleOpenMessage(msg)}
                        className={`p-3 sm:px-4 hover:bg-blue-50/50 cursor-pointer transition flex items-start sm:items-center justify-between gap-3 text-xs ${
                          msg.isUnread ? 'bg-blue-50/30 font-semibold' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`truncate max-w-[160px] ${
                                msg.isUnread ? 'text-blue-900 font-bold' : 'text-slate-800 font-medium'
                              }`}
                            >
                              {activeMailbox === 'sent' ? `À : ${msg.to}` : msg.from.split('<')[0].trim()}
                            </span>
                            {msg.isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <div className="truncate text-slate-900 font-medium mt-0.5">
                            {msg.subject}
                          </div>
                          <p className="truncate text-[11px] text-slate-500 mt-0.5">
                            {msg.snippet}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {msg.date.split(' ').slice(1, 4).join(' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Explicit User Confirmation Dialog (MANDATORY per Workspace guidelines) */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  confirmationModal.type === 'delete_email'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}
              >
                {confirmationModal.type === 'delete_email' ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmationModal.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmationModal.description}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div className="font-semibold text-slate-700">Objet : {composeSubject || selectedMessage?.subject}</div>
              {composeTo && <div>Destinataire : {composeTo}</div>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmationModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => confirmationModal.onConfirm()}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition ${
                  confirmationModal.type === 'delete_email'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmationModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
