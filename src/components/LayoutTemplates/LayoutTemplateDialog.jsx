import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    X, Star, Trash2, Download, Upload, Plus, Grid, Clock,
    BarChart2, TrendingUp, Layout as LayoutIcon, Save
} from 'lucide-react';
import { useFocusTrap, useKeyboardNav, useListNavigation } from '../../hooks';
import { layoutTemplateService } from '../../utils/layoutTemplateService';
import styles from './LayoutTemplateDialog.module.css';

/**
 * Format date for display
 */
const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

/**
 * Get layout label
 */
const getLayoutLabel = (layout) => {
    const labels = {
        '1': '1 Chart',
        '2': '2 Charts',
        '3': '3 Charts',
        '4': '4 Charts',
    };
    return labels[layout] || `${layout} Charts`;
};

/**
 * Save Template Dialog (inline name input)
 */
const SaveTemplateForm = ({ onSave, onCancel }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim(), description.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.saveForm}>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Template Name *</label>
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Trading Setup"
                    className={styles.formInput}
                    maxLength={50}
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description (optional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description of this layout..."
                    className={styles.formTextarea}
                    rows={2}
                    maxLength={200}
                />
            </div>
            <div className={styles.formActions}>
                <button type="button" onClick={onCancel} className={styles.btnSecondary}>
                    Cancel
                </button>
                <button type="submit" disabled={!name.trim()} className={styles.btnPrimary}>
                    Save Template
                </button>
            </div>
        </form>
    );
};

/**
 * Template Preview Card
 */
const TemplatePreview = ({ template, onLoad, onDelete, onToggleFavorite }) => {
    if (!template) {
        return (
            <div className={styles.previewEmpty}>
                <LayoutIcon size={48} strokeWidth={1} />
                <p>Select a template to preview</p>
            </div>
        );
    }

    const indicatorSummaries = template.charts?.map(chart => ({
        symbol: chart.symbol,
        interval: chart.interval,
        indicators: layoutTemplateService.getIndicatorSummary(chart.indicators),
    })) || [];

    return (
        <div className={styles.preview}>
            <div className={styles.previewHeader}>
                <h3 className={styles.previewTitle}>{template.name}</h3>
                <button
                    onClick={() => onToggleFavorite(template.id)}
                    className={`${styles.favoriteBtn} ${template.isFavorite ? styles.favoriteActive : ''}`}
                    title={template.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <Star size={18} fill={template.isFavorite ? 'currentColor' : 'none'} />
                </button>
            </div>

            {template.description && (
                <p className={styles.previewDescription}>{template.description}</p>
            )}

            <div className={styles.previewMeta}>
                <div className={styles.metaItem}>
                    <Grid size={14} />
                    <span>{getLayoutLabel(template.layout)}</span>
                </div>
                <div className={styles.metaItem}>
                    <Clock size={14} />
                    <span>{formatDate(template.createdAt)}</span>
                </div>
                {template.chartType && (
                    <div className={styles.metaItem}>
                        <BarChart2 size={14} />
                        <span>{template.chartType}</span>
                    </div>
                )}
            </div>

            <div className={styles.previewCharts}>
                <h4 className={styles.previewSubtitle}>Charts</h4>
                <div className={styles.chartGrid} data-layout={template.layout}>
                    {indicatorSummaries.map((chart, index) => (
                        <div key={index} className={styles.chartCard}>
                            <div className={styles.chartSymbol}>
                                {chart.symbol} <span className={styles.chartInterval}>{chart.interval}</span>
                            </div>
                            {chart.indicators && (
                                <div className={styles.chartIndicators}>
                                    <TrendingUp size={12} />
                                    <span>{chart.indicators}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.previewActions}>
                <button onClick={() => onLoad(template)} className={styles.btnPrimary}>
                    Load Template
                </button>
                <button onClick={() => onDelete(template.id)} className={styles.btnDanger}>
                    <Trash2 size={16} />
                    Delete
                </button>
            </div>
        </div>
    );
};

/**
 * Layout Template Dialog
 */
const LayoutTemplateDialog = ({
    isOpen,
    onClose,
    currentState,
    onLoadTemplate,
    showToast,
}) => {
    const [templates, setTemplates] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const fileInputRef = useRef(null);
    const focusTrapRef = useFocusTrap(isOpen, { autoFocus: false });

    // Load templates on open
    useEffect(() => {
        if (isOpen) {
            const loaded = layoutTemplateService.getAllSorted();
            setTemplates(loaded);
            setSelectedId(loaded[0]?.id || null);
            setActiveIndex(0);
            setShowSaveForm(false);
        }
    }, [isOpen]);

    // Keyboard navigation
    useKeyboardNav({
        enabled: isOpen && !showSaveForm,
        onEscape: onClose,
    });

    useListNavigation({
        enabled: isOpen && !showSaveForm && templates.length > 0,
        itemCount: templates.length,
        activeIndex,
        setActiveIndex,
        onSelect: (index) => {
            setSelectedId(templates[index]?.id);
        },
    });

    // Sync selected with active index
    useEffect(() => {
        if (templates[activeIndex]) {
            setSelectedId(templates[activeIndex].id);
        }
    }, [activeIndex, templates]);

    const selectedTemplate = useMemo(() => {
        return templates.find(t => t.id === selectedId) || null;
    }, [templates, selectedId]);

    // Handlers
    const handleSaveTemplate = useCallback((name, description) => {
        const template = layoutTemplateService.captureCurrentLayout(currentState, name, description);
        const result = layoutTemplateService.save(template);

        if (result.success) {
            setTemplates(layoutTemplateService.getAllSorted());
            setSelectedId(result.template.id);
            setShowSaveForm(false);
            showToast?.('Template saved successfully', 'success');
        } else {
            showToast?.(result.error || 'Failed to save template', 'error');
        }
    }, [currentState, showToast]);

    const handleLoadTemplate = useCallback((template) => {
        onLoadTemplate?.(template);
        onClose();
        showToast?.(`Loaded template: ${template.name}`, 'success');
    }, [onLoadTemplate, onClose, showToast]);

    const handleDeleteTemplate = useCallback((id) => {
        const template = templates.find(t => t.id === id);
        if (!template) return;

        if (window.confirm(`Delete template "${template.name}"?`)) {
            const result = layoutTemplateService.delete(id);
            if (result.success) {
                const updated = layoutTemplateService.getAllSorted();
                setTemplates(updated);
                setSelectedId(updated[0]?.id || null);
                showToast?.('Template deleted', 'success');
            } else {
                showToast?.(result.error || 'Failed to delete template', 'error');
            }
        }
    }, [templates, showToast]);

    const handleToggleFavorite = useCallback((id) => {
        const result = layoutTemplateService.toggleFavorite(id);
        if (result.success) {
            setTemplates(layoutTemplateService.getAllSorted());
        }
    }, []);

    const handleExportAll = useCallback(() => {
        const json = layoutTemplateService.exportAll();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `layout-templates-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast?.('Templates exported successfully', 'success');
    }, [showToast]);

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = layoutTemplateService.importTemplates(event.target.result);
            if (result.success) {
                setTemplates(layoutTemplateService.getAllSorted());
                showToast?.(`Imported ${result.imported} template(s)`, 'success');
                if (result.errors) {
                    console.warn('Import warnings:', result.errors);
                }
            } else {
                showToast?.(result.error || 'Failed to import templates', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    }, [showToast]);

    const handleOverlayClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div
            className={styles.overlay}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-dialog-title"
        >
            <div ref={focusTrapRef} className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="template-dialog-title" className={styles.title}>
                        <LayoutIcon size={20} />
                        Layout Templates
                    </h2>
                    <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <span className={styles.sidebarTitle}>Templates</span>
                            <span className={styles.templateCount}>
                                {templates.length}/{layoutTemplateService.MAX_TEMPLATES}
                            </span>
                        </div>

                        <div className={styles.templateList}>
                            {templates.length === 0 ? (
                                <div className={styles.emptyList}>
                                    <p>No templates saved yet</p>
                                </div>
                            ) : (
                                templates.map((template, index) => (
                                    <button
                                        key={template.id}
                                        onClick={() => {
                                            setSelectedId(template.id);
                                            setActiveIndex(index);
                                        }}
                                        className={`${styles.templateItem} ${selectedId === template.id ? styles.templateItemActive : ''}`}
                                    >
                                        {template.isFavorite && (
                                            <Star size={14} className={styles.starIcon} fill="currentColor" />
                                        )}
                                        <span className={styles.templateName}>{template.name}</span>
                                        <span className={styles.templateLayout}>{template.layout}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className={styles.sidebarActions}>
                            <button
                                onClick={() => setShowSaveForm(true)}
                                className={styles.sidebarBtn}
                                disabled={layoutTemplateService.isAtMaxCapacity()}
                                title={layoutTemplateService.isAtMaxCapacity() ? 'Max templates reached' : 'Save current layout'}
                            >
                                <Plus size={16} />
                                New Template
                            </button>

                            <div className={styles.sidebarDivider} />

                            <button onClick={handleImportClick} className={styles.sidebarBtn}>
                                <Upload size={16} />
                                Import
                            </button>
                            <button
                                onClick={handleExportAll}
                                className={styles.sidebarBtn}
                                disabled={templates.length === 0}
                            >
                                <Download size={16} />
                                Export All
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className={styles.main}>
                        {showSaveForm ? (
                            <div className={styles.saveFormContainer}>
                                <h3 className={styles.saveFormTitle}>
                                    <Save size={18} />
                                    Save Current Layout
                                </h3>
                                <SaveTemplateForm
                                    onSave={handleSaveTemplate}
                                    onCancel={() => setShowSaveForm(false)}
                                />
                            </div>
                        ) : (
                            <TemplatePreview
                                template={selectedTemplate}
                                onLoad={handleLoadTemplate}
                                onDelete={handleDeleteTemplate}
                                onToggleFavorite={handleToggleFavorite}
                            />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button onClick={onClose} className={styles.btnSecondary}>
                        Close
                    </button>
                </div>

                {/* Hidden file input for import */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
};

export default LayoutTemplateDialog;
