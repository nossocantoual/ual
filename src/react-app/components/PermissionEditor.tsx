import { useState } from 'react';
import type { GranularPermissions, PermissionLevel } from '@/shared/permissions';
import { FIELD_LABELS } from '@/shared/permissions';

interface PermissionEditorProps {
  permissions: GranularPermissions;
  onChange: (permissions: GranularPermissions) => void;
}

export default function PermissionEditor({ permissions, onChange }: PermissionEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['settings']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updatePermission = (
    section: keyof GranularPermissions,
    field: string,
    level: PermissionLevel
  ) => {
    // Ensure the section exists by creating a deep clone
    const updated = JSON.parse(JSON.stringify(permissions));
    
    // Initialize section if it doesn't exist
    if (!updated[section]) {
      updated[section] = {};
    }
    
    // Update the specific field
    updated[section][field] = level;
    
    onChange(updated);
  };

  const setSectionPermissions = (section: keyof GranularPermissions, level: PermissionLevel) => {
    const sectionFields = FIELD_LABELS[section];
    if (!sectionFields) return;

    const updatedSection: any = {};
    for (const field in sectionFields) {
      updatedSection[field] = level;
    }

    const updated = JSON.parse(JSON.stringify(permissions));
    updated[section] = updatedSection;
    
    onChange(updated);
  };

  const renderPermissionRow = (
    section: keyof GranularPermissions,
    field: string,
    label: string
  ) => {
    const currentLevel = ((permissions[section] as any)?.[field] as PermissionLevel) || 'none';

    return (
      <div key={field} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg">
        <label className="text-white/90 text-sm flex-1">{label}</label>
        <select
          value={currentLevel}
          onChange={(e) => updatePermission(section, field, e.target.value as PermissionLevel)}
          className="px-3 py-1.5 bg-white border border-white/30 rounded-lg text-black text-sm"
        >
          <option value="none">Sem Acesso</option>
          <option value="read">Visualizar</option>
          <option value="write">Visualizar e Editar</option>
        </select>
      </div>
    );
  };

  const renderSection = (section: keyof GranularPermissions, title: string) => {
    const isExpanded = expandedSections.has(section);
    const sectionPerms = FIELD_LABELS[section];
    if (!sectionPerms) return null;

    return (
      <div key={section} className="border border-white/10 rounded-lg overflow-hidden">
        <div
          onClick={() => toggleSection(section)}
          className="flex items-center justify-between p-4 bg-white/5 cursor-pointer hover:bg-white/10 transition-all"
        >
          <h4 className="text-white font-semibold">{title}</h4>
          <div className="flex items-center gap-3">
            <select
              value="action"
              onChange={(e) => {
                if (e.target.value !== 'action') {
                  setSectionPermissions(section, e.target.value as PermissionLevel);
                }
                e.target.value = 'action';
              }}
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-white border border-white/30 rounded-lg text-black text-sm"
            >
              <option value="action">Ações Rápidas</option>
              <option value="none">Sem Acesso</option>
              <option value="read">Visualizar</option>
              <option value="write">Visualizar e Editar</option>
            </select>
            <span className="text-white/70">
              {isExpanded ? '▼' : '▶'}
            </span>
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4 space-y-2 bg-black/20">
            {Object.entries(sectionPerms).map(([field, label]) =>
              renderPermissionRow(section, field, label)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-white font-medium mb-3">Permissões Detalhadas</h3>
      {renderSection('settings', 'Configurações')}
      {renderSection('list', 'Lista de Presença')}
      {renderSection('blocked', 'Usuários Suspensos')}
      {renderSection('cadastrados', 'Usuários Cadastrados')}
      {renderSection('usuarios', 'Administradores')}
      {renderSection('history', 'Histórico')}
    </div>
  );
}
