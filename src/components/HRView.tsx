import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  Award,
  Search,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { AttendanceStatus } from '../types';

export const HRView: React.FC = () => {
  const {
    t,
    employees,
    updateEmployeeAttendance,
    hasPermission,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState('all');

  const filteredEmployees = employees.filter((emp) => {
    if (filterShift !== 'all' && emp.assignedShift !== filterShift) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.functionTitle.toLowerCase().includes(q) ||
        emp.matricule.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const presentCount = employees.filter((e) => e.attendanceToday === 'present').length;
  const lateCount = employees.filter((e) => e.attendanceToday === 'retard').length;
  const absentCount = employees.filter((e) => e.attendanceToday === 'absent').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            {t('navHR')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestion du personnel d'atelier, pointage des présences et suivi des rendements individuels.
          </p>
        </div>

        {/* Quick Shift Attendance Counters */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-xs">
            {presentCount} Présents
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold shadow-xs">
            {lateCount} Retards
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold shadow-xs">
            {absentCount} Absents
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs text-xs">
            {['all', 'matin', 'soir', 'nuit'].map((sh) => (
              <button
                key={sh}
                onClick={() => setFilterShift(sh)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                  filterShift === sh
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {sh === 'all' ? 'Toutes les équipes' : sh}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher employé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 pl-9 pr-3 py-2 rounded-xl text-xs shadow-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-600 font-semibold uppercase block">
                  {emp.matricule}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{emp.name}</h3>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {emp.functionTitle}
                </span>
              </div>

              {/* Attendance Status Selector */}
              <select
                value={emp.attendanceToday}
                onChange={(e) => updateEmployeeAttendance(emp.id, e.target.value as AttendanceStatus)}
                disabled={!hasPermission('rh')}
                className={`text-[10px] font-bold rounded-lg px-2.5 py-1 border focus:outline-none transition ${
                  emp.attendanceToday === 'present'
                    ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                    : emp.attendanceToday === 'retard'
                    ? 'text-amber-700 border-amber-300 bg-amber-50'
                    : emp.attendanceToday === 'conge'
                    ? 'text-blue-700 border-blue-300 bg-blue-50'
                    : 'text-rose-700 border-rose-300 bg-rose-50'
                }`}
              >
                <option value="present">Présent</option>
                <option value="retard">En retard</option>
                <option value="absent">Absent</option>
                <option value="conge">En congé</option>
              </select>
            </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-medium">Paires / Mois</span>
                <span className="text-xs font-bold font-mono text-slate-900 mt-0.5 block">
                  {emp.producedPairsThisMonth.toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-medium">Score Efficacité</span>
                <span className="text-xs font-bold font-mono text-emerald-600 mt-0.5 block">
                  {emp.efficiencyScore}%
                </span>
              </div>

              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-medium">Taux Rebut</span>
                <span className="text-xs font-bold font-mono text-rose-600 mt-0.5 block">
                  {emp.scrapRateAverage}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="capitalize font-medium text-slate-700">Équipe {emp.assignedShift}</span>
              <span className="font-mono text-slate-400">
                {emp.checkInTime ? `Pointé à ${emp.checkInTime}` : 'Non pointé'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
