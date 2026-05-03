'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Download, FileSpreadsheet, Plus, AlertCircle, CheckCircle2, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useClasses } from '@/hooks/useClasses';
import { getFieldConfig, type FieldConfig } from '@/lib/fieldConfigs';
import { StudentImportError, importStudents, type CreateStudentInput } from '@/lib/api/students';
import { createTeacher, type CreateTeacherInput } from '@/lib/api/teachers';
import { downloadExcelTemplate, parsePastedExcelData } from '@/lib/excel-utils';

interface BulkImportModalProps {
  type: 'student' | 'teacher';
  educationModel: string;
  academicYearId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const IMPORT_CONCURRENCY = 8;

function normalizeGender(value: string | undefined): 'MALE' | 'FEMALE' | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  if (['F', 'FEMALE', 'ស្រី'].includes(normalized)) return 'FEMALE';
  if (['M', 'MALE', 'ប្រុស'].includes(normalized)) return 'MALE';
  return undefined;
}

export default function BulkImportModal({ type, educationModel, academicYearId, onClose, onSuccess }: BulkImportModalProps) {
  const tDynamic = useTranslations('dynamicFields');
  const { classes, isLoading: classesLoading } = useClasses({ academicYearId });
  
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([{}]); // Start with one empty row
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Flatten all sections to get a simple ordered array of fields for the grid
    const config = getFieldConfig(educationModel);
    const sections = type === 'student' ? config.student.sections : config.teacher.sections;
    const allFields = sections.flatMap(section => section.fields);
    setFields(allFields);
  }, [educationModel, type]);

  const handleDownloadTemplate = () => {
    downloadExcelTemplate(fields, `stunity_bulk_import_template_${educationModel.toLowerCase()}.xlsx`, (key) => tDynamic(key as any));
  };

  const handleCellChange = (rowIndex: number, key: string, value: string) => {
    const newRows = [...rows];
    if (!newRows[rowIndex]) newRows[rowIndex] = {};
    newRows[rowIndex][key] = value;
    setRows(newRows);
  };

  const handleAddRow = () => {
    setRows([...rows, {}]);
  };

  const handleAddTenRows = () => {
    setRows([...rows, ...Array.from({ length: 10 }, () => ({}))]);
  };

  const handleRemoveRow = (index: number) => {
    // If the row is completely empty, just delete it immediately without asking
    const row = rows[index];
    const isRowEmpty = !row || Object.keys(row).length === 0 || Object.keys(row).every(k => !row[k]);
    
    if (isRowEmpty) {
      executeRemoveRow(index);
    } else {
      setRowToDelete(index);
    }
  };

  const executeRemoveRow = (index: number) => {
    if (rows.length === 1) {
      setRows([{}]); // Just clear it if it's the last one
    } else {
      const newRows = rows.filter((_, i) => i !== index);
      setRows(newRows);
    }
    setRowToDelete(null);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedData = e.clipboardData.getData('text');
    if (!pastedData) return;

    // Check if looks like TSV data
    if (pastedData.includes('\t') || pastedData.includes('\n')) {
      e.preventDefault();
      const parsedRows = parsePastedExcelData(pastedData, fields);
      
      if (parsedRows.length > 0) {
        // Find the active cell to paste at (simplified: we just append or replace empty rows)
        const emptyRowsFilter = rows.filter(r => Object.keys(r).length > 0 || r === rows[0]);
        // If the first row is completely empty, replace it. Otherwise append.
        if (emptyRowsFilter.length === 1 && Object.keys(emptyRowsFilter[0]).length === 0) {
          setRows(parsedRows);
        } else {
          setRows([...rows, ...parsedRows]);
        }
      }
    }
  };

  const handleSave = async () => {
    // Filter out completely empty rows
    const validRows = rows.filter(row => Object.keys(row).some(k => !!row[k]));
    
    if (validRows.length === 0) {
      setErrors([`Please enter at least one valid ${type} record.`]);
      return;
    }

    const preparedRows: Array<{ rowNumber: number; data: Record<string, string> }> = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      try {
        const rowData = { ...validRows[i] } as any;
        
        // Basic validation: must have native or english names
        const hasNative = rowData.firstName || rowData.lastName;
        const hasEng = rowData.englishFirstName || rowData.englishLastName;
        
        if (!hasNative && !hasEng) {
          throw new Error('A valid name (Native or English) is required');
        }

        for (const field of fields) {
          if (field.required && !String(rowData[field.key] ?? '').trim()) {
            throw new Error(`${tDynamic(field.key as any)} is required`);
          }
        }

        const normalizedGender = normalizeGender(rowData.gender);
        if (rowData.gender && !normalizedGender) {
          throw new Error('Gender must be MALE/FEMALE, M/F, ប្រុស, or ស្រី');
        }
        if (normalizedGender) rowData.gender = normalizedGender;
        
        if (type === 'student' && selectedClassId) {
          rowData.classId = selectedClassId;
        }

        if (type === 'teacher') {
          // Keep a default for legacy/default configurations where hire date is not required.
          if (!rowData.hireDate) rowData.hireDate = new Date().toISOString().split('T')[0];
          if (!rowData.gender) rowData.gender = 'MALE';
        }

        preparedRows.push({ rowNumber: i + 1, data: rowData });
      } catch (err: any) {
        validationErrors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);
    setProgress(0);
    const importErrors: Array<{ rowNumber: number; message: string }> = [];
    let completed = 0;
    let nextIndex = 0;

    if (type === 'student') {
      try {
        await importStudents(preparedRows.map(row => row.data as CreateStudentInput));
        setProgress(100);
      } catch (err: any) {
        if (err instanceof StudentImportError && err.rowErrors.length > 0) {
          setErrors(err.rowErrors);
          setSaving(false);
          return;
        }
        importErrors.push({ rowNumber: 1, message: err.message });
      }
      setSaving(false);

      if (importErrors.length > 0) {
        setErrors(importErrors.map(error => `Row ${error.rowNumber}: ${error.message}`));
      } else {
        onSuccess();
      }
      return;
    }

    const worker = async () => {
      while (nextIndex < preparedRows.length) {
        const current = preparedRows[nextIndex++];
        try {
          await createTeacher(current.data as CreateTeacherInput);
        } catch (err: any) {
          importErrors.push({ rowNumber: current.rowNumber, message: err.message });
        } finally {
          completed += 1;
          setProgress(Math.round((completed / preparedRows.length) * 100));
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(IMPORT_CONCURRENCY, preparedRows.length) },
        () => worker()
      )
    );

    setSaving(false);

    if (importErrors.length > 0) {
      setErrors(
        importErrors
          .sort((a, b) => a.rowNumber - b.rowNumber)
          .map(error => `Row ${error.rowNumber}: ${error.message}`)
      );
      // We don't close so the user can see what failed
    } else {
      onSuccess();
    }
  };

  const handleClose = () => {
    const hasData = rows.some(row => Object.keys(row).some(k => !!row[k]));
    if (hasData && !saving) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200 dark:bg-black/60">
      <div className="relative flex w-full max-w-[95vw] h-[90vh] flex-col overflow-hidden rounded-[1.35rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.98)_100%)] shadow-[0_40px_110px_-40px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 animate-in slide-in-from-bottom-4 duration-200 dark:border-gray-800/70 dark:bg-none dark:bg-gray-900/95 dark:ring-gray-800/70">
        
        {/* Confirm Row Delete Overlay */}
        {rowToDelete !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-[1.35rem] animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-3 text-rose-600 dark:text-rose-400">
                <Trash2 className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Row {rowToDelete + 1}?</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-gray-400 mb-6 leading-relaxed">
                This row contains data. Are you sure you want to remove it from the import list?
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setRowToDelete(null)} 
                  className="px-4 py-2 rounded-[0.85rem] text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => executeRemoveRow(rowToDelete)} 
                  className="px-4 py-2 rounded-[0.85rem] text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition-colors"
                >
                  Delete Row
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Close Overlay */}
        {showConfirmClose && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-[1.35rem] animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-3 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Discard Changes?</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-gray-400 mb-6 leading-relaxed">
                You have unsaved data in the grid. Are you sure you want to close this window and lose all typed data?
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowConfirmClose(false)} 
                  className="px-4 py-2 rounded-[0.85rem] text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  Keep Editing
                </button>
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 rounded-[0.85rem] text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition-colors"
                >
                  Discard Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-gray-800/70">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              Bulk Excel Import
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Import Multiple {type === 'student' ? 'Students' : 'Teachers'}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Download the template, fill it out in Excel, and paste the rows directly into this grid.</p>
          </div>
          <div className="flex items-center gap-3">
            {type === 'student' && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-10 rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 dark:border-gray-800/70 dark:bg-gray-900/50 dark:text-gray-200"
              >
                <option value="">Assign to class (Optional)</option>
                {!classesLoading && classes?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <button type="button" onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 rounded-[0.85rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-800/70 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/50">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Download Template
            </button>
            <button type="button" onClick={handleClose} className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Grid Area */}
        <div 
          className="flex-1 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-transparent"
          onPaste={handlePaste}
        >
          {errors.length > 0 && (
            <div className="m-6 mb-0 rounded-[1rem] border border-rose-100 bg-rose-50/80 p-4 text-sm font-medium text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 overflow-y-auto max-h-32">
              <div className="flex items-center gap-2 font-bold mb-2">
                <AlertCircle className="h-4 w-4" /> Import Errors ({errors.length})
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          <div className="flex-1 overflow-hidden p-6 flex flex-col">
            <div className="flex-1 overflow-auto rounded-[1rem] border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900" ref={gridRef}>
              <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800 border-collapse">
                <thead className="bg-slate-50 dark:bg-gray-800">
                  <tr>
                    <th className="sticky top-0 left-0 z-40 w-20 bg-slate-50 dark:bg-gray-800 border-b border-r border-slate-200 dark:border-gray-700 px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">#</th>
                    {fields.map(field => (
                      <th key={field.key} className="sticky top-0 z-30 min-w-[200px] max-w-[300px] bg-slate-50 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                        {tDynamic(field.key as any)} {field.required && <span className="text-rose-500">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/40">
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 dark:bg-gray-900 dark:group-hover:bg-slate-800 px-2 py-2 border-r border-slate-200 dark:border-gray-800">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-semibold text-slate-400 select-none w-4 text-right">
                            {rowIndex + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(rowIndex)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all dark:hover:bg-rose-500/10"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      {fields.map(field => (
                        <td key={field.key} className="p-0 border-r border-slate-100 dark:border-gray-800/40 relative">
                          <input
                            type="text"
                            value={row[field.key] || ''}
                            onChange={(e) => handleCellChange(rowIndex, field.key, e.target.value)}
                            placeholder=""
                            className="w-full h-full min-h-[44px] px-4 py-2 text-sm bg-transparent outline-none focus:bg-indigo-50/50 dark:focus:bg-indigo-500/10 focus:ring-1 focus:ring-inset focus:ring-indigo-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-gray-600"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-slate-200 dark:border-gray-800/70 bg-slate-50/50 dark:bg-gray-900/50 flex gap-4">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <Plus className="h-4 w-4" />
                  Add Row
                </button>
                <button
                  type="button"
                  onClick={handleAddTenRows}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Plus className="h-4 w-4" />
                  Add 10 Rows
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-4 dark:border-gray-800/70 dark:bg-gray-900/80">
          <div className="text-sm font-medium text-slate-500">
            {rows.length} row{rows.length !== 1 && 's'} ready to import
            <span className="ml-2 text-xs text-slate-400 font-normal">
              (Pro tip: Click anywhere in the grid and hit Ctrl+V to paste from Excel)
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {saving && (
              <div className="flex items-center gap-2 mr-3">
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{progress}%</span>
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-gray-800">
                  <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            
            <button type="button" onClick={handleClose} disabled={saving} className="inline-flex h-10 items-center justify-center rounded-[0.85rem] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-gray-800/70 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/50">
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSave}
              disabled={saving} 
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[0.85rem] bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 text-sm font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="h-4 w-4" /> Start Import</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
