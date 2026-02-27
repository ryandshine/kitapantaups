import React from 'react';

export interface ColumnOption {
    id: string;
    label: string;
    category: string;
}

interface ColumnSelectorProps {
    columns: ColumnOption[];
    selectedColumns: string[];
    onToggle: (columnId: string) => void;
    onSelectAll: (category?: string) => void;
    onDeselectAll: (category?: string) => void;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
    columns,
    selectedColumns,
    onToggle,
    onSelectAll,
    onDeselectAll
}) => {
    const categories = Array.from(new Set(columns.map(col => col.category)));

    return (
        <div className="flex flex-col gap-6">
            {categories.map(category => {
                const categoryCols = columns.filter(col => col.category === category);
                const isAllCategorySelected = categoryCols.every(col => selectedColumns.includes(col.id));

                return (
                    <div key={category} className="flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{category}</h3>
                            <button
                                onClick={() => isAllCategorySelected ? onDeselectAll(category) : onSelectAll(category)}
                                className="text-[10px] font-bold text-primary hover:underline transition-all"
                            >
                                {isAllCategorySelected ? 'Reset' : 'Pilih Semua'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {categoryCols.map(col => (
                                <label
                                    key={col.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${selectedColumns.includes(col.id)
                                        ? 'bg-primary/5 border-primary shadow-sm shadow-primary/10'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.includes(col.id)}
                                        onChange={() => onToggle(col.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                    <span className={`text-sm font-medium transition-colors ${selectedColumns.includes(col.id) ? 'text-primary' : 'text-slate-600 group-hover:text-slate-900'
                                        }`}>
                                        {col.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
