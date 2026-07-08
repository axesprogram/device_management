    
    // 🚧 開發模式開關：true = 免登入開發中, false = 正式發布環境
    const IS_DEV_MODE = true;

    const formatTime = (isoString) => {
        if (!isoString) return '尚無紀錄';
        const d = new Date(isoString);
        return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    };

    // 西元轉民國 (例如: 2024-02-13 -> 113/02/13)
    const toROCDate = (date) => {
        if (!date) return "";
        const d = new Date(date);
        if (isNaN(d.getTime())) return date; // 如果本來就是字串則原樣回傳
        const rocYear = d.getFullYear() - 1911;
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${rocYear}/${mm}/${dd}`;
    };

    // 民國轉西元 (解析試算表存入的 112/05/20)
    const parseROCDate = (str) => {
        if (!str || typeof str !== 'string') return new Date(str);
        const parts = str.split('/');
        if (parts.length === 3) {
            const year = parseInt(parts[0]) + 1911;
            return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(str);
    };

    // 核心引擎：負責欄位分組、圖片判斷、事件分發
    const DeviceFormPanel = memo(({ 
        deviceId, 
        prefix, 
        template, 
        extraFields = [], 
        editingDeviceData, 
        handleInputChange, 
        handlePhotoUpload, 
        isEditing, 
        deviceTitle,
        uploadingFields
    }) => {
        const filteredFields = useMemo(() => {
            const base = template ? [...template] : [];
            // 根據 scope 過濾並合併 extraFields
            return [...extraFields, ...base].filter(f => !f.scope || f.scope.includes(deviceId));
        }, [template, extraFields, deviceId]);

        const groups = useMemo(() => {
            return filteredFields.reduce((acc, f) => {
                const cat = f.deviceType || '一般資訊';
                if (!acc[cat]) acc[cat] = [];
                // 防呆：避免 key 重複導致的渲染問題
                if (!acc[cat].some(existing => existing.key === f.key)) {
                    acc[cat].push(f);
                }
                return acc;
            }, {});
        }, [filteredFields]);

        return (
            <div className="space-y-8">
                {Object.entries(groups).map(([catName, fields]) => (
                    <div key={catName} className="fade-in">
                        {/* 分類標籤 UI */}
                        <div className="flex items-center gap-4 mb-6 mt-8"> {/* 增加間距讓排版不擁擠 */}
                            <div className="morandi-category-header">
                                <div className="category-dot"></div>
                                <span>{catName}</span>
                            </div>
                            
                            {/* 後方線條顏色也稍微加深一點點，對齊整體視覺 */}
                            <div className="flex-1 h-[2px] bg-gray-200 border-b border-dashed border-gray-300"></div>
                        </div>

                        {/* 欄位呈現網格 */}
                        <div className="flex flex-wrap -mx-2">
                            {fields.map(f => {
                                // 這裡自動處理 prefix
                                const fieldName = f.key.includes('_') 
                                    ? f.key 
                                    : (prefix === deviceId ? f.key : `${prefix}_${f.key}`);

                                const isImgField = f.type === 'file' || f.key.toLowerCase().includes('img');
                                
                                return (
                                    <Field 
                                        key={fieldName}
                                        label={f.label}
                                        name={fieldName}
                                        type={f.type || "text"}
                                        value={editingDeviceData[fieldName] || ''}
                                        options={f.options || []}
                                        isEditing={isEditing}
                                        validation={f.validation}
                                        relatedData={editingDeviceData}
                                        // 智慧型 onChange 派發
                                        onChange={f.type === 'file' 
                                            ? (e) => handlePhotoUpload(e, fieldName, deviceTitle, deviceId, f.label)
                                            : handleInputChange
                                        }
                                        // 圖片佔一半寬度，文字佔 1/3 或 1/4
                                        width={f.width || (isImgField ? "w-full md:w-1/2" : "w-full md:w-1/3 lg:w-1/4")}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    });

    const SingleDeviceLayout = ({ 
        config, 
        appConfig, 
        editingDeviceData, 
        handleInputChange, 
        handlePhotoUpload, 
        isEditing, 
        uploadingFields 
    }) => {
        // 1. 取得該設備的 Template
        const template = appConfig[config.template] || [];

        // 🚀 2. 核心修正：改為檢查 id 而非 asset_tag
        // 如果這間教室還沒建立資料，我們在前端先「預擬」一個穩定 ID
        // 建議格式：類別_位置代碼 (例如：ap_1F01)，這能保證唯一性且不重複建立
        const safeData = (editingDeviceData && editingDeviceData.id) ? editingDeviceData : {
            ...editingDeviceData,
            id: editingDeviceData?.id || `${config.id}_${editingDeviceData?.locCode || 'new'}`,
            category: config.id, // 確保分類正確
            asset_tag: editingDeviceData?.asset_tag || '' // 財標回歸純文字欄位
        };

        return (
            <div className="bg-white border border-[#d1d5db] p-8 rounded-[2.5rem] shadow-sm relative">
                
                {/* 提示：單一設備不顯示刪除按鈕 */}
                
                <DeviceFormPanel 
                    // 🚀 修正：deviceId 必須傳入該資料列的唯一 ID，上傳照片才會正確命名
                    deviceId={safeData.id}
                    prefix={config.id} 
                    template={template}
                    extraFields={config.extraFields || []}
                    editingDeviceData={safeData}
                    
                    // 🚀 修正：handleInputChange 改為傳入 ID
                    handleInputChange={(e) => handleInputChange(e, safeData.id)}
                    
                    handlePhotoUpload={handlePhotoUpload}
                    isEditing={isEditing}
                    deviceTitle={config.label}
                    uploadingFields={uploadingFields}
                />

                {/* 🚀 修正：判斷提示改用 id */}
                {!editingDeviceData?.id && isEditing && (
                    <div className="absolute top-4 right-8 text-xs text-[#94a3b8] font-bold">
                        <i className="fas fa-info-circle mr-1"></i> 填寫後將自動建立資料
                    </div>
                )}
            </div>
        );
    };

    // B. 多重設備清單版 (如：座位電腦 20 台、大屏 4 台)
    const MultiDeviceLayout = ({ 
        config, 
        appConfig, 
        devices = [], 
        activeDeviceId,
        setActiveDeviceId,
        handleInputChange, 
        handlePhotoUpload, 
        isEditing, 
        handleDeleteItem, // 刪除功能只在這裡出現
        onAdd,            // 新增功能只在這裡出現
        uploadingFields
    }) => {
        const scrollRef = useRef(null);
        const [scrollState, setScrollState] = useState({ hasMoreAbove: false, hasMoreBelow: false });

        // 滾動偵測
        const checkScroll = useCallback(() => {
            const el = scrollRef.current;
            if (!el) return;
            setScrollState({
                hasMoreAbove: el.scrollTop > 10,
                hasMoreBelow: el.scrollHeight - el.scrollTop - el.clientHeight > 10
            });
        }, []);

        useEffect(() => {
            checkScroll();
            window.addEventListener('resize', checkScroll);
            return () => window.removeEventListener('resize', checkScroll);
        }, [checkScroll, devices]); 

        const deviceMap = useMemo(() => {
            return new Map(devices.map(d => [d.id, d]));
        }, [devices]);

        // 查找時直接存取
        const activeDevice = useMemo(() => {
            return deviceMap.get(activeDeviceId) || devices[0] || null;
        }, [deviceMap, activeDeviceId, devices]);

        // 如果沒有設備，渲染一個簡單的佔位符 (這能避免下方的 DeviceFormPanel 讀取到 undefined)
        if (!activeDevice && devices.length > 0) {
            // 若是因為刪除導致找不到，這裡可以自動修正狀態 (副作用)
            useEffect(() => {
                setActiveDeviceId(devices[0].id);
            }, [devices, setActiveDeviceId]);
            return null; // 等待下一次渲染
        }

        return (
            <div className="flex flex-col md:flex-row gap-6 items-start fade-in">
                {/* 左側清單索引 */}
                <div className="w-full md:w-64 flex-shrink-0 md:sticky md:top-28 z-10">
                    <div className="bg-white p-4 rounded-[2rem] border border-gray-200 shadow-sm relative overflow-hidden">
                        
                        {/* 上下滾動箭頭 (維持原樣) */}
                        {scrollState.hasMoreAbove && (
                            <div className="absolute top-12 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 flex justify-center items-start pointer-events-none"><i className="fas fa-chevron-up text-[10px] text-gray-300 animate-bounce mt-1"></i></div>
                        )}
                        
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h4 className="text-[10px] font-black text-[#8d939e] uppercase tracking-widest">{config.label}清單</h4>
                            {isEditing && (
                                <button onClick={onAdd} className="text-[#94a38d] hover:scale-110 transition" title="新增一台">
                                    <i className="fas fa-plus-circle text-lg"></i>
                                </button>
                            )}
                        </div>
                        
                        <div ref={scrollRef} onScroll={checkScroll} className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-hide py-1">
                            {devices.map((device, index) => {
                                // 🚀 1. 選中判斷改用 id
                                const isSelected = activeDeviceId === device?.id || (!activeDeviceId && index === 0);
                                const num = index + 1;
                                const hasData = Object.keys(device).some(k => {
                                    const ignore = ['asset_tag', 'category', 'updatedAt', 'status', 'locCode', 'id', 'created_at'];
                                    return !ignore.includes(k) && device[k] && String(device[k]).trim() !== '';
                                });

                                return (
                                    <button 
                                        // 🚀 2. Key 改用唯一的 id
                                        key={device?.id} 
                                        // 🚀 3. 點擊切換改傳入 id
                                        onClick={() => setActiveDeviceId(device?.id)}
                                        className={`w-full flex justify-between items-center px-4 py-3 rounded-xl transition-all mb-1 ${
                                            isSelected 
                                                ? `${config.color} text-white shadow-md scale-[1.02]` 
                                                : hasData
                                                    ? 'hover:bg-gray-50 text-[#5e6472]' 
                                                    : 'hover:bg-gray-50 text-gray-400 opacity-60 grayscale'
                                        }`}
                                    >
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="font-bold text-sm truncate w-full text-left">
                                                {/* 優先顯示老師自訂的名稱 (如 teacher_name)，其次是財標，最後是預設名稱 */}
                                                {device?.[config.mainLabelKey] || device?.asset_tag || `${config.label} ${num}`}
                                            </span>
                                            <span className={`text-[10px] truncate w-full text-left ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                                {device[config.subLabelKey] || device.sn || device.model || (hasData ? '詳細資料' : '未設定')}
                                            </span>
                                        </div>
                                        {isSelected && <i className="fas fa-chevron-right text-[10px]"></i>}
                                        {!isSelected && hasData && <i className="fas fa-check-circle text-[10px] text-[#94a38d]"></i>}
                                    </button>
                                );
                            })}
                            
                            {devices.length === 0 && (
                                <div className="text-center py-8 text-gray-300 text-xs italic border-2 border-dashed border-gray-100 rounded-xl">
                                    尚無資料<br/>請點擊右上角新增
                                </div>
                            )}
                        </div>

                        {scrollState.hasMoreBelow && (
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 flex justify-center items-end pointer-events-none"><i className="fas fa-chevron-down text-[10px] text-gray-300 animate-bounce mb-1"></i></div>
                        )}
                    </div>
                </div>

                {/* 右側表單內容 */}
                <div className="flex-1 w-full relative">
                    <div className="bg-white border border-[#d1d5db] p-8 rounded-[2.5rem] shadow-sm relative min-h-[400px]">
                        
                        {/* 🚀 4. 刪除按鈕判斷改用 id */}
                        {isEditing && activeDevice?.id && (
                            <div className="absolute top-6 right-8 z-20">
                                <button 
                                    onClick={handleDeleteItem} 
                                    className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-all text-[10px] font-bold border border-red-100"
                                >
                                    <i className="fas fa-trash-alt"></i>
                                    <span>刪除此台</span>
                                </button>
                            </div>
                        )}

                        {devices.length > 0 ? (
                            <DeviceFormPanel 
                                // 🚀 5. 這裡建議傳入當前設備的真實 ID
                                deviceId={activeDevice?.id}
                                prefix={config.id} // 維持分類前綴
                                template={appConfig[config.template]}
                                extraFields={config.extraFields || []}
                                editingDeviceData={activeDevice}
                                handleInputChange={(e) => handleInputChange(e, activeDevice.id)}
                                handlePhotoUpload={handlePhotoUpload}
                                isEditing={isEditing}
                                deviceTitle={config.label}
                                uploadingFields={uploadingFields}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-300">
                                <i className={`fas ${config.icon} text-6xl mb-4 opacity-20`}></i>
                                <p>此類別尚無設備</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const DeviceSectionRenderer = ({ deviceId, appConfig, devices = [], activeDevice, ...props }) => {
        // 🚀 在這裡直接拿取業務邏輯，不需要從 props 傳入
        const { 
            handleInputChange, 
            handleAddDevice, 
            handleDeleteItem, 
            handlePhotoUpload 
        } = useDeviceManager();
        
        // 1. 找出 Config
        const deviceConfig = appConfig.DEVICE_INVENTORY.find(d => d.id === deviceId);
        if (!deviceConfig) return null;

        // 2. 決定版面
        const LayoutComponent = deviceConfig.isMultiple ? MultiDeviceLayout : SingleDeviceLayout;

        return (
            <div className="fade-in">
                {/* 標題列 */}
                <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl ${deviceConfig.color} shadow-sm border border-white/20`}>
                    <div className="bg-white/50 p-2 rounded-xl backdrop-blur-md">
                        <i className={`fas ${deviceConfig.icon || 'fa-microchip'} text-gray-800`}></i>
                    </div>
                    <h3 className="font-black text-xl text-gray-800 tracking-tight">
                        {deviceConfig.label}
                        {deviceConfig.isMultiple && (
                            <span className="ml-2 text-sm opacity-60 font-normal">
                                (共 {devices.length} 筆)
                            </span>
                        )}
                    </h3>
                </div>

                <LayoutComponent 
                    config={deviceConfig}
                    appConfig={appConfig}
                    devices={devices}     
                    activeDevice={activeDevice} 
                    editingDeviceData={deviceConfig.isMultiple ? props.editingDeviceData : activeDevice} 
                    
                    // 🚀 直接傳遞 Hook 獲取的邏輯，這就是標準的「容器與呈現層分離」
                    handleInputChange={(e) => handleInputChange(e, activeDevice?.id, activeDevice?.deviceType)}
                    handleAddDevice={handleAddDevice}
                    handleDeleteItem={handleDeleteItem}
                    handlePhotoUpload={(e, fieldName, deviceTitle, deviceId, label) => {
                        handlePhotoUpload(e, fieldName, activeDevice?.deviceType, deviceId, label, deviceTitle);
                    }}
                />
            </div>
        );
    };

    // 美化後的登出警示視窗 (統一風格)
    const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 bg-[#333] bg-opacity-40 flex items-center justify-center z-[60] fade-in backdrop-blur-sm">
                <div className="bg-[#fcfbf9] rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-[#d1d5db] transform scale-100 transition-all">
                    <div className="text-center mb-4">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[#e8ecef] mb-4">
                            <i className="fas fa-exclamation-circle text-[#7c909c] text-2xl"></i>
                        </div>
                        <h3 className="text-xl font-bold text-[#5e6472]">系統訊息</h3>
                        <p className="text-[#8d939e] mt-2 text-sm">{message}</p>
                    </div>
                    <div className="flex justify-center gap-4 mt-6">
                        <button onClick={onCancel} className="px-6 py-2 bg-white text-[#8d939e] border border-[#b0b8c2] hover:bg-[#f0f2f5] rounded-full transition shadow-sm font-medium">取消</button>
                        <button onClick={onConfirm} className="px-6 py-2 bg-[#7c909c] text-white rounded-full hover:bg-[#6a7f8b] shadow-md transition font-medium">確定</button>
                    </div>
                </div>
            </div>
        );
    };

    const AssetStatus = ({ purchaseDate, serviceLife }) => {
        // 1. 基本防呆
        if (!purchaseDate || !serviceLife) return null;
        
        // 2. 解析日期 (不論是 113/02/13 或 2024-02-13 都能解析)
        const pDate = parseROCDate(purchaseDate);
        const lifeYears = parseFloat(serviceLife);
        
        // 3. 檢查數值是否合法
        if (isNaN(pDate.getTime()) || isNaN(lifeYears) || lifeYears <= 0) return null;
        
        // 4. 計算到期日 (建立新物件，不改動原始 pDate)
        const expiryDate = new Date(pDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + Math.floor(lifeYears));
        
        // 處理半年 (0.5年) 的情況 (選配)
        const extraMonths = (lifeYears % 1) * 12;
        if (extraMonths > 0) {
            expiryDate.setMonth(expiryDate.getMonth() + extraMonths);
        }

        const isExpired = new Date() > expiryDate;

        return (
            <div className="flex items-center mt-2 animate-fade-in">
                { isExpired ? (
                    <span className="morandi-status-expired" title={`到期日期: ${toROCDate(expiryDate)}`}>
                        <i className="fas fa-exclamation-triangle mr-1"></i> 
                        已過年限 ({toROCDate(expiryDate)})
                    </span>
                ) : (
                    <span className="morandi-status-ok" title={`到期日期: ${toROCDate(expiryDate)}`}>
                        <i className="fas fa-check-circle mr-1"></i> 
                        年限內 (到期: {toROCDate(expiryDate)})
                    </span>
                ) }
            </div>
        );
    };

    const LoadingModal = ({ isOpen }) => {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 bg-[#5e6472]/60 flex items-center justify-center z-[5000] backdrop-blur-md">
                <div className="bg-white/90 rounded-[2.5rem] p-10 flex flex-col items-center shadow-2xl border border-white">
                    <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 border-4 border-[#e0e0e0] rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-[#7c909c] rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <h3 className="text-xl font-black text-[#5e6472] mb-1">系統處理中</h3>
                    <p className="text-[#8d939e] text-sm">請稍後，正在為您同步資料...</p>
                </div>
            </div>
        );
    };

    const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
        const [user, setUser] = useState('');
        const [pass, setPass] = useState('');
        const [error, setError] = useState('');
        const [loading, setLoading] = useState(false);

        const loginInputRef = useRef(null);

        useEffect(() => {
            // 當登入組件載入或 Modal 開啟時，自動 Focus 帳號輸入框
            if (loginInputRef.current) {
                setTimeout(() => {
                    loginInputRef.current.focus();
                }, 100); // 些微延遲確保 DOM 已完全渲染
            }
        }, [isOpen]);

        if (!isOpen) return null;

        const handleLogin = async () => {
            setLoading(true);
            setError('');

            try {
                const res = await execGas('VERIFY_LOGIN', [user, pass]);
                if (res.success) {
                    onLoginSuccess(res.token);
                    onClose();
                } else {
                    setError(res.message);
                }
            } catch (err) {
                setError("登入服務異常: " + err);
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[3000] p-4 font-莫蘭迪">
                <div className="bg-[#fcfbf9] rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 transform transition-all scale-100">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[#7c909c] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <i className="fas fa-shield-alt text-white text-2xl"></i>
                        </div>
                        <h3 className="text-2xl font-black text-[#5e6472]">管理員登入</h3>
                        <p className="text-[#8d939e] text-sm">請輸入權限密碼以進行修改</p>
                    </div>

                    <div className="space-y-4">
                        <input 
                            ref={loginInputRef}
                            type="text" 
                            placeholder="帳號" 
                            className="w-full px-5 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#7c909c] outline-none bg-white text-[#5e6472] transition-all"
                            value={user} 
                            onChange={e => setUser(e.target.value)} 
                        />
                        <input 
                            type="password" 
                            placeholder="密碼" 
                            className="w-full px-5 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#7c909c] outline-none bg-white text-[#5e6472] transition-all"
                            value={pass} 
                            onChange={e => setPass(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-[#c27d7d] text-xs rounded-xl flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </div>
                    )}

                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} className="flex-1 py-3 text-[#8d939e] font-bold hover:bg-gray-100 rounded-2xl transition-all">
                            取消
                        </button>
                        <button 
                            onClick={handleLogin} 
                            disabled={loading} 
                            className="flex-1 py-3 bg-[#7c909c] text-white rounded-2xl font-bold shadow-lg hover:bg-[#6a7f8b] disabled:opacity-50 transition-all active:scale-95"
                        >
                            {loading ? '驗證中...' : '登入系統'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const ExportModal = ({ isOpen, onClose, appConfig, handleExport }) => {
        const [selectedFields, setSelectedFields] = useState({});
        const scrollRef = useRef(null);

        // 1. 初始化勾選狀態 (每次打開都預設全選)
        useEffect(() => {
            if (isOpen && appConfig) {
                const initial = {};
                
                // (A) 基礎空間欄位
                appConfig.BASE_FIELDS.forEach(f => {
                    initial[`base_${f.key}`] = true;
                });

                // (B) 🚀 設備欄位：不再跑數量迴圈，直接對應類別
                appConfig.DEVICE_INVENTORY.forEach(dev => {
                    const fds = [...(dev.extraFields || []), ...(appConfig[dev.template] || [])];
                    fds.forEach(f => {
                        // 統一規則：{devId}_{fieldKey}
                        initial[`${dev.id}_${f.key}`] = true; 
                    });
                });
                setSelectedFields(initial);
            }
        }, [isOpen, appConfig]);

        // 2. 區塊全選/清空邏輯
        const toggleSection = (fields, status, type, devId = null) => {
            const next = { ...selectedFields };
            fields.forEach(f => { 
                // 根據類型決定 Key
                const k = (type === 'base') ? `base_${f.key}` : `${devId}_${f.key}`; 
                next[k] = status; 
            });
            setSelectedFields(next);
        };

        if (!isOpen) return null;

        // 3. 渲染單個區塊的函式 (優雅簡化版)
        const renderBlock = (title, icon, type, fields, devId = null) => {
            // 過濾不屬於該設備的欄位 (scope)
            const filtered = (type === 'device') ? fields.filter(f => !f.scope || f.scope.includes(devId)) : fields;
            
            // 依 category 分組，讓清單整齊
            const groups = filtered.reduce((acc, f) => { 
                const c = f.deviceType || '一般細項'; 
                if (!acc[c]) acc[c] = []; 
                acc[c].push(f); 
                return acc; 
            }, {});

            return (
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm mb-6 fade-in">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="font-black text-gray-700 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                                <i className={`fas ${icon} text-[#6b8e9b]`}></i>
                            </div>
                            {title}
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => toggleSection(filtered, true, type, devId)} className="text-[10px] px-3 py-1 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-400 font-bold transition">全選</button>
                            <button onClick={() => toggleSection(filtered, false, type, devId)} className="text-[10px] px-3 py-1 bg-gray-50 rounded-full hover:bg-gray-100 text-gray-400 font-bold transition">清空</button>
                        </div>
                    </div>

                    {Object.entries(groups).map(([cat, items]) => (
                        <div key={cat} className="mb-6 last:mb-0">
                            <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 ml-2">{cat}</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-1">
                                {items.map(f => {
                                    const currentKey = (type === 'base') ? `base_${f.key}` : `${devId}_${f.key}`;
                                    return (
                                        <label key={f.key} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-all select-none border border-transparent hover:border-slate-100 group">
                                            <input 
                                                type="checkbox" 
                                                checked={!!selectedFields[currentKey]} 
                                                onChange={e => setSelectedFields({...selectedFields, [currentKey]: e.target.checked})} 
                                                className="w-4 h-4 rounded-md accent-[#6b8e9b] cursor-pointer" 
                                            />
                                            <span className="text-[11px] font-bold text-gray-600 truncate group-hover:text-[#6b8e9b]">{f.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            );
        };

        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4 font-莫蘭迪">
                <div className="bg-[#fcfcfc] rounded-[3rem] w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white">
                    {/* Header */}
                    <div className="p-8 border-b bg-white/50 backdrop-blur flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black text-[#6b8e9b] tracking-tight">自定義匯出報表</h2>
                            <p className="text-[10px] text-gray-400 font-bold mt-1">勾選您想要呈現在 CSV 檔案中的欄位</p>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-gray-100 transition-colors text-gray-300"><i className="fas fa-times text-lg"></i></button>
                    </div>
                    
                    {/* Scrollable Content */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                        {/* 1. 基礎欄位 */}
                        {renderBlock('基礎空間資訊', 'fa-map-marker-alt', 'base', appConfig.BASE_FIELDS)}
                        
                        {/* 2. 動態設備迴圈 */}
                        {appConfig.DEVICE_INVENTORY.map((dev) => (
                            <div key={dev.id}>
                                {renderBlock(
                                    dev.label, 
                                    dev.icon || 'fa-laptop', 
                                    'device', 
                                    [...(dev.extraFields || []), ...(appConfig[dev.template] || [])], 
                                    dev.id
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t bg-white flex justify-end items-center gap-6">
                        <button onClick={onClose} className="font-black text-gray-300 hover:text-gray-400 transition text-sm">取消返回</button>
                        <button 
                            onClick={() => { handleExport(selectedFields); onClose(); }} 
                            className="px-12 py-4 bg-[#6b8e9b] text-white rounded-[1.5rem] font-black shadow-xl shadow-slate-200 hover:bg-[#5a7b88] hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3"
                        >
                            <i className="fas fa-file-csv text-lg"></i>
                            生成 CSV 報表
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const ImportModal = ({ isOpen, onClose, onRefresh, handleDownloadTemplate}) => {
        const { appConfig, setIsLoading, showToast, execGas } = useConfig();

        const [file, setFile] = useState(null);
        const [isImporting, setIsImporting] = useState(false);
        const [progress, setProgress] = useState(0);
        const [log, setLog] = useState([]);

        if (!isOpen) return null;

        const handleLocalFileChange = (e) => {
            const selectedFile = e.target.files[0];
            if (selectedFile) setFile(selectedFile);
        };

        // --- CSV 解析器 (維持原樣) ---
        const parseCSV = (text) => {
            const lines = text.split(/\r?\n/);
            return lines.map(line => {
                const result = [];
                let cell = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"' && line[i + 1] === '"') {
                        cell += '"'; i++;
                    } else if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(cell); cell = '';
                    } else {
                        cell += char;
                    }
                }
                result.push(cell);
                return result;
            });
        };

        // 根據 Config 動態建立「中文標題 -> 系統 Key」對照表
        const generateHeaderMap = () => {
            const map = {};
            
            // 🚀 直接抓取所有可能出現在「設備總表」的欄位
            appConfig.DEVICE_INVENTORY.forEach(dev => {
                const fields = [...(dev.extraFields || []), ...(appConfig[dev.template] || [])];
                fields.forEach(f => {
                    // 判定規則：主機直接用 key，插件用 prefix_key
                    const sysKey = (dev.id === dev.prefix) ? f.key : `${dev.prefix}_${f.key}`;
                    
                    // 對應中文標籤 (例如：輸入「電腦品牌」會對到「brand」)
                    map[f.label] = sysKey; 
                    // 對應系統 Key (例如：輸入「brand」也會對到「brand」)
                    map[sysKey] = sysKey;
                });
            });

            // 基礎核心欄位強行對應
            const core = { '財標': 'asset_tag', '財標號碼': 'asset_tag', '定位代號': 'locCode', '類型': 'category' };
            return { ...map, ...core };
        };

        const startProcess = async () => {
            if (!appConfig || !file || !adminToken) {
                showToast('請檢查系統設定、檔案或登入狀態', 'error');
                return;
            }

            setIsImporting(true);
            setLog(["🚀 開始讀取並解析 CSV 檔案..."]);
            setProgress(0);

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // 1. 處理編碼與解析 (與您原本邏輯一致)
                    const arrayBuffer = e.target.result;
                    let text = new TextDecoder('utf-8').decode(arrayBuffer);
                    if (!text.includes("locCode") && !text.includes("定位代號")) {
                        text = new TextDecoder('big5').decode(arrayBuffer);
                    }

                    const allRows = parseCSV(text);
                    if (allRows.length < 2) throw new Error("檔案內容無效或缺少標題列");

                    // 2. 標題與對照表準備
                    const headers = allRows[0].map(h => h.trim().replace(/^"|"$/g, '').replace(/[\uFEFF\u00A0]/g, ''));
                    const headerToKeyMap = generateHeaderMap();
                    
                    // 找出關鍵欄位索引 (asset_tag, locCode, category)
                    const tagIdx = headers.findIndex(h => h === 'asset_tag' || h === '財標' || h === '財標號碼');
                    const locIdx = headers.findIndex(h => h === 'locCode' || h === '定位代號');
                    const catIdx = headers.findIndex(h => h === 'category' || h === '類型');

                    const dataRows = allRows.slice(1).filter(row => row.some(cell => cell.trim() !== ""));
                    const total = dataRows.length;
                    let successCount = 0;

                    setLog(prev => [...prev, `📋 偵測到 ${total} 筆資料，準備逐一處理...`]);

                    // 3. 逐筆傳送給 GAS 的 
                    for (let i = 0; i < total; i++) {
                        const rowArr = dataRows[i];
                        
                        // --- 產生唯一的財標 (如果 CSV 沒填) ---
                        const rawTag = tagIdx !== -1 ? rowArr[tagIdx].trim() : "";
                        const finalAssetTag = rawTag || `test_${Date.now()}_${i}`;

                        // --- 建立設備資料物件 ---
                        const devicePayload = {
                            asset_tag: finalAssetTag,
                            updatedAt: new Date().toISOString()
                        };

                        // 遍歷所有欄位並對應 Key
                        headers.forEach((h, colIdx) => {
                            const sysKey = headerToKeyMap[h];
                            if (sysKey) {
                                let val = (rowArr[colIdx] || "").trim();
                                // 處理 Excel 公式殘留
                                if (val.startsWith('="') && val.endsWith('"')) val = val.substring(2, val.length - 1);
                                
                                // 顯性刪除與更新邏輯
                                if (val.toUpperCase() === "NULL") {
                                    devicePayload[sysKey] = ""; 
                                } else if (val !== "") {
                                    devicePayload[sysKey] = val;
                                }
                            }
                        });

                        // 4. 呼叫 GAS
                        const res = await execGas('saveFormData', [devicePayload, adminToken]);

                        if (res.success) {
                            successCount++;
                            setLog(prev => [...prev, `✔ [${finalAssetTag}] ${res.message}`]);
                        } else {
                            setLog(prev => [...prev, `❌ [${finalAssetTag}] 失敗: ${res.message}`]);
                        }

                        setProgress(Math.round(((i + 1) / total) * 100));
                    }

                    setLog(prev => [...prev, `🎉 匯入完成！成功：${successCount}，總計：${total}`]);
                    showToast(`匯入完成，成功更新 ${successCount} 筆設備`, 'success');

                    setTimeout(() => {
                        onRefresh();
                        onClose();
                    }, 1500);

                } catch (err) {
                    setLog(prev => [...prev, `💥 發生錯誤：${err.message}`]);
                    showToast(`匯入失敗：${err.message}`, 'error');
                } finally {
                    setIsImporting(false);
                }
            };
            reader.readAsArrayBuffer(file);
        };

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 font-莫蘭迪">
                <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-gray-100">
                    <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-xl font-black text-[#6b8e9b]">批次更新設備資料</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
                    </div>

                    <div className="p-8 space-y-6">
                        <button onClick={handleDownloadTemplate} className="w-full py-3 border-2 border-dashed border-[#6b8e9b] text-[#6b8e9b] rounded-2xl font-bold hover:bg-[#6b8e9b]/5 transition-all">
                            <i className="fas fa-file-download mr-2"></i> 下載最新匯入範本
                        </button>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-500 ml-1">選擇上傳 CSV</label>
                            <input type="file" accept=".csv" onChange={handleLocalFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#7c909c] file:text-white" />
                            {file && <p className="text-xs text-[#94a38d] ml-1">已選取：{file.name}</p>}
                        </div>

                        {isImporting && (
                            <div className="space-y-3">
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="bg-[#94a38d] h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="bg-[#1a1c1e] text-[#a3be8c] p-4 rounded-2xl text-[10px] font-mono h-40 overflow-y-auto custom-scrollbar shadow-inner">
                                    {log.map((line, idx) => <div key={idx} className="mb-1 border-l border-[#a3be8c]/30 pl-2"> {line} </div>)}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t bg-gray-50/50 flex gap-3">
                        <button onClick={onClose} disabled={isImporting} className="flex-1 py-3 font-bold text-gray-400">取消</button>
                        <button 
                            onClick={startProcess}
                            disabled={isImporting || !file}
                            className="flex-1 py-3 bg-[#94a38d] text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                        >
                            {isImporting ? '更新中...' : '開始批次更新'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const MacSegmentedInput = ({ value, onChange, name }) => {
        const inputs = useRef([]);
        // 將 AA:BB:CC:DD:EE:FF 拆分，不足則補空
        const parts = (value || '').split(':').concat(Array(6).fill('')).slice(0, 6);

        const handleChange = (e, index) => {
            let char = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (char.length <= 2) {
                const newParts = [...parts];
                newParts[index] = char;
                const combined = newParts.join(':');
                
                // 模擬一個 event 物件回傳給上層的 onChange
                onChange({ target: { name, value: combined } });

                // 自動跳下一格
                if (char.length === 2 && index < 5) {
                    inputs.current[index + 1].focus();
                }
            }
        };

        const handleKeyDown = (e, index) => {
            // 退格鍵跳回前一格
            if (e.key === 'Backspace' && !parts[index] && index > 0) {
                inputs.current[index - 1].focus();
            }
        };

        return (
            /* 增加外層容器：讓這組方塊看起來像一個整體的輸入模組 */
            <div className="flex items-center gap-1 bg-[#f8f9fa] p-1 rounded-xl border border-[#e0e4e8] w-fit shadow-sm">
                {parts.map((p, i) => (
                    <React.Fragment key={i}>
                        <input
                            ref={el => inputs.current[i] = el}
                            type="text"
                            maxLength="2"
                            value={p}
                            onChange={(e) => handleChange(e, i)}
                            onKeyDown={(e) => handleKeyDown(e, i)}
                            className="w-8 md:w-9 border border-[#b0b8c2] rounded-md py-1 text-center text-xs font-mono focus:ring-1 focus:ring-[#7c909c] outline-none bg-white transition-all"
                            placeholder="00"
                        />
                        {i < 5 && <span className="text-gray-300 text-[10px]">:</span>}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const IpSegmentedInput = ({ value, onChange, name }) => {
        const inputs = useRef([]);
        // 將 192.168.1.1 拆分，不足補空
        const parts = (value || '').split('.').concat(Array(4).fill('')).slice(0, 4);

        const handleChange = (e, index) => {
            // 只允許數字
            let val = e.target.value.replace(/[^0-9]/g, '');
            
            if (val.length <= 3) {
                const newParts = [...parts];
                newParts[index] = val;
                const combined = newParts.join('.');
                onChange({ target: { name, value: combined } });

                // 自動跳轉：打滿 3 位數且數值合法時跳下一格
                if (val.length === 3 && parseInt(val) <= 255 && index < 3) {
                    inputs.current[index + 1].focus();
                }
            }
        };

        const handleKeyDown = (e, index) => {
            // 1. 退格鍵：這格沒字就跳回前一格
            if (e.key === 'Backspace' && !parts[index] && index > 0) {
                inputs.current[index - 1].focus();
            }
            // 2. 句點鍵：按點直接跳下一格
            if (e.key === '.' || e.key === 'Decimal') {
                e.preventDefault();
                if (parts[index] !== '' && index < 3) {
                    inputs.current[index + 1].focus();
                }
            }
            // 3. 左右方向鍵跳轉
            if (e.key === 'ArrowRight' && index < 3 && e.target.selectionStart === e.target.value.length) {
                inputs.current[index + 1].focus();
            }
            if (e.key === 'ArrowLeft' && index > 0 && e.target.selectionStart === 0) {
                inputs.current[index - 1].focus();
            }
        };

        return (
            <div className="flex items-center gap-1 bg-[#f8f9fa] p-1 rounded-xl border border-[#e0e4e8] w-fit shadow-sm">
                {parts.map((p, i) => {
                    // 核心防呆：判斷是否超過 255
                    const isInvalid = parseInt(p) > 255;
                    
                    return (
                        <React.Fragment key={i}>
                            <input
                                ref={el => inputs.current[i] = el}
                                type="text"
                                maxLength="3"
                                value={p}
                                onChange={(e) => handleChange(e, i)}
                                onKeyDown={(e) => handleKeyDown(e, i)}
                                /* 樣式修正：如果 invalid 就變紅框 */
                                className={`w-10 md:w-11 border rounded-md py-1 text-center text-xs font-mono outline-none transition-all ${
                                    isInvalid 
                                    ? "border-red-500 bg-red-50 text-red-600 focus:ring-1 focus:ring-red-500" 
                                    : "border-[#b0b8c2] bg-white focus:ring-1 focus:ring-[#7c909c]"
                                }`}
                                placeholder="0"
                            />
                            {i < 3 && <span className="text-gray-300 text-[10px] font-bold">.</span>}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    const RackPortInput = ({ value, onChange, name }) => {
        // 智慧拆解：支援 "A機櫃 - 12號Port" 或 "A-12" 等格式
        // 利用正則表達式抓取數字或字母
        const match = (value || "").match(/(.*)機櫃\s*-\s*(.*)號Port/);
        const part1 = match ? match[1] : (value ? value.split('-')[0] : "");
        const part2 = match ? match[2] : (value ? value.split('-')[1] : "");

        const handleSubChange = (p1, p2) => {
            // 統一合併格式
            const combined = `${p1}機櫃 - ${p2}號Port`;
            onChange({ target: { name, value: combined } });
        };

        const subInputClass = "w-full border border-[#b0b8c2] rounded-xl px-2 py-2 text-[#5e6472] text-sm bg-[#F8F9FA] text-center focus:ring-2 focus:ring-[#7c909c] outline-none transition-all";

        return (
            <div className="flex items-center gap-2 w-full">
                <div className="flex items-center flex-1 gap-1">
                    <input 
                        type="text" 
                        value={part1} 
                        onChange={(e) => handleSubChange(e.target.value, part2)} 
                        className={subInputClass}
                        placeholder="編號"
                    />
                    <span className="text-[#7a818e] text-[10px] font-bold">機櫃</span>
                </div>
                <span className="text-[#A8A8B8] font-bold">-</span>
                <div className="flex items-center flex-1 gap-1">
                    <input 
                        type="text" 
                        value={part2} 
                        onChange={(e) => handleSubChange(part1, e.target.value)} 
                        className={subInputClass}
                        placeholder="Port"
                    />
                    <span className="text-[#7a818e] text-[10px] font-bold">Port</span>
                </div>
            </div>
        );
    };

    const Field = memo(({ 
        label, name, type = "text", value, onChange, isEditing, 
        placeholder = "", width = "w-full md:w-1/2 lg:w-1/4", 
        options = [], relatedData = {}, validation = null, uploadingFields = {} 
    }) => {
        
        // --- 1. 基礎判斷 ---
        const isImg = type === 'file' || name.toLowerCase().includes('img');
        const isThisFieldBusy = uploadingFields[name];
        const isDateField = label.includes("日期") || name.toLowerCase().includes('date');

        // --- 2. 事件處理 ---
        const handleDateBlur = (e) => {
            if (!isDateField) return;
            const formatted = formatToROC(e.target.value);
            if (formatted !== e.target.value) {
                onChange({ target: { name, value: formatted } });
            }
        };

        const handleValidation = (e) => {
            let val = e.target.value;
            const isPureNumber = ['ip', 'ram', 'number'].includes(validation);
            if (validation === 'mac') {
                val = val.toUpperCase().replace(/[^A-Z0-9:]/g, '');
            } else if (isPureNumber) {
                val = val.replace(/[^0-9]/g, '');
            }
            e.target.value = val;
            if (typeof onChange === 'function') { onChange(e); }
        };

        // --- 4. UI 布局計算 ---
        const finalWidth = (
            label.includes("備註") || isImg || width === "full" || 
            validation === "mac" || validation === "ip"
        ) ? "w-full md:w-1/2" : width; 

        // --- 5. 狀態檢查 (年限與到期偵測) --- 
        const nameParts = name.split('_');
        const prefix = nameParts.length > 1 ? nameParts.slice(0, -1).join('_') : '';

        const buyDateKey = prefix ? `${prefix}_buyDate` : 'buyDate';
        const purchaseDate = relatedData[buyDateKey] || relatedData['buyDate'];
        const serviceLife = value;

        // 🚀 修正處：改用一個清楚的變數名稱，且要用 let 宣告
        let ageAlert = null; 
        if (label.includes("年限") && purchaseDate && serviceLife) { 
            // 這裡呼叫的是計算年限的組件
            ageAlert = <AssetStatus purchaseDate={purchaseDate} serviceLife={serviceLife} />; 
        }

        // --- 6. 核心渲染邏輯 ---
        const content = !isEditing ? (
            // ====================== 唯讀模式 ======================
            type === 'file' ? (
                <div className="text-[#5e6472] text-sm py-2 px-1 min-h-[40px] flex flex-col gap-2">
                    {value && typeof value === 'string' && <AssetImagePreview url={value} />}
                    {value ? (
                        <a href={value} target="_blank" className="text-[#7c909c] flex items-center hover:underline text-xs font-bold">
                            <i className="fas fa-image mr-1"></i> 查看原圖
                        </a>
                    ) : (
                        <span className="text-[#adb5bd] text-xs italic">未上傳照片</span>
                    )}
                </div>
            ) : type === 'checkbox' ? (
                <div className="text-[#5e6472] py-2">
                    {value ? (
                        <span className="text-[#7f8f78] font-bold bg-[#f0f7ef] px-2 py-1 rounded-md border border-[#dce8db] text-xs">
                            <i className="fas fa-check-square mr-1"></i> 是
                        </span>
                    ) : (
                        <span className="text-[#8d939e] bg-[#f8f9fa] px-2 py-1 rounded-md border border-[#e9ecef] text-xs">
                            <i className="far fa-square mr-1"></i> 否
                        </span>
                    )}
                </div>
            ) : (
                <div className="read-only-field font-medium text-[#5e6472] py-1 border-b border-transparent">
                    {value ? (
                        isDateField ? toROCDate(value) : (validation === 'ram' ? `${value} G` : value)
                    ) : '-'}
                </div>
            )
        ) : (
            // ====================== 編輯模式 ======================
            <div className="relative group">
                {type === 'file' ? (
                    <div className={`relative border-2 border-dashed border-[#d1d1d6] rounded-2xl p-4 bg-white transition-all ${isThisFieldBusy ? 'opacity-50' : 'hover:bg-[#f8f8fa]'}`}>
                        {value && typeof value === 'string' && <AssetImagePreview url={value} />}
                        <input 
                            type="file" 
                            name={name} 
                            onChange={onChange} 
                            disabled={isThisFieldBusy}
                            className="w-full text-xs text-[#6B6B80] file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#D6D6E0] file:text-[#4A4A4A] hover:file:bg-[#C8C8D0] cursor-pointer" 
                            accept="image/*" 
                        />
                        {value && !isThisFieldBusy && <div className="text-[10px] text-[#94a38d] mt-2 font-bold"><i className="fas fa-check-circle"></i> 已有存檔 (重新選擇將自動覆蓋)</div>}
                    </div>
                ) : type === 'select' ? (
                    <div className="flex flex-col gap-1">
                        <select
                            name={name}
                            value={options.includes(value) ? value : (value ? 'Other' : '')}
                            onChange={onChange}
                            className="w-full border border-[#b0b8c2] rounded-xl px-2 py-2 text-[#5e6472] text-sm bg-white focus:ring-2 focus:ring-[#7c909c] outline-none"
                        >
                            <option value="">-- 請選擇 --</option>
                            {options.map(opt => (
                                <option key={opt} value={opt}>{opt === 'Other' ? '自行輸入' : opt}</option>
                            ))}
                        </select>
                        {(value === 'Other' || (value && !options.includes(value))) && (
                            <input
                                type="text"
                                name={name}
                                value={value === 'Other' ? '' : value}
                                onChange={onChange}
                                placeholder="請手動輸入名稱..."
                                className="w-full border border-[#d6c68b] rounded-xl px-3 py-2 text-sm mt-1 bg-[#fffdf6] focus:ring-2 focus:ring-[#d6c68b] outline-none"
                                autoFocus
                            />
                        )}
                    </div>
                ) : type === 'checkbox' ? (
                    <label className="flex items-center space-x-2 mt-2 cursor-pointer w-fit">
                        <input 
                            type="checkbox" 
                            name={name} 
                            checked={!!value} 
                            onChange={(e) => onChange({target: {name, value: e.target.checked}})} 
                            className="rounded text-[#7c909c] focus:ring-[#7c909c] w-5 h-5 border-[#b0b8c2]" 
                        />
                        <span className="text-sm text-[#5e6472] font-bold">是</span>
                    </label>
                ) : validation === 'mac' ? (
                    <MacSegmentedInput value={value} onChange={onChange} name={name} />
                ) : validation === 'ip' ? (
                    <IpSegmentedInput value={value} onChange={onChange} name={name} />
                ) : validation === 'rack_port' ? (
                    <RackPortInput value={value} onChange={onChange} name={name} />
                ) : validation === 'ram' ? (
                    <div className="relative flex items-center w-full">
                        <input 
                            type="text" 
                            name={name} 
                            value={value || ''} 
                            onChange={handleValidation}
                            className="w-full border border-[#b0b8c2] rounded-xl px-3 pr-10 py-2 text-sm text-[#5e6472] focus:ring-2 focus:ring-[#7c909c] outline-none bg-white transition-all"
                            placeholder="數字" 
                        />
                        <div className="absolute right-3 text-xs font-bold text-[#adb5bd] pointer-events-none border-l border-gray-200 pl-2">G</div>
                    </div>
                ) : (
                    <input 
                        type={type} 
                        name={name} 
                        value={(isDateField ? toROCDate(value) : value) || ''} 
                        onChange={validation ? handleValidation : onChange} 
                        onBlur={isDateField ? handleDateBlur : undefined}
                        className={`w-full border border-[#b0b8c2] rounded-xl px-3 py-2 text-[#5e6472] focus:outline-none focus:ring-2 focus:ring-[#7c909c] text-sm transition-all ${isDateField ? 'bg-[#fcfcff]' : 'bg-white'}`} 
                        placeholder={isDateField ? "範例：1130101" : placeholder} 
                    />
                )}

                {/* 局部儲存遮罩 */}
                {isThisFieldBusy && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl z-20 shadow-sm border border-[#E2E2EB]">
                        <i className="fas fa-circle-notch fa-spin text-[#6B6B80] text-xl"></i>
                        <span className="mt-2 text-[9px] font-black text-[#6B6B80] tracking-widest uppercase">Saving...</span>
                    </div>
                )}
            </div>
        );

        return (
            <div className={`mb-6 px-2 relative ${finalWidth} transition-all`}>
                {/* 1. 莫蘭迪標籤 */}
                <div className="flex mb-1.5">
                    <label className="morandi-field-tag">
                        {label}
                    </label>
                </div>
                
                {/* 2. 內容與遮罩容器 */}
                <div className="relative group"> {/* 這個 relative 決定遮罩的位置 */}
                    {content}

                    {/* 遮罩邏輯：只有在上傳中時才會浮現 */}
                    {isThisFieldBusy && (
                        <div className="field-loading-overlay">
                            <i className="fas fa-circle-notch fa-spin text-[#6B6B80] text-xl"></i>
                            <span className="mt-2 text-[9px] font-black text-[#6B6B80] tracking-widest uppercase">Saving...</span>
                        </div>
                    )}
                </div>

                {/* 3. 年限狀態 (如果有) */}
                {ageAlert}
            </div>
        );
    });

    const MaintenanceCard = ({ ip, computerName }) => (
        <div className="bg-[#f0f4f7] border-l-4 border-[#6b8e9b] p-4 rounded-r-lg shadow-sm h-full flex flex-col justify-center">
            <div className="flex items-center mb-2">
                <i className="fas fa-tools text-[#6b8e9b] mr-2"></i>
                <h4 className="font-bold text-[#5e6472]">快速報修資訊</h4>
            </div>
            <div className="text-sm space-y-1">
                <div className="flex justify-between">
                    <span className="text-[#8d939e]">設備名稱:</span>
                    <span className="font-bold text-[#5e6472]">{computerName || '未設定'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#8d939e]">網路 IP:</span>
                    <span className="font-bold text-[#7c909c] font-mono">{ip || '自動取得'}</span>
                </div>
            </div>
            {ip && (
                <a href={`http://${ip}`} target="_blank" className="mt-2 text-[10px] text-[#6b8e9b] hover:underline text-right">
                    <i className="fas fa-external-link-alt mr-1"></i>連線至設備
                </a>
            )}
        </div>
    );

    const SectionHeader = ({ title, icon, colorClass, lastUpdated, hasToggle, hasData, onToggle }) => (
        <div className={`w-full mb-4 mt-8 ${colorClass}`}>
            <div className="flex items-center justify-between border-b-2 pb-2 border-opacity-40" style={{borderColor: 'inherit'}}>
                <div className="flex items-center"><i className={`fas ${icon} mr-2 text-xl`}></i><h3 className="text-xl font-bold">{title}</h3></div>
                <div className="flex items-center gap-3">
                    {hasToggle && (
                        <label className="flex items-center cursor-pointer select-none text-sm text-[#5e6472] bg-white/60 px-3 py-1 rounded-full border border-[#b0b8c2]">
                            <input type="checkbox" checked={hasData} onChange={(e) => onToggle(e.target.checked)} className="mr-2 accent-[#7c909c]" />
                            配置{title}？
                        </label>
                    )}
                    {lastUpdated && <div className="text-xs text-[#8d939e] bg-white/60 px-2 py-1 rounded"><i className="far fa-clock mr-1"></i>更新：{formatTime(lastUpdated)}</div>}
                </div>
            </div>
        </div>
    );

    const SubSectionHeader = ({ title }) => {
        return (
            <div className="w-full mt-6 mb-3 pl-3 border-l-4 border-[#b0b8c2] flex justify-between items-center bg-[#f0f2f5] py-1.5 rounded-r">
                <h4 className="font-bold text-[#5e6472]">
                    {title}
                </h4>
                {/* 預留右側空間，未來可放置小圖示或功能按鈕 */}
                <div className="flex items-center pr-2">
                    <i className="fas fa-chevron-right text-[10px] text-[#b0b8c2]"></i>
                </div>
            </div>
        );
    };

    const DynamicStorageGroup = ({ 
        label,      // 從 Config 傳進來的標題，如 "儲存裝置" 或 "OPS 儲存裝置"
        name,       // 從 Config 傳進來的 Key，如 "storage" 或 "ops_storage"
        data, 
        onChange, 
        isEditing 
    }) => {
        // 1. 初始化：根據現有資料決定顯示幾組 (預設 1 組)
        const [count, setCount] = useState(1);
        
        // 定義這組動態欄位的「前綴」
        // 如果 name 是 "storage"，前綴就是 "storage_"
        // 如果 name 是 "ops_storage"，前綴就是 "ops_storage_"
        const prefix = `${name}_`;

        useEffect(() => {
            // 自動偵測並展開已有資料的組數
            if (data[`${prefix}disk3_type`] || data[`${prefix}disk3_size`]) setCount(3);
            else if (data[`${prefix}disk2_type`] || data[`${prefix}disk2_size`]) setCount(2);
        }, [data, prefix]);

        const addDisk = () => {
            if (count < 3) setCount(count + 1);
        };

        // 渲染每一組硬碟 (1~3)
        const renderDiskFields = (num) => {
            const typeName = `${prefix}disk${num}_type`;
            const sizeName = `${prefix}disk${num}_size`;
            
            return (
                <div key={num} className="flex flex-wrap -mx-2 mb-2 p-3 bg-[#f8f9fa] rounded-2xl border border-[#eef0f2] transition-all">
                    <div className="w-full text-[10px] font-bold text-[#7c909c] mb-2 px-2 tracking-widest uppercase flex items-center">
                        <i className="fas fa-hdd mr-1.5 opacity-70"></i>
                        {label} #{num} {num === 1 && <span className="text-[#d6c68b] ml-1">(系統碟)</span>}
                    </div>
                    <Field 
                        label="類型"
                        name={typeName}
                        type="select"
                        options={["SSD", "HDD", "NVMe", "M.2 SATA", "Other"]}
                        value={data[typeName]}
                        onChange={onChange}
                        width="w-full md:w-1/2"
                    />
                    <Field 
                        label="容量"
                        name={sizeName}
                        value={data[sizeName]}
                        onChange={onChange}
                        placeholder="如: 512GB"
                        width="w-full md:w-1/2"
                    />
                </div>
            );
        };

        return (
            <div className="w-full mb-8">
                {/* 標題列：使用傳入的 label */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-4 w-1 bg-[#7c909c] rounded-full"></div>
                    <h3 className="text-sm font-bold text-[#5e6472]">{label}配置</h3>
                </div>

                {/* 渲染動態組 */}
                {[...Array(count)].map((_, i) => renderDiskFields(i + 1))}

                {/* 控制按鈕：僅編輯模式顯示 */}
                {isEditing && count < 3 && (
                    <button 
                        type="button"
                        onClick={addDisk}
                        className="ml-2 mt-2 text-xs font-bold text-[#7c909c] hover:text-[#5e6472] flex items-center gap-1 transition-colors py-1 px-2 rounded-md hover:bg-[#f0f2f5]"
                    >
                        <i className="fas fa-plus-circle"></i> 新增{label} (上限 3 組)
                    </button>
                )}

                {/* 3+1 的「備註欄」：名稱也是自動產生，如 storage_note */}
                <div className="mt-4">
                    <Field 
                        label={`${label}特殊備註`}
                        name={`${prefix}note`}
                        value={data[`${prefix}note`]}
                        onChange={onChange}
                        placeholder="若有特殊配置或超量硬碟請註記於此..."
                        width="full"
                    />
                </div>
            </div>
        );
    };

    const SpaceLayoutEditor = ({ layoutData, onChange, onSave, onSelectDevice }) => {
        // =================================================================================
        // 1. 核心狀態與定義
        // =================================================================================
        const { appConfig, showToast, isEditing, editingDeviceData } = useConfig();

        const [items, setItems] = useState([]);
        const [lines, setLines] = useState([]);
        const [tool, setTool] = useState('select'); 
        const [selectedId, setSelectedId] = useState(null);
        const [hoveredId, setHoveredId] = useState(null);
        const [placingType, setPlacingType] = useState(null);
        const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
        const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);
        const [canvasScale, setCanvasScale] = useState(1);
        const [previewLine, setPreviewLine] = useState(null);
        const [hoveredName, setHoveredName] = useState(null);

        const [history, setHistory] = useState([]);
        const [future, setFuture] = useState([]);
        const [clipboard, setClipboard] = useState(null);
        const [confirmDelete, setConfirmDelete] = useState(null);

        const containerRef = useRef(null);
        const viewportRef = useRef(null);
        const draggingItem = useRef(null);
        const itemsRef = useRef([]);
        const linesRef = useRef([]);

        const GRID_SIZE = 10;

        // --- 空間部件定義 ---
        const ITEM_TYPES = {
            'table': { label: '桌子', icon: 'fa-square', color: 'bg-[#b0b8c2]', w: 80, h: 40 },
            'laptop': { label: '筆電', icon: 'fa-laptop', color: 'bg-[#8da8b3]', w: 40, h: 30 },
            'door': { label: '門', icon: 'fa-door-open', color: 'bg-[#a87d7d]', w: 40, h: 40 },
            'port': { label: '網路孔', icon: 'fa-ethernet', color: 'bg-[#849f8c]', w: 20, h: 20 },
            'box': { label: '弱電箱', icon: 'fa-box', color: 'bg-[#8f9194]', w: 30, h: 30 },
            // 🚀 修正 Switch 顏色：加入 text-white 以確保圖示在深色背景清楚可見
            'switch': { label: 'Switch', icon: 'fa-network-wired', color: 'bg-[#5e6472] text-white', w: 40, h: 20 },
            'text': { label: '文字', icon: 'fa-font', color: 'bg-slate-700 text-white border border-gray-300', w: 100, h: 30 },
            'wall': { label: '牆壁', icon: 'fa-bars', color: 'bg-black', w: 0, h: 0 }
        };

        // 輔助函式：統一屬性抓取
        const getConfig = (typeKey) => {
            const inv = appConfig?.DEVICE_INVENTORY?.find(d => d.id === typeKey);
            return inv || ITEM_TYPES[typeKey];
        };

        // =================================================================================
        // 2. 初始化與同步
        // =================================================================================
        useEffect(() => {
            let data = { items: [], lines: [] };
            try { data = typeof layoutData === 'string' ? JSON.parse(layoutData) : (layoutData || data); } catch(e) {}
            setItems((data.items || []).filter(Boolean)); 
            setLines((data.lines || []).filter(Boolean));
        }, [layoutData]);

        useEffect(() => { itemsRef.current = items; linesRef.current = lines; }, [items, lines]);

        const updateStateAndParent = useCallback((newItems, newLines) => {
            setItems(newItems); setLines(newLines);
            console.log("🚀 Calling onChange with:", { items: newItems, lines: newLines });
            if (onChange) onChange({ items: newItems, lines: newLines });
        }, [onChange]);

        // =================================================================================
        // 3. 互動核心邏輯
        // =================================================================================
        const saveHistory = useCallback(() => {
            setHistory(prev => [...prev.slice(-29), JSON.parse(JSON.stringify({ items, lines }))]);
            setFuture([]);
        }, [items, lines]);

        const undo = useCallback(() => {
            if (!isEditing || history.length === 0) return;
            const prev = history[history.length - 1];
            setFuture(f => [...f, JSON.parse(JSON.stringify({ items, lines }))]);
            setHistory(h => h.slice(0, -1));
            updateStateAndParent(prev.items, prev.lines);
            showToast("已復原", "info");
        }, [isEditing, history, items, lines, updateStateAndParent]);

        const redo = useCallback(() => {
            if (!isEditing || future.length === 0) return;
            const next = future[future.length - 1];
            setHistory(h => [...h, JSON.parse(JSON.stringify({ items, lines }))]);
            setFuture(f => f.slice(0, -1));
            updateStateAndParent(next.items, next.lines);
            showToast("已重做", "info");
        }, [isEditing, future, items, lines, updateStateAndParent]);

        // 縮放 (唯一在非編輯模式下允許的功能)
        const performZoom = (delta, clientX, clientY) => {
            const viewport = viewportRef.current;
            if (!viewport) return;
            const newScale = Math.min(Math.max(0.2, canvasScale + delta), 2);
            if (newScale === canvasScale) return;
            
            const rect = viewport.getBoundingClientRect();
            const offsetX = clientX ? clientX - rect.left : rect.width / 2;
            const offsetY = clientY ? clientY - rect.top : rect.height / 2;
            const worldX = (viewport.scrollLeft + offsetX) / canvasScale;
            const worldY = (viewport.scrollTop + offsetY) / canvasScale;

            setCanvasScale(newScale);
            requestAnimationFrame(() => {
                viewport.scrollLeft = worldX * newScale - offsetX;
                viewport.scrollTop = worldY * newScale - offsetY;
            });
        };

        const handleExportImage = async () => {
            if (!containerRef.current) return;
            const canvas = await html2canvas(containerRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true, onclone: (doc) => { doc.querySelectorAll('.glass-sticky').forEach(el => el.style.display = 'none'); const box = doc.querySelector('.grid-bg'); if (box) { box.style.transform = 'scale(1)'; box.style.boxShadow = 'none'; } } });
            const link = document.createElement('a'); link.download = `Map_${Date.now()}.png`; link.href = canvas.toDataURL('image/png'); link.click();
        };

        // =================================================================================
        // 4. 滑鼠操作邏輯
        // =================================================================================
        const getSnappedPos = (e) => {
            if (!containerRef.current) return { x: 0, y: 0 };
            const rect = containerRef.current.getBoundingClientRect();
            return {
                x: Math.round(((e.clientX - rect.left) / canvasScale) / GRID_SIZE) * GRID_SIZE,
                y: Math.round(((e.clientY - rect.top) / canvasScale) / GRID_SIZE) * GRID_SIZE
            };
        };

        const commitDelete = useCallback((type, id) => {
            if (!id) return;
            saveHistory();
            if (type === 'item') updateStateAndParent(items.filter(i => i.id !== id), lines);
            else updateStateAndParent(items, lines.filter(l => l.id !== id));
            if (selectedId === id) setSelectedId(null);
            setConfirmDelete(null);
        }, [items, lines, selectedId, saveHistory, updateStateAndParent]);

        const handleDeleteItem = (type, id, force = false) => {
            // 1. 統一的權限檢查 (守門員)
            if (!isEditing) {
                // 這裡甚至可以不顯示 Toast，直接 return，避免干擾
                return; 
            }

            // 2. 轉交給請求邏輯
            requestDelete(type, id, force);
        };

        const requestDelete = (type, id, force) => {
            if (!isEditing) return;
            if (force) commitDelete(type, id); else setConfirmDelete({ type, id });
        };

        const addItem = (typeKey) => {
            if (!isEditing) return;
            const config = getConfig(typeKey);
            if (!config) return;
            if (config.isMultiple === false && items.some(i => i.type === typeKey)) {
                showToast(`${config.label} 僅限設置一台`, 'warning'); return;
            }
            setPlacingType(typeKey); setTool('select');
            showToast(`已選取 ${config.label}`, 'info');
        };

        // 處理貼上/新增落地
        const handleCanvasClick = (e) => {
            if (!isEditing) return;
            if (placingType || (clipboard && clipboard._isPaste)) {
                saveHistory();
                const config = getConfig(placingType || clipboard.type);
                const pos = getSnappedPos(e);
                const newItem = {
                    ...(clipboard && clipboard._isPaste ? JSON.parse(JSON.stringify(clipboard)) : {}),
                    id: `item_${Date.now()}`,
                    type: placingType || clipboard.type,
                    x: pos.x - (config.w / 2),
                    y: pos.y - (config.h / 2),
                    w: config.w, h: config.h,
                    text: (placingType === 'text') ? '請輸入文字' : (clipboard?.text || ''),
                    assetTag: '', category: config.label
                };
                delete newItem._isPaste;
                updateStateAndParent([...items, newItem], lines);
                setPlacingType(null); if (clipboard) setClipboard({ ...clipboard, _isPaste: false });
                setSelectedId(newItem.id); return;
            }
            if (e.target === containerRef.current || e.target.tagName === 'svg') setSelectedId(null);
        };

        // 畫線邏輯
        const handleMouseDown = (e) => {
            if (!isEditing || (tool !== 'line' && tool !== 'wall')) return;
            const p = getSnappedPos(e);
            const type = tool;
            setPreviewLine({ x1: p.x, y1: p.y, x2: p.x, y2: p.y, type });
            const onMove = (me) => {
                const curP = getSnappedPos(me);
                setPreviewLine(prev => prev ? { ...prev, x2: curP.x, y2: curP.y } : null);
            };
            const onUp = (ue) => {
                const endP = getSnappedPos(ue);
                if (p.x !== endP.x || p.y !== endP.y) {
                    saveHistory();
                    updateStateAndParent(itemsRef.current, [...linesRef.current, { id: `line_${Date.now()}`, type, x1: p.x, y1: p.y, x2: endP.x, y2: endP.y }]);
                }
                setPreviewLine(null);
                window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
        };

        // 物件拖曳邏輯
        const handleItemMouseDown = (e, id) => {
            if (!isEditing || tool !== 'select' || placingType) return;
            e.preventDefault(); e.stopPropagation();
            setSelectedId(id);
            const item = items.find(i => i.id === id);
            if (!item) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const offsetX = (e.clientX - rect.left) / canvasScale;
            const offsetY = (e.clientY - rect.top) / canvasScale;
            const onDragMove = (me) => {
                const p = getSnappedPos(me);
                setItems(prev => prev.map(i => i.id === id ? { ...i, x: p.x - offsetX, y: p.y - offsetY } : i));
            };
            const onDragEnd = () => {
                saveHistory(); updateStateAndParent(itemsRef.current, linesRef.current);
                window.removeEventListener('mousemove', onDragMove); window.removeEventListener('mouseup', onDragEnd);
            };
            window.addEventListener('mousemove', onDragMove); window.addEventListener('mouseup', onDragEnd);
        };

        // 快捷鍵
        useEffect(() => {
            const handleKeyDown = (e) => {
                if (!isEditing || e.target.tagName === 'INPUT') return;
                if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
                if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
                
                // 🚀 修改：統一呼叫 handleDeleteItem
                if (e.key === 'Delete' && selectedId) { 
                    e.preventDefault(); 
                    // 這裡傳入 true 代表鍵盤刪除通常不跳詢問視窗 (看你習慣，也可傳 false)
                    handleDeleteItem('item', selectedId, true); 
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [isEditing, selectedId, undo, redo]); // 依賴項不需要變，因為函式定義在組件內

        // 滾輪
        useEffect(() => {
            const el = containerRef.current;
            if (!el) return;
            const handleWheel = (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); performZoom(e.deltaY > 0 ? -0.1 : 0.1); } };
            el.addEventListener('wheel', handleWheel, { passive: false });
            return () => el.removeEventListener('wheel', handleWheel);
        }, [canvasScale]);

        // =================================================================================
        // 5. 渲染 UI
        // =================================================================================
        const selectedItem = items.find(i => i.id === selectedId);
        
        // 🚀 判斷是否為資產設備 (用於財標輸入框顯示)
        const isAsset = selectedItem && appConfig?.DEVICE_INVENTORY?.some(d => d.id === selectedItem.type);

        return (
            <div className="mt-8 border-t border-[#d1d5db] pt-6 fade-in">
                <SectionHeader title="空間配置圖" icon="fa-layer-group" colorClass="text-[#5e6472] border-[#b0b8c2]" lastUpdated={editingDeviceData?.updatedAt} />
                
                <div className="glass-sticky top-[72px] -mx-4 px-4 py-3 shadow-sm z-30 flex flex-col gap-3">
                    {/* 第一列：基礎控制 (未登入時大部分禁用) */}
                    <div className="flex flex-wrap items-center gap-4" style={{paddingTop: '10px'}}>
                        <div className={`flex items-center bg-gray-100 rounded-lg p-0.5 ${!isEditing && 'opacity-50 pointer-events-none'}`}>
                            <button onClick={undo} disabled={history.length === 0} className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-all"><i className="fas fa-undo text-xs"></i></button>
                            <button onClick={redo} disabled={future.length === 0} className="p-2 hover:bg-white rounded-md disabled:opacity-30 transition-all"><i className="fas fa-redo text-xs"></i></button>
                        </div>
                        {/* 縮放控制 (唯一在非編輯模式可用的功能) */}
                        <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
                            <button onClick={() => setCanvasScale(s => Math.max(0.2, s - 0.1))} className="p-1 text-gray-500 hover:text-gray-800"><i className="fas fa-search-minus text-xs"></i></button>
                            <input type="range" min="0.2" max="2" step="0.1" value={canvasScale} onChange={(e) => setCanvasScale(parseFloat(e.target.value))} className="w-20 h-1 accent-[#7c909c]" />
                            <button onClick={() => setCanvasScale(s => Math.min(2, s + 0.1))} className="p-1 text-gray-500 hover:text-gray-800"><i className="fas fa-search-plus text-xs"></i></button>
                            <span className="text-[10px] font-mono text-gray-400 w-8">{Math.round(canvasScale * 100)}%</span>
                        </div>
                        {/* 工具切換 (未登入禁用) */}
                        <div className={`flex items-center bg-gray-100 rounded-xl p-1 gap-1 ${!isEditing && 'opacity-50 pointer-events-none'}`}>
                            {[{id:'select',icon:'fa-mouse-pointer',label:'選取'},{id:'line',icon:'fa-project-diagram',label:'網路線'},{id:'wall',icon:'fa-border-all',label:'牆壁'},{id:'eraser',icon:'fa-eraser',label:'橡皮擦'}].map(t => (
                                <button key={t.id} onClick={() => setTool(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${tool === t.id ? 'bg-white text-[#5e6472] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                    <i className={`fas ${t.icon}`}></i><span className="hidden sm:inline">{t.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex-1"></div>
                        <button onClick={handleExportImage} disabled={!isEditing} className={`px-4 py-2 bg-[#8da399] text-white rounded-xl text-xs font-bold hover:bg-[#7d9389] transition-all shadow-sm flex items-center gap-2 ${!isEditing && 'opacity-50 pointer-events-none'}`}><i className="fas fa-download"></i><span>匯出圖檔</span></button>
                    </div>

                    {/* 物件新增按鈕區 (未登入時完全禁用) */}
                    <div className={`${!isEditing ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        {/* Row 1：資產設備 */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-2">資產設備</span>
                            {appConfig?.DEVICE_INVENTORY?.map(inv => {
                                const isDisabled = inv.isMultiple === false && items.some(i => i.type === inv.id);
                                return (
                                    <button key={inv.id} disabled={isDisabled} onClick={() => addItem(inv.id)} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-2 ${inv.color || 'bg-gray-400'} ${isDisabled ? 'opacity-20 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-sm'}`}
                                        title={isDisabled ? `此空間已有一台${inv.label}` : `放置${inv.label}`}>
                                        <i className={`fas ${inv.icon}`}></i>{inv.label}
                                    </button>
                                );
                            })}
                        </div>
                        {/* Row 2：空間部件 */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-2">空間部件</span>
                            {Object.entries(ITEM_TYPES)
                                .filter(([typeKey]) => {
                                    const inInventory = appConfig?.DEVICE_INVENTORY?.some(inv => inv.id === typeKey);
                                    return typeKey !== 'wall' && !inInventory;
                                })
                                .map(([typeKey, config]) => (
                                    <button key={typeKey} onClick={() => addItem(typeKey)} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center gap-2 ${config.color || 'bg-gray-400'}`}
                                    >
                                        {/* 🚀 確保這裡有這一行 */}
                                        <i className={`fas ${config.icon}`}></i>
                                        {config.label}
                                    </button>
                                ))
                            }
                        </div>
                    </div>


                {/* 🚀 屬性面板 (常駐顯示，但未選取時禁用) */}
                    <div className={`mt-4 p-3 bg-[#f0f4f7] rounded-2xl border border-[#7c909c]/30 flex flex-wrap items-center gap-4 text-sm shadow-sm transition-all duration-300 ${(!isEditing || !selectedItem) ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                        <span className="text-[10px] font-black text-[#5e6472] uppercase tracking-wider"><i className="fas fa-sliders-h mr-1"></i> 屬性</span>
                        <div className="flex items-center gap-4 border-l border-gray-300 pl-4 ml-2">
                            <div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 font-bold">寬</span>
                                <input type="range" min="10" max="500" value={selectedItem?.w || 40} onMouseDown={saveHistory} onChange={(e) => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, w: parseInt(e.target.value) } : i))} onMouseUp={() => updateStateAndParent(items, lines)} className="w-16 h-1.5 accent-[#7c909c]" />
                            </div>
                            <div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 font-bold">高</span>
                                <input type="range" min="10" max="500" value={selectedItem?.h || 40} onMouseDown={saveHistory} onChange={(e) => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, h: parseInt(e.target.value) } : i))} onMouseUp={() => updateStateAndParent(items, lines)} className="w-16 h-1.5 accent-[#7c909c]" />
                            </div>
                        </div>
                        {/* 文字編輯 */}
                        {selectedItem?.type === 'text' && (
                            <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
                                <input type="text" value={selectedItem.text} onChange={(e) => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, text: e.target.value } : i))} onBlur={() => { saveHistory(); updateStateAndParent(items, lines); }} className="border border-[#b0b8c2] rounded-lg px-2 py-1 text-xs w-32 bg-white" placeholder="輸入文字..." />
                            </div>
                        )}
                        {/* 🚀 財標編輯 (僅資產設備顯示，部件禁用/隱藏邏輯) */}
                        {(isAsset || selectedItem?.deviceType) && (
                            <div className="flex items-center gap-2">
                                <i className="fas fa-tag text-[#7c909c] text-xs"></i>
                                <input 
                                    type="text" 
                                    value={selectedItem?.assetTag || ''} 
                                    placeholder={isAsset ? "輸入財標..." : "無財標"} 
                                    disabled={!isAsset} // 🚀 關鍵：若是部件則禁用
                                    onChange={(e) => setItems(prev => prev.map(i => i.id === selectedId ? { ...i, assetTag: e.target.value } : i))} 
                                    onBlur={() => { saveHistory(); updateStateAndParent(items, lines); }} 
                                    className={`border border-[#b0b8c2] rounded-lg px-2 py-1 text-xs w-28 ${isAsset ? 'bg-white' : 'bg-gray-200 text-gray-400'}`} 
                                />
                            </div>
                        )}
                        <div className="ml-auto">
                            <button onClick={() => handleDeleteItem('item', selectedId)} className="px-4 py-1.5 bg-white text-red-500 rounded-xl text-[10px] font-bold border border-red-100 hover:bg-red-50 transition-all shadow-sm"><i className="fas fa-trash-alt mr-1"></i>刪除項目</button>
                        </div>
                    </div>
                </div>

                {/* 畫布區域 */}
                <div 
                    ref={viewportRef} 
                    className="w-full border-2 border-[#d1d5db] rounded-[2.5rem] bg-[#f0f2f5] overflow-auto custom-scrollbar shadow-inner mt-4 glass-sticky" 
                    style={{ 
                        // 1. 設定視窗高度，例如固定為螢幕高度的 70% 或固定像素
                        height: 'calc(100vh - 390px)', 
                        
                        // 2. 當外層捲動時，這整個視窗會固定在距離頂端一段距離的位置
                        // (這個數值需根據您上方「整合型工具列」的高度微調)
                        top: '350px', 
                        
                        zIndex: 10,
                        position: 'sticky' // 確保它是黏滯定位
                    }}
                >
                    <div ref={containerRef} className="relative bg-white grid-bg shadow-2xl overflow-hidden" 
                        style={{ width: '100%', height: '1300px', transform: `scale(${canvasScale})`, transformOrigin: '0 0', paddingTop: '20px' }}
                        onMouseDown={handleMouseDown} 
                        onClick={handleCanvasClick}
                        onMouseEnter={() => setIsMouseOverCanvas(true)}
                        onMouseMove={(e) => {
                            setGhostPos(getSnappedPos(e));
                            
                            // 如果滑鼠是在畫布背景（svg或container本身）移動，則隱藏標籤
                            if (e.target === containerRef.current || e.target.tagName === 'svg') {
                                if (hoveredName) setHoveredName(null);
                            } else if (hoveredName) {
                                // 如果是在物件上移動，則更新座標
                                setHoveredName(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                            }
                        }}
                        onMouseLeave={() => {
                            setIsMouseOverCanvas(false);
                            setHoveredName(null); // 🚀 離開畫布範圍必消失
                        }}
                    >
                        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1, pointerEvents: 'all' }}>
                            {lines?.map(line => {
                                const isWall = line.type === 'wall';
                                const strokeColor = isWall ? '#5e6472' : '#ac7f7f';
                                return (
                                    <g key={line.id} onClick={(e) => tool === 'eraser' && handleDeleteItem('line', line.id, e.shiftKey)} 
                                      onMouseEnter={(e) => setHoveredName({ label: isWall?'牆壁':'網路線', x: e.clientX, y: e.clientY })} 
                                      onMouseLeave={() => setHoveredName(null)}
                                      style={{ cursor: tool === 'eraser' ? 'pointer' : 'default' }}>
                                        <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="transparent" strokeWidth="15" className="cursor-pointer" />
                                        <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={strokeColor} strokeWidth={isWall ? '6' : '2'} strokeLinecap="round" strokeDasharray={isWall ? '' : '5,5'} pointerEvents="none" />
                                    </g>
                                );
                            })}
                            {previewLine && <line x1={previewLine.x1} y1={previewLine.y1} x2={previewLine.x2} y2={previewLine.y2} stroke={previewLine.type==='wall'?'#5e6472':'#ac7f7f'} strokeWidth={previewLine.type==='wall'?'6':'2'} opacity="0.5" strokeDasharray="4" />}
                        </svg>

                        {/* 鬼影 */}
                        {isEditing && placingType && isMouseOverCanvas && (tool !== 'line' && tool !== 'wall') && (
                            <div style={{ position: 'absolute', left: ghostPos.x - (getConfig(placingType).w / 2), top: ghostPos.y - (getConfig(placingType).h / 2), width: getConfig(placingType).w, height: getConfig(placingType).h, pointerEvents: 'none', zIndex: 50 }} className={`absolute flex items-center justify-center rounded-sm border-2 border-dashed border-[#7c909c] opacity-50 ${getConfig(placingType).color}`}>
                                <i className={`fas ${getConfig(placingType).icon} ${placingType==='switch'?'text-white':'text-white/50'}`}></i>
                            </div>
                        )}

                        {/* 物件 */}
                        {items?.map(item => {
                            const config = getConfig(item.type);
                            if (!config) return null;
                            return (
                                <div key={item.id} 
                                    onMouseEnter={(e) => setHoveredName({ label: config.label, x: e.clientX, y: e.clientY })} 
                                    onMouseLeave={() => setHoveredName(null)} 
                                    onMouseDown={(e) => tool === 'eraser' ? handleDeleteItem('item', item.id, e.shiftKey) : handleItemMouseDown(e, item.id)}
                                    style={{ 
                                        position: 'absolute', left: item.x, top: item.y, width: item.w || 40, height: item.h || 40, zIndex: 10, 
                                        pointerEvents: (!isEditing || tool==='line'||tool==='wall'||placingType) ? 'none' : 'auto', // 🚀 未登入或畫線模式時穿透
                                        cursor: !isEditing ? 'default' : (tool==='eraser'?'pointer':(tool==='select'?'move':'default')), 
                                        border: selectedId===item.id?'2px solid #3b82f6':'none' 
                                    }} 
                                    className={`absolute flex items-center justify-center shadow-md rounded-sm transition-all ${config.color || 'bg-gray-400'} ${item.id===selectedId ? 'ring-4 ring-[#7c909c]/30 scale-105 shadow-xl' : ''}`}
                                >
                                    {item.type === 'text' ? <span className="text-[10px] text-center p-1 leading-tight">{item.text}</span> : <i className={`fas ${config.icon}`}></i>}
                                </div>
                            );
                        })}

                        <div 
                            className={`space-tooltip ${hoveredName ? 'visible' : ''}`}
                            style={{ 
                                left: hoveredName ? (hoveredName.x - containerRef.current.getBoundingClientRect().left) / canvasScale : 0,
                                top: hoveredName ? (hoveredName.y - containerRef.current.getBoundingClientRect().top) / canvasScale : 0,
                            }}
                        >
                            {hoveredName?.label}
                        </div>
                    </div>
                </div>

                <ConfirmModal isOpen={!!confirmDelete} message={<div><p className="mb-2 text-lg font-bold">確定要刪除嗎？</p><p className="text-[10px] text-gray-400 font-normal italic">💡 提示：按住 Shift 鍵點選橡皮擦可快速刪除。</p></div>} onConfirm={() => commitDelete(confirmDelete.type, confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />
            </div>
        );
    };

    const Item_Basic = () => {
        const { state, actions } = useDeviceManager();
        const { editingDeviceData } = useConfig();
        const { textFields, publicPC } = state.viewData;
        const { isEditing } = state;
        
        return (
            <div className="fade-in mb-8">
                <SectionHeader title="基本資訊" icon="fa-info-circle" />

                <div className="bg-white p-6 rounded-2xl border border-[#d1d5db] shadow-sm">
                    {/* 關鍵點：外層必須是 flex，且設定 items-start 確保左側欄位與右側卡片對齊 */}
                    <div className="flex flex-wrap -mx-2 items-start">
                        
                        {/* 左側：空間的基本欄位 (確保寬度設定為 md:w-3/4) */}
                        <div className="w-full md:w-3/4 flex flex-wrap">
                            {textFields.map(field => (
                                <Field 
                                    key={field.key}
                                    label={field.label || ""}
                                    name={field.key}
                                    value={editingDeviceData[field.key]}
                                    // 確保 Field 元件接收到的寬度樣式與原先一致
                                    width={field.width}
                                    type={field.type}
                                    isEditing={isEditing}
                                    onChange={(e) => actions.handleInputChange(e)}
                                />
                            ))}
                        </div>

                        {/* 右側：MaintenanceCard (固定寬度 1/4) */}
                        <div className="w-full md:w-1/4 px-2 mt-4 md:mt-0">
                            <MaintenanceCard 
                                ip={publicPC.ip} 
                                computerName={publicPC.name} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const RoomCard = ({ room, onClick }) => {
        // 這裡可以根據 data 內的資訊決定顯示風格
        return (
            <button 
                key={room.locCode} // 確保 key 是唯一的定位代號
                onClick={() => onClick(room.locCode)} 
                className="p-4 bg-white border border-gray-100 rounded-[1.5rem] hover:border-[#6b8e9b] text-left h-24 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
            >
                <div className="flex justify-between items-start w-full">
                    <span className="text-[10px] text-gray-300 font-mono group-hover:text-[#6b8e9b] transition-colors">
                        {room.locCode}
                    </span>
                    {/* 這裡可以加一個小點點，表示該空間最近有更新 */}
                    {room.updatedAt && (
                        <span className="w-2 h-2 bg-green-400 rounded-full shadow-sm"></span>
                    )}
                </div>
                
                <div className="flex flex-col">
                    <span className="text-[#5e6472] font-black text-lg leading-tight">
                        {room.roomName || '未命名空間'}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">
                        管理員: {room.inCharge || '未設定'}
                    </span>
                </div>
            </button>
        );
    };

    const HomeView = ({ 
        onLoginClick, 
        onExportClick, 
        onImportClick,
        onSearch
    }) => {
        const { appConfig } = useConfig();
        const { spaces } = useSpace();
        const { adminToken, logout } = useAuth();

        const { actions } = useConfigManager();

        const [selectedBuilding, setSelectedBuilding] = useState(null);
        const [selectedFloor, setSelectedFloor] = useState(null);
        const [searchType, setSearchType] = useState('inCharge');
        const [searchVal, setSearchVal] = useState('');

        const SEARCHABLE_FIELDS = useMemo(() => {
            const fields = {};
            
            // 確保 appConfig.schema 存在
            const schema = appConfig?.schema;
            if (!schema) return fields;

            // 遍歷 schema
            Object.values(schema).forEach(group => {
                if (group.fields) {
                    Object.entries(group.fields).forEach(([key, cfg]) => {
                        if (cfg.isFilterable) {
                            fields[key] = cfg.label;
                        }
                    });
                }
            });
            return fields;
        }, [appConfig]);

        const BUILDING_STYLE = appConfig.BUILDING_STYLE;
        const CUSTOM_SPACES = appConfig.CUSTOM_SPACES;

        const doSearch = () => {
            if (!searchVal.trim()) return;
            onSearch(searchType, searchVal);
        };

        const parseLocCode = (locCode) => {
            if (!locCode) return { building: '', floor: '' };
            // 統一轉大寫，確保 'a1' 和 'A1' 抓到一樣的顏色
            const cleanCode = String(locCode).trim().toUpperCase();
            return {
                building: cleanCode.charAt(0) || '',
                floor: cleanCode.charAt(1) || ''
            };
        };

        const getBuildingStyle = (key) => {
            // 1. 優先使用 Config 設定的樣式 (如果有)
            if (appConfig?.BUILDING_STYLE && appConfig.BUILDING_STYLE[key]) {
                return appConfig.BUILDING_STYLE[key];
            }

            // 2. 移植舊版：內建莫蘭迪備用色票 (防止 Config 讀取失敗時變灰底)
            const morandiPalette = [
                { color: 'bg-[#8a9a5b] hover:bg-[#7a8a4b]' }, // 橄欖綠
                { color: 'bg-[#708090] hover:bg-[#607080]' }, // 石板藍
                { color: 'bg-[#bc8f8f] hover:bg-[#ac7f7f]' }, // 玫瑰褐
                { color: 'bg-[#b8a091] hover:bg-[#a89081]' }, // 拿鐵色
                { color: 'bg-[#8da399] hover:bg-[#7d9389]' }, // 灰綠色
                { color: 'bg-[#9ab8ba] hover:bg-[#8aa8aa]' }, // 鴨蛋青
                { color: 'bg-[#e29578] hover:bg-[#d18467]' }  // 珊瑚粉
            ];

            // 3. 演算法：將 A, B, C 轉成數字索引，確保同一棟永遠拿到同一個顏色
            const charCode = String(key).toUpperCase().charCodeAt(0);
            const index = (charCode - 65) % morandiPalette.length; 
            
            // 防呆：確保 index 不會是負數
            const safeIndex = index >= 0 ? index : 0;
            const selected = morandiPalette[safeIndex];

            return {
                color: selected.color,
                label: `${key}棟`
            };
        };

        const availableBuildings = useMemo(() => {
            if (!spaces) return [];
            // 1. 抓取所有 locCode 的第一碼
            const buildingSet = new Set(spaces.map(s => parseLocCode(s.locCode).building));
            // 2. 轉回陣列並排序 (A, B, C...)
            return Array.from(buildingSet).sort();
        }, [spaces]);

        // 取得當前過濾空間
        const filteredSpaces = useMemo(() => {
            if (!spaces || !selectedBuilding || !selectedFloor) return [];

            console.log("當前選擇:", { selectedBuilding, selectedFloor });
            console.log("原始 spaces 第一筆資料 locCode:", spaces[0]?.locCode);

            const filtered = spaces.filter(s => {
                // 使用修正後的解析器
                const { building, floor } = parseLocCode(s.locCode || "");
                return building === selectedBuilding && floor === String(selectedFloor);
            });

            console.log("過濾出的原始資料內容:", filtered); // 🔍 檢查這裡
            return filtered;
        }, [spaces, selectedBuilding, selectedFloor]);

        // 找出全校資料中的最高樓層 (動態上限)
        const maxFloor = useMemo(() => {
            if (!spaces || spaces.length === 0) return 5; // 預設至少 5 樓
            const allFloors = spaces.map(s => {
                const f = parseInt(parseLocCode(s.locCode).floor);
                return isNaN(f) ? 0 : f;
            });
            return Math.max(...allFloors, 5); // 確保 UI 至少維持 5 個按鈕的寬度
        }, [spaces]);

        // 找出「當前棟別」實際擁有的樓層
        const activeFloorsInBuilding = useMemo(() => {
            if (!spaces || !selectedBuilding) return new Set();
            const floors = spaces
                .filter(s => parseLocCode(s.locCode).building === selectedBuilding)
                .map(s => parseLocCode(s.locCode).floor);
            return new Set(floors); // 使用 Set 方便快速比對
        }, [spaces, selectedBuilding]);
        
        console.log("SpaceProvider 提供的空間總數:", spaces?.length);
        
        return (
            <div className="max-w-6xl mx-auto p-4 md:p-8 fade-in font-莫蘭迪 text-center">
                
                {/* 1. 頂部標題 */}
                <div className="relative mb-8">
                    <h1 className="text-3xl font-black text-[#6b8e9b] mb-2">
                        新竹縣安興國小資訊設備一覽表
                    </h1>
                    <p className="text-gray-400 text-sm">請依序選擇 棟別 &gt; 樓層 &gt; 空間</p>
                    
                    {/* 管理員登入按鈕固定在右上角 */}
                    <div className="absolute top-0 right-0">
                        {adminToken ? (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#94a38d] font-bold"><i className="fas fa-check-circle"></i> 管理中</span>
                                <button onClick={logout} className="bg-[#7c909c] text-white px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md hover:bg-[#6a7f8b] transition-all">
                                    <i className="fas fa-sign-out-alt"></i> 登出
                                </button>
                            </div>
                        ) : (
                            <button onClick={onLoginClick} className="bg-[#7c909c] text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm opacity-80 hover:opacity-100 transition-all">
                                <i className="fas fa-user-lock"></i> 管理員登入
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. 棟別選擇按鈕 (橫向排列) */}
                <div className="flex justify-center flex-wrap gap-4 mb-10">
                    {availableBuildings.map(key => {
                        const style = getBuildingStyle(key);
                        const isActive = selectedBuilding === key;
                        
                        return (
                            <button
                                key={key}
                                onClick={() => { 
                                    console.log("點擊棟別：", key);
                                    setSelectedBuilding(key); setSelectedFloor(null); 
                                }}
                                className={`w-32 h-40 rounded-3xl transition-all transform hover:scale-105 flex flex-col items-center justify-center shadow-sm ${
                                    isActive 
                                        ? `${style.color} text-white ring-4 ring-[#d1d5db]` 
                                        : 'bg-white text-gray-400 border border-gray-100'
                                }`}
                            >
                                <span className="text-6xl font-black mb-2">{key}</span>
                                <span className="text-xl font-bold">{style.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 3. 校園平面圖與樓層/空間清單 (兩者擇一顯示) */}
                {!selectedBuilding ? (
                    /* 未選擇棟別時顯示平面圖 */
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-10">
                        <div className="flex items-center gap-2 mb-4 text-[#5e6472] font-bold">
                            <i className="fas fa-map-marked-alt text-[#7c909c]"></i> 校園平面圖
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-xl h-64 flex items-center justify-center text-gray-300 border border-dashed border-gray-200">
                                <img src="https://lh3.googleusercontent.com/u/0/d/1u3BOSxz76rehMjinYOXELcn2RXPyj8Xe" alt="校園平面圖-左" className="max-h-full opacity-50" />
                            </div>
                            <div className="bg-gray-50 rounded-xl h-64 flex items-center justify-center text-gray-300 border border-dashed border-gray-200">
                                <img src="https://lh3.googleusercontent.com/u/0/d/1C0vzdPZdzmMql0faJ5XsrNxNfLNU5yFV" alt="校園平面圖-右" className="max-h-full opacity-50" />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 已選擇棟別時顯示樓層與空間 */
                    <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-100 mb-10 fade-in text-left">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex gap-2">
                                {/* 產生從 1 到 maxFloor 的數列 */}
                                {Array.from({ length: maxFloor }, (_, i) => i + 1).map(f => {
                                    const floorStr = f.toString();
                                    
                                    // 💡 智慧偵測：如果該棟別的資料裡沒出現過這個樓層，就禁用
                                    const isInvalid = !activeFloorsInBuilding.has(floorStr);

                                    return (
                                        <button
                                            key={f}
                                            disabled={isInvalid}
                                            onClick={() => setSelectedFloor(floorStr)}
                                            className={`w-12 h-12 rounded-xl font-black transition-all ${
                                                isInvalid 
                                                    ? 'bg-gray-50 text-gray-200 cursor-not-allowed opacity-50' 
                                                    : (selectedFloor === floorStr 
                                                        ? 'bg-[#6b8e9b] text-white shadow-md' 
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200')
                                            }`}
                                        >
                                            {f}F
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={() => setSelectedBuilding(null)} className="text-gray-400 hover:text-gray-600 font-bold text-sm">
                                <i className="fas fa-undo mr-1"></i> 返回平面圖
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {filteredSpaces.length > 0 ? (
                                filteredSpaces.map(space => (
                                    <RoomCard 
                                        key={space.locCode} // 💡 使用 locCode 當 key
                                        room={space} 
                                        onClick={() => {
                                            console.log("🔍 [Debug] RoomCard 被點擊，空間代碼:", space.locCode);
                                            actions.handleSelectSpace(space.locCode);
                                        }} 
                                    />
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center text-gray-300 italic">
                                    {selectedFloor ? "此樓層尚無空間資料，請確認後台資料庫" : "請選擇樓層以顯示空間"}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. 快速搜尋區塊 */}
                <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10">
                    <div className="flex items-center gap-2 mb-4 text-[#5e6472] font-bold justify-center">
                        <i className="fas fa-search text-[#7c909c]"></i> 快速搜尋設備資料
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <select value={searchType} onChange={(e) => setSearchType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 outline-none">
                                {Object.entries(SEARCHABLE_FIELDS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <input type="text" placeholder="請輸入關鍵字..." value={searchVal} onChange={(e) => setSearchVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none" />
                        </div>
                        <button onClick={doSearch} className="w-full bg-[#7c909c] text-white font-bold py-2 rounded-lg hover:bg-[#6a7f8b] transition-all">
                            <i className="fas fa-search mr-2"></i> 立即搜尋
                        </button>
                        <p className="text-[10px] text-gray-400 mt-1">* 支援模糊搜尋，可輸入部分關鍵字</p>
                    </div>
                </div>

                {/* 5. 底部功能按鈕 */}
                <div className="flex flex-wrap justify-center gap-3">
                    {/* 匯入：必須有權限 */}
                    <button 
                        onClick={() => withPermission(onImportClick)} 
                        className="bg-[#7c909c] text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-[#6a7f8b] transition-all active:scale-95"
                    >
                        <i className="fas fa-file-import"></i> 批次匯入
                    </button>

                    {/* 匯出：必須有權限 */}
                    <button 
                        onClick={() => withPermission(onExportClick)} 
                        className="bg-[#94a38d] text-white px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-[#7f8f78] transition-all active:scale-95"
                    >
                        <i className="fas fa-file-export"></i> 匯出資料
                    </button>
                    <a href="https://drive.google.com/drive/folders/1knPOEjBENQB-0phqKF5EcX2tsKL58_lH" target="_blank" rel="noopener noreferrer" className="text-sm bg-[#e0e4e8] text-[#5e6472] px-3 py-1 rounded hover:bg-[#d0d6dc] transition flex items-center shadow-sm"><i className="fab fa-google-drive mr-1"></i> 設備照片資料庫</a>
                    <a href="https://docs.google.com/spreadsheets/d/1mdpDmwxG2gThT-3zDqxAHYnGaHFWTmXLH5W0U-zcks8/edit?gid=0#gid=0" target="_blank" rel="noopener noreferrer" className="text-sm bg-[#e0e4e8] text-[#5e6472] px-3 py-1 rounded hover:bg-[#d0d6dc] transition flex items-center shadow-sm"><i className="fas fa-file-excel mr-1"></i> 設備清單</a>
                </div>
            </div>
        );
    };

    const SearchResultsView = ({ results, onBack, onSelectSpace }) => {
        return (
            <div className="space-y-6 fade-in font-莫蘭迪">
                {/* 頂部標題區 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] shadow-sm border border-white/50 gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-[#6b8e9b] flex items-center gap-2">
                            <i className="fas fa-search"></i> 搜尋結果
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            找到 <span className="text-[#94a38d] font-bold">{results.length}</span> 筆符合條件的資產
                        </p>
                    </div>
                    <button 
                        onClick={onBack} 
                        className="px-8 py-3 bg-[#8d939e]/10 text-[#5e6472] rounded-2xl font-bold hover:bg-[#8d939e]/20 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-arrow-left"></i> 返回首頁
                    </button>
                </div>

                {/* 結果列表 */}
                {results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {results.map(result => (
                            <button 
                                key={result.id} 
                                onClick={() => onSelectSpace(result.id)}
                                className="p-6 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-[#6b8e9b] transition-all text-left group flex flex-col relative overflow-hidden"
                            >
                                {/* 裝飾用的背景圖示 */}
                                <div className="absolute -right-4 -bottom-4 text-gray-50 text-6xl opacity-20 group-hover:text-[#6b8e9b]/10 transition-colors">
                                    <i className="fas fa-microchip"></i>
                                </div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <span className="px-3 py-1 bg-[#7c909c]/10 text-[#6b8e9b] text-xs font-bold rounded-lg group-hover:bg-[#6b8e9b] group-hover:text-white transition-all">
                                        {result.building} 棟 {result.floor} 樓
                                    </span>
                                    <span className="text-xs font-mono text-gray-300">#{result.id}</span>
                                </div>

                                <h3 className="text-xl font-black text-[#5e6472] mb-3 group-hover:text-[#6b8e9b] transition-colors relative z-10">
                                    {result.name}
                                </h3>

                                <div className="mt-auto pt-4 border-t border-gray-50 relative z-10">
                                    <p className="text-sm text-[#94a38d] font-medium bg-[#94a38d]/5 p-3 rounded-2xl border border-[#94a38d]/10 flex items-start gap-2">
                                        <i className="fas fa-fingerprint mt-1"></i>
                                        <span>{result.matchInfo}</span>
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200">
                        <i className="fas fa-search-minus text-6xl text-gray-200 mb-4"></i>
                        <p className="text-gray-400">查無任何匹配資料，請嘗試其他關鍵字</p>
                    </div>
                )}
            </div>
        );
    };

    // ============================================================================
    //  獨立輔助組件 (放在外面以提升效能)
    // ============================================================================

    /**
    * 狀態指示燈組件
    * 負責顯示如「正常」、「維修中」的小標籤，並帶有對應的顏色。
    */
    const StatusIndicator = ({ status }) => {
        // 定義狀態與 Tailwind CSS 背景色的對應關係
        // 使用莫蘭迪色系，視覺上更柔和
        const statusMap = {
            '正常': 'bg-[#a3b899]',   // 鼠尾草綠
            '維修中': 'bg-[#d4a373]', // 駝色 (暖黃褐)
            '待報廢': 'bg-[#cc8b86]', // 乾玫瑰 (柔粉紅)
            '已報廢': 'bg-[#6b7280]'  // 灰石色
        };
        
        // 如果找不到對應狀態，預設使用灰色
        const colorClass = statusMap[status] || 'bg-gray-400';
        
        // 若無狀態文字，預設顯示「未設定」
        const displayStatus = status || '未設定';

        return (
            <span className={`px-2 py-0.5 rounded-full text-white text-[10px] font-bold ${colorClass} shadow-sm tracking-wider`}>
                {displayStatus}
            </span>
        );
    };

    // ============================================================================
    // --- 主要視圖組件 (DetailView) ---
    // ============================================================================
    const DetailView = () => {
        // 拿資料 (Reader)
        const { editingDeviceData, setEditingDeviceData, setView, appConfig, isEditing, setIsEditing, setIsLoading, isDirty, setIsDirty, showToast, execGas } = useConfig();
        const { state: deviceState } = useDeviceManager();
        const { adminToken, withPermission } = useAuth();

        // 拿功能 (Manager)
        const { actions: deviceActions } = useDeviceManager();
        const { actions: configActions } = useConfigManager();

        const { saveAllData } = usePersistence();

        const { handleSpacePhotoUpload, handleRemovePhoto } = useSpaceManager({
            editingDeviceData,
            setEditingDeviceData,
            setIsDirty,
            execGas,
            withPermission
        });

        const [mainMode, setMainMode] = useState('layout');
        const [selectedPhoto, setSelectedPhoto] = useState(null);

        // --- 設備分流邏輯 (加強防護版) ---
        const devices = deviceState.devices; 
        const currentCategoryDevices = devices.filter(d => d.deviceType === activeTab);
        
        const activeDevice = deviceActions.getActiveDevice();
        const roomTitle = `${editingDeviceData.locCode || ''} ${editingDeviceData.roomName || ''}`;

        const openLightbox = (url) => setSelectedPhoto(url);
        const closeLightbox = () => setSelectedPhoto(null);

        // --- 模式切換邏輯 ---
        const handleModeChange = (targetMode) => {
            if (mainMode === targetMode) return; 
            
            setMainMode(targetMode);

            const firstDevConfig = appConfig.DEVICE_INVENTORY.find(d => d.group === targetMode);
            if (firstDevConfig) {
                setActiveTab(firstDevConfig.id);
                
                const firstMatch = devices.find(d => d.deviceType === firstDevConfig.id);
                if (firstMatch) {
                    const targetId = firstMatch.id || firstMatch.asset_tag;
                    if (activeDeviceId !== targetId) {
                        setActiveDeviceId(targetId);
                    }
                } else {
                    setActiveDeviceId('');
                }
            }
        };

        const handleEditAction = useCallback(() => {
            // 1. 進入模式
            if (!isEditing) {
                // 進入編輯請求：這裡保持你原有的權限驗證邏輯
                deviceActions.handleToggleEditRequest(); 
                return;
            }

            // 2. 在編輯模式中
            if (isDirty) {
                configActions.handleDetailSave(false); // 有變更：觸發儲存
            } else {
                // 無變更：明確地關閉編輯模式
                setIsEditing(false); 
                setIsDirty(false); // 確保狀態同步重置
            }
        }, [isEditing, isDirty, deviceActions, configActions, setIsEditing, setIsDirty]);

        return (
            <div className="max-w-6xl mx-auto p-4 md:p-8 bg-white min-h-screen font-莫蘭迪 text-[#5e6472]">
                
                {/* 1. 頂部固定工具列 */}
                <div className="sticky top-0 bg-white/95 backdrop-blur z-30 py-4 border-b border-[#e0e0e0] shadow-sm flex justify-between items-center mb-6 -mx-4 px-4 md:-mx-8 md:px-8">
                    <button className="text-[#8d939e] hover:text-[#5e6472] font-medium transition" onClick={() => setView('home')}>
                        <i className="fas fa-arrow-left mr-2"></i> 返回列表
                    </button>
                    
                    <div className="text-center">
                        <h2 className="text-2xl font-black">{roomTitle}</h2>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${isEditing ? 'bg-red-50 text-[#c27d7d]' : 'bg-green-50 text-[#7f8f78]'}`}>
                            {isEditing ? '● 編輯模式' : '○ 檢視模式'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {adminToken && (
                            <span className="text-[10px] text-[#7c909c] font-bold hidden md:flex items-center mr-4">
                                <i className="fas fa-user-shield mr-1"></i>管理者已登入
                            </span>
                        )}

                        {isEditing && isDirty && (
                            <button 
                                onClick={deviceActions.handleDiscard}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-bold text-sm border border-red-200 shadow-sm"
                            >
                                <i className="fas fa-undo-alt"></i> 捨棄變更
                            </button>
                        )}

                        <button 
                            onClick={handleEditAction} 
                            className={`px-6 py-2 rounded-xl font-bold text-white flex items-center transition-all duration-500 transform active:scale-95 ${configActions.getButtonStyles()}`}
                        >
                            <i className={`fas mr-2 transition-transform duration-300 ${!isEditing ? 'fa-edit' : (isDirty ? 'fa-save scale-110' : 'fa-check-circle')}`}></i>
                            <span>
                                {!isEditing 
                                    ? (adminToken ? '進入編輯' : '登入編輯')
                                    : (isDirty ? '儲存變更' : '完成編輯')}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 2. 空間基礎資訊 */}
                <Item_Basic />
                
                {/* 3. 模式切換按鈕 */}
                <div className="grid grid-cols-3 gap-4 mb-8 mt-10">
                    {[
                        { id: 'layout', label: '空間配置圖', icon: 'fa-layer-group', color: '#a694a6' },
                        { id: 'space', label: '空間細項', icon: 'fa-cubes', color: '#7c909c' },
                        { id: 'seat', label: '教師座位', icon: 'fa-user-tie', color: '#94a38d' }
                    ].map(mode => (
                        <button 
                            key={mode.id} 
                            onClick={() => handleModeChange(mode.id)} 
                            className={`p-4 rounded-[2rem] shadow-sm border-2 transition-all flex flex-col items-center justify-center ${mainMode === mode.id ? 'bg-white shadow-md' : 'bg-[#fcfbf9] border-transparent hover:border-gray-200'}`}
                            style={mainMode === mode.id ? { borderColor: mode.color, borderWidth: '2px' } : {}}
                        >
                            <div className="p-3 rounded-full mb-2" style={{ backgroundColor: `${mode.color}15`, color: mode.color }}>
                                <i className={`fas ${mode.icon} text-xl`}></i>
                            </div>
                            <h3 className={`font-bold ${mainMode === mode.id ? 'text-gray-800' : 'text-gray-400'}`}>{mode.label}</h3>
                        </button>
                    ))}
                </div>

                {/* 4. 內容渲染區 */}
                <div className="min-h-[500px]">
                    {mainMode === 'layout' && (
                        <>
                            <div className="fade-in bg-white p-6 rounded-[2.5rem] border border-[#d1d5db] shadow-inner">
                                <SpaceLayoutEditor 
                                    layoutData={editingDeviceData.roomLayout} 
                                    onChange={configActions.handleLayoutChange} 
                                    onSave={configActions.handleDetailSave}          
                                    onSelectDevice={(tag) => {
                                        const dev = devices.find(d => d.asset_tag === tag);
                                        if (dev) {
                                            const isSeatMode = ['pc', 'laptop'].includes(dev.deviceType);
                                            setMainMode(isSeatMode ? 'seat' : 'space');
                                            setActiveTab(dev.deviceType);
                                            setActiveDeviceId(tag);
                                            showToast(`已跳轉至：${dev.teacher_name || dev.asset_tag}`, "info");
                                        }
                                    }}
                                />
                            </div>
                            <div className="mt-8 mb-8">
                                <h3 className="text-sm font-bold text-[#5e6472] mb-4 flex items-center">
                                    <i className="fas fa-camera mr-2"></i> 空間實體照片 ({editingDeviceData.photos?.length || 0})
                                </h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                    {editingDeviceData.photos?.map((url, idx) => (
                                        <div key={idx} className="relative group flex-shrink-0">
                                            <img 
                                                src={url} 
                                                className="w-40 h-40 object-cover rounded-2xl shadow-sm border border-gray-100 hover:scale-105 transition-transform cursor-pointer"
                                                onClick={() => openLightbox(url)}
                                            />
                                            {/* 編輯模式下的刪除鈕 */}
                                            {isEditing && (
                                                <button 
                                                    onClick={() => handleRemovePhoto(idx)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                                >
                                                    <i className="fas fa-times text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    
                                    {/* 新增照片按鈕 */}
                                    {isEditing && (
                                        <label className="w-40 h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-gray-400 hover:text-gray-600 cursor-pointer transition-colors flex-shrink-0">
                                            <i className="fas fa-plus mb-2"></i>
                                            <span className="text-xs font-bold">上傳照片</span>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => handlePhotoUpload(e, 'photos')} 
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {(mainMode === 'space' || mainMode === 'seat') && (
                        <div className="bg-[#fcfbf9] p-6 rounded-[3rem] border border-gray-100 shadow-sm">
                            
                            <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                                {appConfig.DEVICE_INVENTORY
                                    .filter(d => d.group === mainMode)
                                    .map(dev => (
                                        <button 
                                            key={dev.id} 
                                            onClick={() => { setActiveTab(dev.id); setActiveDeviceId(''); }} 
                                            className={`px-6 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap flex items-center ${activeTab === dev.id ? `${dev.color} text-white shadow-md` : 'bg-white text-gray-400 border border-gray-100'}`}
                                        >
                                            <i className={`fas ${dev.icon} mr-2`}></i>
                                            {dev.label}
                                        </button>
                                    ))}
                            </div>

                            {/* 設備渲染核心：管線完全接通 */}
                            <DeviceSectionRenderer 
                                deviceId={activeTab} 
                                devices={currentCategoryDevices}

                                handleInputChange={(e) => actions.handleInputChange(e, activeDevice?.id, activeDevice?.deviceType)}
                                handleAddDevice={actions.handleAddDevice}
                                handleDeleteItem={actions.handleDeleteItem}
                                handlePhotoUpload={(e, fieldName, deviceTitle, deviceId, label) => 
                                    actions.handlePhotoUpload(e, fieldName, activeDevice?.deviceType, deviceId, label, deviceTitle)
                                }
                            />
                        </div>
                    )}
                </div>

                {selectedPhoto && (
                    <div 
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
                        onClick={closeLightbox}
                    >
                        <button 
                            className="absolute top-6 right-6 text-white text-3xl hover:text-gray-300"
                            onClick={closeLightbox}
                        >
                            &times;
                        </button>
                        <img 
                            src={selectedPhoto} 
                            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()} // 點擊圖片本身不觸發關閉
                        />
                    </div>
                )}
                
                <div className="fixed bottom-0 left-0 w-full bg-[#fcfbf9]/90 backdrop-blur-sm py-2 text-center text-[10px] text-[#8d939e] border-t border-gray-100 z-40">
                    新竹縣安興國小資訊組 李孜攸老師 建置 2026年07月 | 新版設備資產系統 v2.0
                </div>
            </div>
        );
    };

    // 1. 網址轉換
    const getDriveDirectLink = (url) => {
        if (!url || typeof url !== 'string') return '';
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/thumbnail?sz=w300&id=${match[1]}`;
        }
        return url;
    };

    // 2. 縮圖組件
    const AssetImagePreview = ({ url }) => {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
        const directLink = getDriveDirectLink(url);
        
        return (
            <div 
                onClick={() => window.open(url, '_blank')}
                className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 shadow-sm cursor-zoom-in overflow-hidden hover:opacity-80 transition-all flex items-center justify-center"
            >
                {/* 🚀 如果縮圖載入失敗，顯示一個圖示當預覽 */}
                <img 
                    src={directLink} 
                    className="w-full h-full object-cover" 
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://www.shutterstock.com/image-vector/damaged-package-box-cardboard-broken-600nw-2520825465.jpg'; }}
                />
            </div>
        );
    };

    function App() {
        const {
            view, setView,
            appConfig, setAppConfig,
            editingDeviceData, setEditingDeviceData,
            originalDeviceData, setOriginalDeviceData,
            mainMode,
            isLoading, setIsLoading,
            isEditing, setIsEditing,
            isDirty, setIsDirty,
            showToast,
            adminToken,
            withPermission
        } = useConfig(); 
        const { 
            devices: roomDevices, // 在這裡明確定義，讓讀者知道它是來自 Device Provider
            setDevices: setRoomDevices 
        } = useDevice();
        const { setSpaces } = useSpace();
        
        const { handleExport } = useFileService();

        // --- 狀態管理 ---
        const [isExportModalOpen, setExportModalOpen] = useState(false);
        const [isImportModalOpen, setImportModalOpen] = useState(false);
        const [isLoginModalOpen, setLoginModalOpen] = useState(false);
        const [pendingAction, setPendingAction] = useState(null);

        // UI 輔助狀態
        const [searchResults, setSearchResults] = useState([]);
        
        const [activeDeviceId, setActiveDeviceId] = useState(null);
        const [activeTab, setActiveTab] = useState('pc');  

        const { configActions } = useConfigManager();
        const { 
            handleSelectSpace, 
            handleInputChange, 
            handleAddDevice, 
            handleDeleteItem 
        } = useDeviceManager();
        
        const handleGlobalSaveKey = useCallback((e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault(); // 攔截瀏覽器存檔
                
                // 只有在編輯模式下才執行
                if (view === 'detail' && isEditing) {
                    configActions.handleDetailSave(true); // 呼叫我們剛剛整合好的指揮中心
                }
            }
        }, [view, isEditing, configActions]);

        useEffect(() => {
            window.addEventListener('keydown', handleGlobalSaveKey);
            
            // 卸載時清理，避免記憶體洩漏
            return () => {
                window.removeEventListener('keydown', handleGlobalSaveKey);
            };
        }, [handleGlobalSaveKey]);

        useEffect(() => {
            if (!isDirty) return; 

            const handleUnload = (e) => {
                e.preventDefault();
                e.returnValue = '';
            };

            window.addEventListener('beforeunload', handleUnload);
            return () => window.removeEventListener('beforeunload', handleUnload);
        }, [isDirty]);

        const handleExportClick = () => {
            if (adminToken) {
                setExportModalOpen(true);
            } else {
                setPendingAction('EXPORT'); // 貼上貼紙：等下要匯出
                setLoginModalOpen(true);    // 叫出登入框
            }
        };

        const handleImportClick = () => {
            if (adminToken) {
                setImportModalOpen(true);
            } else {
                setPendingAction('IMPORT'); // 貼上貼紙：等下要匯入
                setLoginModalOpen(true);    // 叫出登入框
            }
        };

        const handleLoginSuccess = (token) => {
            setAdminToken(token);
            setLoginModalOpen(false);

            setTimeout(() => {
                if (pendingAction === 'IMPORT') {
                    setImportModalOpen(true);
                } else if (pendingAction === 'EXPORT') {
                    setExportModalOpen(true);
                } else if (pendingAction?.type === 'START_EDIT') {
                    setIsEditing(true);
                }
                setPendingAction(null); // 執行完畢後清除
            }, 150); 
        };

        const updateData = useCallback((newData, target = 'space') => {
            if (target === 'space') setEditingDeviceData(newData);
            if (target === 'devices') setRoomDevices(newData);
        }, []);

        const refreshSpaces = async () => {
            setIsLoading(true);
            try {
                const spaceList = await execGas('GET_SPACES', []);
                if (spaceList) {
                    // 存入空間專用的 State，而不是存入 DeviceList
                    setSpaces(spaceList); 
                    showToast('首頁空間資料已更新', 'success');
                }
            } catch (err) {
                showToast('更新失敗: ' + err, 'error');
            } finally {
                setIsLoading(false);
            }
        };

        // --- 智慧型 Tab 切換 (完全依賴 Config) ---
        useEffect(() => {
            if (!appConfig) return;
            
            // 當大模式 (mainMode) 切換時，自動選取該模式下的第一個設備
            // (這部分已在 DetailView 的 handleModeChange 處理，這裡處理 SubTab)
        }, [mainMode]);

        // --- 髒檢查與防跳出 ---
        useEffect(() => {
            // 🚀 當 isDirty 為 true 時，才啟動攔截
            const handleUnload = (e) => { 
                if (isDirty) { 
                    e.preventDefault(); 
                    // 雖然現代瀏覽器大多不顯示自訂文字，但這行能觸發系統警告視窗
                    e.returnValue = '您有尚未儲存的變更，確定要離開嗎？'; 
                } 
            };

            window.addEventListener('beforeunload', handleUnload);
            
            // 清理函式：當組件卸載或 isDirty 改變時，先移除舊的監聽
            return () => window.removeEventListener('beforeunload', handleUnload);
        }, [isDirty]);

        // --- 搜尋功能 ---
        const handleSearch = async (type, val) => {
            setIsLoading(true);
            try {
                const results = await execGas('SEARCH_ASSET', [type, val]);
                // 搜尋結果才應該被當作設備資料處理
                setSearchResults(results); 
                setView('search_results');
            } catch (err) {
                showToast("搜尋錯誤: " + err, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        
        // --- 輸入處理 (含 IP/MAC 遮罩) ---
        /**
        * 🚀 設備實體化保險機制
        * 如果 deviceId 存在，直接回傳；
        * 如果不存在，則建立新設備並回傳新 ID。
        */
        const ensureDeviceInstance = useCallback((deviceId, initialData = {}) => {
            // 1. 如果已經有有效 ID，直接回傳
            if (deviceId && deviceId !== 'undefined' && deviceId !== null) {
                return deviceId;
            }

            // 2. 如果沒有 ID，執行「領證」流程
            const newId = generateUniqueId();
            const newDevice = {
                id: newId,
                category: activeTab,
                asset_tag: '',
                locCode: editingDeviceData.locCode,
                status: '正常',
                ...initialData // 🚀 允許傳入初始資料（例如剛打的字或上傳狀態）
            };

            setRoomDevices(prev => [...prev, newDevice]);
            setActiveDeviceId(newId); // 切換選中指標
            
            console.log(`✨ [自動實體化] 類別: ${activeTab}, 新 ID: ${newId}`);
            return newId;
        }, [activeTab, editingDeviceData.locCode, generateUniqueId]);

        // --- 圖片上傳 (前端壓縮 + Base64) ---
        const compressImage = (file, maxWidth = 1280, quality = 0.8) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        let width = img.width, height = img.height;
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', quality));
                    };
                    img.onerror = reject;
                };
                reader.onerror = reject;
            });
        };

        const unlockField = (key) => {
            setUploadingFields(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        };

        // --- 新增、刪除與遞補 (Config Driven) ---
        // 唯一id產生器
        const generateUniqueId = () => {
            return 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        };

        // --- Render ---
        if (!appConfig) return <div className="p-10 text-center text-gray-500">系統載入中...</div>;
        return (
            <div className="font-莫蘭迪 text-slate-700 min-h-screen bg-slate-50">
                {/* 視窗 1：首頁 */}
                {view === 'home' && (
                    <HomeView
                        onLoginClick={() => setLoginModalOpen(true)} 
                        onImportClick={handleImportClick} 
                        onExportClick={handleExportClick}
                    />
                )}

                {/* 視窗 2：詳情頁 (乾淨到不可思議！) */}
                {view === 'detail' && (
                    <DetailView 
                        activeDeviceId={activeDeviceId}
                    />
                )}

                {/* 視窗 3：搜尋結果 */}
                {view === 'search_results' && (
                    <SearchResultsView 
                        results={searchResults} 
                        onBack={() => setView('home')} 
                        onSelectSpace={handleSelectSpace} 
                    />
                )}

                {/* 彈出視窗系列 */}
                <LoadingModal isOpen={isLoading} />
                <ConfirmModal 
                    isOpen={confirm.isOpen} message={confirm.message} 
                    onConfirm={() => { confirm.onConfirm(); setConfirm({ ...confirm, isOpen: false }); }} 
                    onCancel={() => setConfirm({ ...confirm, isOpen: false })} 
                />
                <ExportModal isOpen={isExportModalOpen} onClose={() => setExportModalOpen(false)} handleExport={handleExport} />
                <ImportModal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} setIsLoading={setIsLoading} onRefresh={refreshSpaces} />
                <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} />

                {IS_DEV_MODE && (
                    <div style={{
                        position: 'fixed',
                        bottom: '10px',
                        right: '10px',
                        padding: '5px 12px',
                        background: '#ac7f7f', // 莫蘭迪紅，提醒用
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        zIndex: 99999,
                        opacity: 0.8,
                        pointerEvents: 'none'
                    }}>
                        🚧 開發者模式：權限已解除
                    </div>
                )}
            </div>
        );
    }