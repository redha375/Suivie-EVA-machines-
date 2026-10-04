import React, { useRef } from 'react';
import { CtpCommercialOrder } from '../../types';
import { useApp } from '../../context/AppContext';
import { Printer, X, Download, CheckCircle2, Building2, Calendar, Hash, FileText, Box, ShieldCheck, QrCode } from 'lucide-react';

interface CtpInvoiceModalProps {
  order: CtpCommercialOrder;
  type: 'bl' | 'facture';
  onClose: () => void;
}

export const CtpInvoiceModal: React.FC<CtpInvoiceModalProps> = ({ order, type, onClose }) => {
  const { ctpCartons } = useApp();
  const printRef = useRef<HTMLDivElement>(null);

  const isBL = type === 'bl';
  const docTitle = isBL ? 'BON DE LIVRAISON' : 'FACTURE PROFORMA / VENTE';
  const docRef = isBL ? `BL-2026-${order.commande.replace('CMD-', '')}` : `FAC-2026-${order.commande.replace('CMD-', '')}`;

  const isNM = order.modele.toUpperCase().includes('NM') || order.modele.toUpperCase() === 'NM';
  const pairesParCarton = isNM ? 12 : (order.prix_carton && order.prix_paire ? Math.round(order.prix_carton / order.prix_paire) : 12);
  const cartons = Math.floor(order.qte_commandee / pairesParCarton);
  const cartonsOuverts = order.qte_commandee % pairesParCarton;

  // Find closed cartons matching this order's model & size
  const matchingClosedCartons = ctpCartons
    .filter(
      (c) =>
        c.statut === 'FERME' &&
        c.modele_id.toUpperCase() === order.modele.toUpperCase() &&
        (c.pointure_text === order.pointure || order.pointure.includes(c.pointure_text))
    )
    .slice(0, cartons);

  // Fallback generated numbers if database has fewer recorded cartons than requested in demo order
  const allocatedCartonIds: string[] = matchingClosedCartons.length > 0
    ? matchingClosedCartons.map((c) => c.id_carton)
    : Array.from({ length: Math.min(cartons, 24) }, (_, i) => `${order.modele}-${order.pointure}-${String(i + 1).padStart(4, '0')}`);

  const montantHT = order.total;
  const tva = isBL ? 0 : Math.round(montantHT * 0.19);
  const totalTTC = montantHT + tva;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col">
        {/* Modal Top Bar (Screen only) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-base">
              Aperçu officiel : {docTitle} ({docRef})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              title="Imprimer ou enregistrer en PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Printable) */}
        <div ref={printRef} className="p-8 sm:p-12 text-slate-800 bg-white print:p-0 print:m-0">
          {/* Header CTP SMART */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-6 mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-slate-900 text-white font-black text-xl flex items-center justify-center rounded-lg">
                  CTP
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">CTP SMART DZ</h1>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    Manufacture Industrielle de Chaussures & Injection EVA
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Zone Industrielle Oued Smar, Lot 44 - Alger, Algérie
                <br />
                Tél : +213 (0) 23 85 41 20 | Email : contact@ctp-smart.dz
                <br />
                NIF : 001916029384721 | RC : 16/00-983421B19
              </p>
            </div>

            <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg w-full sm:w-auto">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded uppercase mb-2">
                {docTitle}
              </div>
              <div className="text-lg font-bold text-slate-900">{docRef}</div>
              <p className="text-xs text-slate-500 mt-1">
                Date d'émission : <span className="font-semibold text-slate-700">{order.date}</span>
                <br />
                Réf. Commande : <span className="font-semibold text-slate-700">{order.commande}</span>
              </p>
            </div>
          </div>

          {/* Client Details Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Émetteur / Usine</span>
              <div className="font-semibold text-slate-900 text-sm">CTP SMART FOOTWEAR FACTORY</div>
              <p className="text-xs text-slate-600 mt-0.5">
                Atelier Injection EVA 1 / EVA 2 / EVA 3
                <br />
                Responsable Logistique & Expéditions
              </p>
            </div>

            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200">
              <span className="text-xs font-bold uppercase text-blue-600 block mb-1">Client Destinataire</span>
              <div className="font-bold text-slate-900 text-base">{order.client}</div>
              <p className="text-xs text-slate-600 mt-0.5">
                Statut commande : <span className="font-semibold text-blue-700">{order.statut}</span>
                <br />
                Modalité : Livraison au dépôt client
              </p>
            </div>
          </div>

          {/* Table of items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Désignation Produit</th>
                  <th className="py-3 px-4">Pointure</th>
                  <th className="py-3 px-4 text-center">Conditionnement</th>
                  <th className="py-3 px-4 text-right">Qté Paires</th>
                  <th className="py-3 px-4 text-right">Cartons</th>
                  {!isBL && <th className="py-3 px-4 text-right">Prix Paire</th>}
                  {!isBL && <th className="py-3 px-4 text-right">Prix Carton</th>}
                  {!isBL && <th className="py-3 px-4 text-right">Total HT</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    Chaussure Injection Modèle <span className="font-bold text-blue-600">{order.modele}</span>
                    {isNM && <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Standard 12</span>}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{order.pointure}</td>
                  <td className="py-3.5 px-4 text-center text-xs text-slate-600">
                    {pairesParCarton} paires / carton
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {order.qte_commandee.toLocaleString('fr-FR')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                    {cartons} {cartonsOuverts > 0 ? `+ ${cartonsOuverts} p.` : 'ctns'}
                  </td>
                  {!isBL && (
                    <td className="py-3.5 px-4 text-right text-slate-700">
                      {order.prix_paire.toLocaleString('fr-FR')} DZD
                    </td>
                  )}
                  {!isBL && (
                    <td className="py-3.5 px-4 text-right text-slate-700">
                      {order.prix_carton.toLocaleString('fr-FR')} DZD
                    </td>
                  )}
                  {!isBL && (
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {order.total.toLocaleString('fr-FR')} DZD
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Summary (Only for Facture) */}
          {!isBL ? (
            <div className="flex justify-end mb-8">
              <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Montant Total HT :</span>
                  <span className="font-semibold text-slate-900">{montantHT.toLocaleString('fr-FR')} DZD</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>TVA (19%) :</span>
                  <span className="font-semibold text-slate-900">{tva.toLocaleString('fr-FR')} DZD</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-base text-blue-900">
                  <span>Total Net TTC :</span>
                  <span className="text-lg text-blue-700">{totalTTC.toLocaleString('fr-FR')} DZD</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {/* Allocated Closed Cartons List (MANDATORY REQUIREMENT) */}
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Numéros des Cartons Fermés Alloués ({cartons} cartons de {pairesParCarton} paires)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    Scellés Équipe C • Contrôlés
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {allocatedCartonIds.map((cid, i) => (
                    <div
                      key={cid}
                      className="p-1.5 bg-white border border-slate-200 rounded flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-800">{cid}</span>
                      <span className="text-[10px] text-slate-400">#{i + 1}</span>
                    </div>
                  ))}
                </div>

                {cartons > allocatedCartonIds.length && (
                  <p className="text-[11px] text-slate-500 mt-2 italic">
                    + {cartons - allocatedCartonIds.length} cartons complémentaires en cours de chargement selon série.
                  </p>
                )}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Observation Bon de Livraison :</strong> Marchandise scellée reçue en bon état conforme aux spécifications d'usine CTP (Conditionnement officiel en cartons scellés de {pairesParCarton} paires - Règle NM 12 paires).
              </div>
            </div>
          )}

          {/* Signatures & Stamp area */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
            <div className="text-center">
              <p className="font-bold text-slate-700 uppercase">Visa & Cachet Usine CTP SMART</p>
              <div className="mt-4 h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                Cachet Atelier & Signature
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-700 uppercase">Visa Réceptionnaire Client</p>
              <div className="mt-4 h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                Bon pour accord & Réception
              </div>
            </div>
          </div>
        </div>

        {/* Footer (Screen only) */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimer / Exporter PDF
          </button>
        </div>
      </div>
    </div>
  );
};
