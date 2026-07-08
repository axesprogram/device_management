export const ConfigProvider = ({ children }) => {
    const [appConfig, setAppConfig] = useState(null);
    const [adminToken, setAdminToken] = useState(null);
    const [view, setView] = useState('home');
    const [editingDeviceData, setEditingDeviceData] = useState({});
    const [originalDeviceData, setOriginalDeviceData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingFields, setUploadingFields] = useState({});
    const [isDirty, setIsDirty] = useState(false);

    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
    const [confirm, setConfirm] = useState({ isOpen: false, message: '', onConfirm: null });
    
    const showToast = useCallback((msg, type = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast(p => ({ ...p, show: false })), 3000);
    }, []);

    const triggerConfirm = useCallback((message, onConfirm) => {
        setConfirm({ isOpen: true, message, onConfirm });
    }, []);
    
    const dynamicExcludedKeys = useMemo(() => {
        if (!appConfig?.CUSTOM_SPACES) return [];
        
        // A. 找出所有 is_multiple 為 true 的類別 ID (如 teachers, ifp_items)
        const multipleCategoryIds = appConfig.CUSTOM_SPACES
            .filter(cat => cat.is_multiple === true)
            .map(cat => cat.id);

        // B. 🚀 找出所有模板中設定為 isAlwaysReadOnly 的欄位名稱
        const readOnlyFieldNames = [];
        if (appConfig.SCHEMA.TEMPLATES) {
            Object.values(appConfig.SCHEMA.TEMPLATES).forEach(template => {
                template.forEach(field => {
                    if (field.isAlwaysReadOnly) {
                        readOnlyFieldNames.push(field.name);
                    }
                });
            });
        }

        // C. 合併所有雜訊 (多重類別 + 唯讀欄位 + 系統時間戳記)
        return [
            ...multipleCategoryIds, 
            ...readOnlyFieldNames,
            'updatedAt', 'lastModified', '_isDirty', 'layoutItems'
        ];
    }, [appConfig]);

    const value = useMemo(() => ({ 
        appConfig, setAppConfig, 
        adminToken, setAdminToken, 
        view, setView,  
        originalDeviceData, setOriginalDeviceData, 
        editingDeviceData, setEditingDeviceData, 
        isLoading, setIsLoading, 
        isEditing, setIsEditing, 
        isDirty, setIsDirty, 
        uploadingFields, setUploadingFields, 
        showToast, 
        triggerConfirm, 
        dynamicExcludedKeys, 
    }), [appConfig, adminToken, view, originalDeviceData, editingDeviceData, isLoading, isEditing, isDirty, uploadingFields, showToast, triggerConfirm, dynamicExcludedKeys]) ;

    return (
        <ConfigContext.Provider value={value} >
            {children}
            {/* Toast UI 放在這裡，保證全域可用 */}
            {toast.show && <div className="custom-toast-container">...</div>}
            <ConfirmModal 
                isOpen={confirm.isOpen} 
                message={confirm.message}
                onConfirm={() => {
                    confirm.onConfirm?.(); // 執行傳入的邏輯
                    setConfirm({ isOpen: false, message: '', onConfirm: null });
                }}
                onCancel={() => setConfirm({ isOpen: false, message: '', onConfirm: null })}
            />
        </ConfigContext.Provider>
    );
};