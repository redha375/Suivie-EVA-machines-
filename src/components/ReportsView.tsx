import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  Layers,
  Building2,
  CheckCircle2,
  Boxes,
  FileSpreadsheet,
  FileDown,
  Sparkles,
  Check,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const ReportsView: React.FC = () => {
  const {
    t,
    currentTenant,
    activeTenant,
    currentUser,
    productionEntries,
    machines,
    stockItems,
    logAudit,
    can,
  } = useApp();

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotification, setExportNotification] = useState<{
    type: 'excel' | 'pdf' | 'csv';
    filename: string;
  } | null>(null);

  // Filter entries
  const filteredEntries = productionEntries.filter((entry) => {
    if (selectedMachine !== 'all' && entry.machineId !== selectedMachine) return false;
    if (selectedShift !== 'all' && entry.shift !== selectedShift) return false;
    return true;
  });

  // Calculate totals
  const totalProduced = filteredEntries.reduce((acc, e) => acc + e.qtyProduced, 0);
  const totalConforming = filteredEntries.reduce((acc, e) => acc + e.qtyConforming, 0);
  const totalRejected = filteredEntries.reduce((acc, e) => acc + e.qtyRejected, 0);
  const totalWeightKg = filteredEntries.reduce((acc, e) => acc + e.materialConsumedKg, 0);
  const totalBags25kg = filteredEntries.reduce((acc, e) => acc + e.bags25kgConsumed, 0);
  const totalDowntimeMin = filteredEntries.reduce((acc, e) => acc + e.downtimeMinutes, 0);

  const scrapRate = totalProduced > 0 ? ((totalRejected / totalProduced) * 100).toFixed(1) : '0.0';
  const yieldRate = totalProduced > 0 ? ((totalConforming / totalProduced) * 100).toFixed(1) : '100.0';

  const tenantObj = currentTenant || activeTenant;
  const tenantName = tenantObj?.name || 'CTP SMART - Usine Principale';
  const dateStr = new Date().toISOString().substring(0, 10);
  const periodLabel = period === 'today' ? "Aujourd'hui" : period === 'week' ? 'Cette Semaine' : 'Ce Mois';
  const machineObj = machines.find((m) => m.id === selectedMachine);
  const machineLabel = selectedMachine === 'all' ? 'Toutes les machines' : `${machineObj?.name || selectedMachine} (${machineObj?.code || ''})`;
  const shiftLabel = selectedShift === 'all' ? 'Tous les postes' : `Poste ${selectedShift.toUpperCase()}`;

  // Helper to draw signature boxes on PDF
  const drawSignatures = (doc: jsPDF, y: number) => {
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);

    const colWidth = 82;
    const sigs = [
      { title: "Chef d'Équipe Atelier", role: "Visa & Heure de Relève" },
      { title: "Responsable Production", role: "Contrôle & Validation TRS" },
      { title: "Direction Générale CTP", role: "Approbation Exploitation" },
    ];

    sigs.forEach((s, idx) => {
      const x = 14 + idx * (colWidth + 11.5);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, colWidth, 20, 1, 1, 'D');
      doc.text(s.title, x + 4, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(s.role, x + 4, y + 9);

      doc.setLineDashPattern([1, 1], 0);
      doc.line(x + 4, y + 16, x + colWidth - 4, y + 16);
      doc.setLineDashPattern([], 0);
    });
  };

  // 1. Export to Excel (.xlsx) with multi-sheets and formatting
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const nowFormatted = new Date().toLocaleString('fr-FR');

      // --- Sheet 1: Synthèse & Indicateurs de Performance ---
      const ws1Data: (string | number)[][] = [
        ['CTP SMART - SYSTÈME INTÉGRÉ DE PRODUCTION INDUSTRIELLE CHAUSSURES'],
        ['Bilan d\'Exploitation & Suivi des Lignes de Plasturgie (EVA / PVC / TPR)'],
        [],
        ['INFORMATIONS GÉNÉRALES DU RAPPORT', ''],
        ['Unité Industrielle :', tenantName],
        ['Site / Adresse :', `${tenantObj?.address || 'Zone Industrielle'}, ${tenantObj?.city || 'Sfax'}`],
        ['Date de génération :', nowFormatted],
        ['Émetteur :', `${currentUser.name} (${currentUser.role})`],
        ['Filtre Période appliquée :', periodLabel],
        ['Filtre Machine appliquée :', machineLabel],
        ['Filtre Équipe / Poste :', shiftLabel],
        [],
        ['SYNTHÈSE GLOBALE DES INDICATEURS CLÉS (KPIs)', 'VALEUR', 'UNITÉ', 'SEUIL / OBJECTIF'],
        ['Paires Produites Total', totalProduced, 'paires', 'Capacité max atelier'],
        ['Paires Conformes (1er Choix)', totalConforming, 'paires', 'Conforme aux normes'],
        ['Rebuts & Non-conformités', totalRejected, 'paires', 'Objectif strict < 3.0%'],
        ['Taux de Rejet Réel', `${scrapRate}%`, '%', Number(scrapRate) <= 3 ? 'CONFORME (<=3%)' : 'ALERTE SEUIL DEPASSE'],
        ['Taux de Rendement Synthétique (TRS)', `${yieldRate}%`, '%', Number(yieldRate) >= 95 ? 'EXCELLENT (>=95%)' : 'A AMELIORER'],
        ['Matière Première Consommée', totalWeightKg, 'kg', 'Granulés EVA/PVC/TPR'],
        ['Sacs Consommés (25kg)', totalBags25kg, 'sacs de 25kg', '-'],
        ['Temps d\'Arrêt Machine Cumulé', totalDowntimeMin, 'minutes', 'Objectif MTBF > 4h'],
        [],
        ['VENTILATION DE LA PRODUCTION PAR MACHINE', 'PAIRES TOTALES', 'CONFORMES', 'REBUTS', 'TAUX REBUT (%)', 'SACS 25KG', 'ARRÊT (MIN)'],
        ...machines.map((m) => {
          const mEntries = filteredEntries.filter((e) => e.machineId === m.id);
          const mProd = mEntries.reduce((a, b) => a + b.qtyProduced, 0);
          const mConf = mEntries.reduce((a, b) => a + b.qtyConforming, 0);
          const mRej = mEntries.reduce((a, b) => a + b.qtyRejected, 0);
          const mBags = mEntries.reduce((a, b) => a + b.bags25kgConsumed, 0);
          const mDown = mEntries.reduce((a, b) => a + b.downtimeMinutes, 0);
          const mScrap = mProd > 0 ? ((mRej / mProd) * 100).toFixed(1) + '%' : '0.0%';
          return [m.name + ' (' + m.code + ')', mProd, mConf, mRej, mScrap, mBags, mDown];
        }),
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      ws1['!cols'] = [
        { wch: 38 },
        { wch: 22 },
        { wch: 18 },
        { wch: 26 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, 'Synthèse_KPIs');

      // --- Sheet 2: Détail Exhaustif des Lots de Fabrication ---
      const ws2Headers = [
        'ID Lot',
        'Date',
        'Heure',
        'Poste',
        'Machine',
        'Plateforme',
        'Modèle Chaussure',
        'Pointure',
        'Couleur Corps',
        'Couleur Semelle',
        'Paires Produites',
        'Paires Conformes',
        'Rebuts',
        'Taux Rejet (%)',
        'Matière (kg)',
        'Sacs 25kg',
        'Arrêt (min)',
        'Motif de l\'arrêt',
        'Opérateur Responsable',
        'Contrôle Qualité',
      ];

      const ws2Rows: (string | number)[][] = filteredEntries.map((e) => [
        e.id,
        e.date,
        e.time,
        e.shift.toUpperCase(),
        e.machineId.toUpperCase(),
        e.platformNumber,
        e.modelName,
        e.size,
        e.color1,
        e.color2,
        e.qtyProduced,
        e.qtyConforming,
        e.qtyRejected,
        e.qtyProduced > 0 ? ((e.qtyRejected / e.qtyProduced) * 100).toFixed(1) + '%' : '0.0%',
        e.materialConsumedKg,
        e.bags25kgConsumed,
        e.downtimeMinutes,
        e.downtimeReason || 'Aucun arrêt signalé',
        e.operatorName,
        e.verified ? 'Vérifié & Validé' : 'En attente visa',
      ]);

      // Add Total summary row
      ws2Rows.push([
        'TOTAL CUMULÉ',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        totalProduced,
        totalConforming,
        totalRejected,
        `${scrapRate}%`,
        totalWeightKg,
        totalBags25kg,
        totalDowntimeMin,
        '',
        '',
        '',
      ]);

      const ws2 = XLSX.utils.aoa_to_sheet([ws2Headers, ...ws2Rows]);
      ws2['!cols'] = [
        { wch: 14 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 14 },
        { wch: 12 },
        { wch: 28 },
        { wch: 10 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 28 },
        { wch: 22 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, 'Lots_Fabrication');

      // --- Sheet 3: État des Stocks & Consommables ---
      const ws3Headers = [
        'Code Article',
        'Désignation Article / Matière',
        'Catégorie',
        'Stock Actuel',
        'Unité de Mesure',
        'Seuil Alerte Minimum',
        'Statut de Disponibilité',
      ];
      const ws3Rows: (string | number)[][] = stockItems.map((item) => [
        item.id,
        item.name,
        item.category.toUpperCase(),
        item.quantity,
        item.unit,
        item.minAlertThreshold,
        item.quantity <= item.minAlertThreshold ? 'ALERTE STOCK FAIBLE' : 'DISPONIBLE',
      ]);

      const ws3 = XLSX.utils.aoa_to_sheet([ws3Headers, ...ws3Rows]);
      ws3['!cols'] = [
        { wch: 14 },
        { wch: 34 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 22 },
        { wch: 24 },
      ];
      XLSX.utils.book_append_sheet(wb, ws3, 'Stock_Matières');

      // Save workbook to user device
      const fileName = `Rapport_Production_CTP_SMART_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setExportNotification({ type: 'excel', filename: fileName });
      setTimeout(() => setExportNotification(null), 5000);
      logAudit('EXPORT_EXCEL', 'Rapports', `Génération du classeur Excel .xlsx (${filteredEntries.length} lots)`);
    } catch (err) {
      console.error('Erreur export Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export to PDF (.pdf) formatted with header, badges, autoTable and signatures
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const nowFormatted = new Date().toLocaleDateString('fr-FR');
      const timeFormatted = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      // 1. Top Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(14, 10, 269, 21, 'F');

      // Left branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('CTP SMART • SYSTÈME INTÉGRÉ DE GESTION DE PRODUCTION', 20, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Unité : ${tenantName} • Sfax, Tunisie  |  Émis par : ${currentUser.name} (${currentUser.role})`,
        20,
        24
      );

      // Right metadata
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Édité le : ${nowFormatted} à ${timeFormatted}`, 275, 18, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Filtres : ${periodLabel} | Machine : ${machineLabel} | Poste : ${shiftLabel}`, 275, 24, {
        align: 'right',
      });

      // 2. Document Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("RAPPORT D'EXPLOITATION & SUIVI DES LOTS DE FABRICATION PLASTIQUE", 14, 37);

      // 3. KPI Summary Badges (6 boxes)
      const kpiY = 40;
      const kpiHeight = 15;
      const kpiWidth = 43;
      const kpis = [
        { label: 'TOTAL PRODUIT', val: `${totalProduced.toLocaleString()} paires`, color: [37, 99, 235], bg: [239, 246, 255] },
        { label: 'CONFORMES', val: `${totalConforming.toLocaleString()} paires`, color: [22, 101, 52], bg: [240, 253, 244] },
        { label: 'REBUTS', val: `${totalRejected} (${scrapRate}%)`, color: [225, 29, 72], bg: [255, 241, 242] },
        { label: 'RENDEMENT TRS', val: `${yieldRate}%`, color: [37, 99, 235], bg: [239, 246, 255] },
        { label: 'MATIÈRE CONSOMMÉE', val: `${totalBags25kg} sacs (${totalWeightKg} kg)`, color: [71, 85, 105], bg: [248, 250, 252] },
        { label: 'ARRÊTS MACHINE', val: `${totalDowntimeMin} minutes`, color: [217, 119, 6], bg: [254, 243, 199] },
      ];

      kpis.forEach((k, idx) => {
        const x = 14 + idx * (kpiWidth + 2.2);
        doc.setFillColor(k.bg[0], k.bg[1], k.bg[2]);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(k.label, x + 3.5, kpiY + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(k.color[0], k.color[1], k.color[2]);
        doc.text(k.val, x + 3.5, kpiY + 10.5);
      });

      // 4. Detailed Data Table via AutoTable
      const tableColumns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Heure', dataKey: 'time' },
        { header: 'Poste', dataKey: 'shift' },
        { header: 'Machine', dataKey: 'machine' },
        { header: 'Modèle', dataKey: 'model' },
        { header: 'Pt.', dataKey: 'size' },
        { header: 'Couleurs', dataKey: 'colors' },
        { header: 'Produit', dataKey: 'qtyProduced' },
        { header: 'Conforme', dataKey: 'qtyConforming' },
        { header: 'Rebut', dataKey: 'qtyRejected' },
        { header: 'Sacs 25kg', dataKey: 'bags' },
        { header: 'Arrêt', dataKey: 'downtime' },
        { header: 'Cause / Remarques', dataKey: 'reason' },
        { header: 'Opérateur', dataKey: 'operator' },
      ];

      const tableRows = filteredEntries.map((e) => ({
        date: e.date,
        time: e.time,
        shift: e.shift.charAt(0).toUpperCase() + e.shift.slice(1),
        machine: `${e.machineId.toUpperCase()} (P${e.platformNumber})`,
        model: e.modelName,
        size: `${e.size}`,
        colors: `${e.color1} / ${e.color2}`,
        qtyProduced: e.qtyProduced.toLocaleString(),
        qtyConforming: e.qtyConforming.toLocaleString(),
        qtyRejected: e.qtyRejected.toString(),
        bags: e.bags25kgConsumed.toString(),
        downtime: e.downtimeMinutes > 0 ? `${e.downtimeMinutes} min` : '-',
        reason: e.downtimeReason || 'Conforme',
        operator: e.operatorName,
      }));

      autoTable(doc, {
        startY: 59,
        columns: tableColumns,
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 12 },
          2: { cellWidth: 14 },
          3: { cellWidth: 22, fontStyle: 'bold' },
          4: { cellWidth: 32 },
          5: { cellWidth: 10, halign: 'center' },
          6: { cellWidth: 26 },
          7: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
          8: { cellWidth: 16, halign: 'right', textColor: [22, 101, 52], fontStyle: 'bold' },
          9: { cellWidth: 14, halign: 'right', textColor: [225, 29, 72], fontStyle: 'bold' },
          10: { cellWidth: 14, halign: 'right' },
          11: { cellWidth: 14, halign: 'right' },
          12: { cellWidth: 28 },
          13: { cellWidth: 26 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(148, 163, 184);
          doc.text(
            `CTP SMART • Document Officiel de Production • Page ${data.pageNumber} sur ${pageCount}`,
            148,
            204,
            { align: 'center' }
          );
        },
      });

      // 5. Signatures block
      const finalY = (doc as any).lastAutoTable?.finalY || 160;
      const sigY = finalY > 165 ? 175 : finalY + 8;

      if (sigY > 185) {
        doc.addPage();
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('VISAS ET APPROBATIONS RÉGLEMENTAIRES', 14, 20);
        drawSignatures(doc, 26);
      } else {
        drawSignatures(doc, sigY);
      }

      // 6. Save PDF
      const fileName = `Rapport_Production_CTP_SMART_${dateStr}.pdf`;
      doc.save(fileName);

      setExportNotification({ type: 'pdf', filename: fileName });
      setTimeout(() => setExportNotification(null), 5000);
      logAudit('EXPORT_PDF', 'Rapports', `Génération du rapport PDF .pdf (${filteredEntries.length} lots)`);
    } catch (err) {
      console.error('Erreur export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Export to CSV (Legacy plain-text format)
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Heure',
      'Poste',
      'Machine',
      'Plateforme',
      'Modèle',
      'Pointure',
      'Couleur 1',
      'Couleur 2',
      'Paires Produites',
      'Paires Conformes',
      'Rebuts',
      'Matière (kg)',
      'Sacs 25kg',
      'Arrêt (min)',
      'Cause Arrêt',
      'Opérateur',
    ];

    const rows = filteredEntries.map((e) => [
      e.date,
      e.time,
      e.shift,
      e.machineId,
      e.platformNumber,
      `"${e.modelName}"`,
      e.size,
      `"${e.color1}"`,
      `"${e.color2}"`,
      e.qtyProduced,
      e.qtyConforming,
      e.qtyRejected,
      e.materialConsumedKg,
      e.bags25kgConsumed,
      e.downtimeMinutes,
      `"${e.downtimeReason || ''}"`,
      `"${e.operatorName}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileName = `Rapport_Production_CTP_SMART_${dateStr}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotification({ type: 'csv', filename: fileName });
    setTimeout(() => setExportNotification(null), 5000);
    logAudit('EXPORT_CSV', 'Rapports', `Export CSV brut de ${filteredEntries.length} lots`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Success Notification Banner */}
      {exportNotification && (
        <div className="no-print p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                {exportNotification.type === 'excel'
                  ? 'Fichier Excel (.xlsx) généré et téléchargé !'
                  : exportNotification.type === 'pdf'
                  ? 'Rapport PDF (.pdf) généré et téléchargé !'
                  : 'Fichier CSV généré avec succès !'}
              </h4>
              <p className="text-[11px] text-emerald-700">
                Fichier : <code className="font-mono font-semibold">{exportNotification.filename}</code> • {filteredEntries.length} enregistrements exportés.
              </p>
            </div>
          </div>
          <button
            onClick={() => setExportNotification(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 font-medium px-2 py-1 rounded hover:bg-emerald-100/60 transition"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {t('navReports')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Génération des bilans journaliers, rapports d'équipes et exports certifiés aux formats <strong>PDF</strong> et <strong>Excel (.xlsx)</strong>.
          </p>
        </div>

        {/* Primary Export Action Group */}
        <div className="flex flex-wrap items-center gap-2">
          {can('export', 'reports') && (
            <>
              {/* Export Excel Button */}
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition"
                title="Générer un classeur Excel avec feuilles Synthèse, Lots et Matières"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t('exportExcel')}</span>
              </button>

              {/* Export PDF Button */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition"
                title="Générer un document PDF professionnel au format paysage A4 avec visas"
              >
                <FileDown className="w-4 h-4" />
                <span>{t('exportPDF')}</span>
              </button>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                title="Exporter en CSV texte brut"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </>
          )}

          {/* Physical Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
            title="Ouvrir la boîte d'impression du navigateur"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="no-print flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 font-medium">Période :</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-1.5 focus:bg-white focus:border-blue-500"
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette Semaine</option>
            <option value="month">Ce Mois</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-medium">Machine :</span>
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-1.5 focus:bg-white focus:border-blue-500"
          >
            <option value="all">Toutes les machines ({machines.length})</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-medium">Poste :</span>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-1.5 focus:bg-white focus:border-blue-500"
          >
            <option value="all">Tous les postes</option>
            <option value="matin">Matin (06h - 14h)</option>
            <option value="soir">Soir (14h - 22h)</option>
            <option value="nuit">Nuit (22h - 06h)</option>
          </select>
        </div>

        <div className="ml-auto text-slate-500 text-[11px] font-medium">
          <strong>{filteredEntries.length}</strong> lots filtrés prêts à être exportés
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div className="bg-white border border-slate-200 print:border-none rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-slate-900">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-slate-900 font-mono">
                CTP SMART
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold uppercase">
                Rapport Industriel Certifié
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Bilan d'Exploitation & Suivi de Production Plastique EVA/PVC/TPR
            </h2>
            <p className="text-xs text-slate-500">
              {tenantName} • Sfax, Tunisie • Suivi des Moules et Lignes Rotatives
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <div>
              Édité le : <strong className="text-slate-900 font-mono">{new Date().toLocaleDateString('fr-FR')}</strong>
            </div>
            <div>
              Émetteur : <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.role})
            </div>
            <div>
              Statut : <span className="text-emerald-600 font-semibold">Validé Direction CTP</span>
            </div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-medium block">Total Produit</span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {totalProduced.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">paires réalisées</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-medium block">Conformes</span>
            <span className="text-xl font-bold font-mono text-emerald-600">
              {totalConforming.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">1er choix</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-medium block">Rebuts</span>
            <span className="text-xl font-bold font-mono text-rose-600">
              {totalRejected}
            </span>
            <span className="text-[10px] text-rose-600 block mt-0.5">Taux: {scrapRate}%</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-medium block">Rendement TRS</span>
            <span className="text-xl font-bold font-mono text-blue-600">
              {yieldRate}%
            </span>
            <span className="text-[10px] text-blue-600 block mt-0.5">Objectif &gt; 95%</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-medium block">Matière Consommée</span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {totalBags25kg}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">sacs (25kg) • {totalWeightKg} kg</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase font-medium block">Temps d'Arrêt</span>
            <span className="text-xl font-bold font-mono text-amber-600">
              {totalDowntimeMin}
            </span>
            <span className="text-[10px] text-amber-600 block mt-0.5">minutes</span>
          </div>
        </div>

        {/* Detailed Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ventilation Détaillée par Lot de Fabrication
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {filteredEntries.length} lots affichés
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Date / Heure</th>
                  <th className="px-3 py-2.5">Poste</th>
                  <th className="px-3 py-2.5">Machine</th>
                  <th className="px-3 py-2.5">Modèle & Pointure</th>
                  <th className="px-3 py-2.5 text-right">Produit</th>
                  <th className="px-3 py-2.5 text-right">Conforme</th>
                  <th className="px-3 py-2.5 text-right">Rebut</th>
                  <th className="px-3 py-2.5 text-right">Sacs 25kg</th>
                  <th className="px-3 py-2.5 text-right">Arrêt (min)</th>
                  <th className="px-3 py-2.5">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-3 py-2.5 font-mono text-slate-500">
                      {e.date} <span className="text-slate-400 text-[11px]">{e.time}</span>
                    </td>
                    <td className="px-3 py-2.5 capitalize">{e.shift}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{e.machineId.toUpperCase()} (P{e.platformNumber})</td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-slate-900">{e.modelName}</span>
                      <span className="text-[10px] text-slate-400 ml-1">T{e.size}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">{e.qtyProduced}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium text-emerald-600">
                      {e.qtyConforming}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium text-rose-600">
                      {e.qtyRejected}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{e.bags25kgConsumed}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium text-amber-600">{e.downtimeMinutes}</td>
                    <td className="px-3 py-2.5 text-slate-600">{e.operatorName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures & Approvals Section */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <span className="text-slate-600 font-medium block">Chef d'Équipe</span>
            <div className="h-14 mt-1 border-b border-dashed border-slate-300" />
            <span className="text-[10px] text-slate-400 mt-1 block">Signature & Visa</span>
          </div>

          <div>
            <span className="text-slate-600 font-medium block">Responsable Production</span>
            <div className="h-14 mt-1 border-b border-dashed border-slate-300" />
            <span className="text-[10px] text-slate-400 mt-1 block">Signature & Visa</span>
          </div>

          <div>
            <span className="text-slate-600 font-medium block">Direction Générale CTP</span>
            <div className="h-14 mt-1 border-b border-dashed border-slate-300" />
            <span className="text-[10px] text-slate-400 mt-1 block">Signature & Visa</span>
          </div>
        </div>
      </div>
    </div>
  );
};

