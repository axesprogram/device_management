export const useFileService = () => {
    const { appConfig, allDeviceList, uploadingFields, setUploadingFields } = useConfig();
    
    const handleExport = (selectedFields) => {
        // 🚀 1. 防呆檢查
        if (!allDeviceList || allDeviceList.length === 0) return showToast('無資料可匯出', 'error');
        if (!appConfig) return;

        const finalKeys = [];
        const finalNames = [];

        // --- 2. 基礎空間欄位 (如：locCode, roomName) ---
        appConfig.BASE_FIELDS.forEach(f => {
            // 這裡對應 ExportModal 傳進來的 checkbox 狀態
            if (selectedFields[`base_${f.key}`]) {
                finalKeys.push(f.key);
                finalNames.push(f.label);
            }
        });

        // --- 3. 設備詳細欄位 (核心修正：移除 dev.max 迴圈) ---
        appConfig.DEVICE_INVENTORY.forEach(dev => {
            const templateFields = appConfig[dev.template] || [];
            const allFields = [...(dev.extraFields || []), ...templateFields];

            // 過濾掉不屬於該設備類別的欄位
            const filteredFields = allFields.filter(f => 
                !f.scope || f.scope.includes(dev.id)
            );

            // 🚀 關鍵：現在不再需要 i = 1 到 max 的迴圈
            // 匯出時，每一行就是一台設備，欄位名現在是乾淨的，例如 'brand', 'asset_tag'
            filteredFields.forEach(f => {
                // 這裡對應 ExportModal 的選取 key
                if (selectedFields[`${dev.id}_${f.key}`]) {
                    finalKeys.push(f.key); // 直接存 'brand'，不再拼 prefix
                    finalNames.push(`${dev.label}_${f.label}`); // 標題改為 '座位電腦_品牌'
                }
            });
        });

        // --- 4. 執行匯出 (CSV/Excel 產製) ---
        try {
            const rows = allDeviceList.map(data => {
                return finalKeys.map(key => data[key] || "");
            });

            const csvContent = [
                finalNames.join(","),
                ...rows.map(row => row.join(","))
            ].join("\n");

            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `安興國小資訊資產匯出_${new Date().toLocaleDateString()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast("匯出成功！", "success");
        } catch (e) {
            showToast("匯出失敗：" + e.message, "error");
        }
    };
    
    const handleDownloadTemplate = async () => {
        if (!appConfig) return showToast('系統設定尚未載入', 'error');
        setIsLoading(true);
        
        // 1. 取得設備總表的名稱
        const sheetName = appConfig.LATEST_SHEET_NAME || "設備總表";

        try {
            const res = await execGas('GET_HEADERS', [sheetName]);
            
            setIsLoading(false);
            
            if (res.success && res.headers) {
                // 2. 智慧型翻譯工具 (與原本邏輯相同)
                const getLabel = (rawKey) => {
                    const base = appConfig.BASE_FIELDS.find(f => f.key === rawKey);
                    if (base) return base.label;

                    for (const dev of appConfig.DEVICE_INVENTORY) {
                        const allFields = [...(dev.extraFields || []), ...(appConfig[dev.template] || [])];
                        const found = allFields.find(f => f.key === rawKey);
                        if (found) return `${dev.label}_${found.label}`;
                    }
                    
                    const commonMap = { 'locCode': '定位代號', 'status': '設備狀態', 'category': '設備類別' };
                    return commonMap[rawKey] || rawKey;
                };

                // 3. 產生 CSV (與原本邏輯相同)
                const chineseHeaders = res.headers.map(header => getLabel(header));
                const csvContent = "\ufeff" + chineseHeaders.join(',');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `安興國小設備匯入範本_${new Date().toLocaleDateString()}.csv`;
                link.click();
                showToast('範本下載成功，請依欄位填寫', 'success');
            }
        } catch (err) {
            setIsLoading(false);
            // 🚀 統一處理錯誤
            showToast('讀取表頭失敗：' + (err.message || err), 'error');
        }
    };

    // 設定某個欄位為上傳中
    const setBusy = (name, isBusy) => {
        setUploadingFields(prev => ({ ...prev, [name]: isBusy }));
    };

    // 這個函式專門用來檢查有無殘留的 File
    const batchUploadRemainingFiles = useCallback(async (data) => {
        const updated = { ...data };
    
        const mapping = getters.getMappingForType(updated.deviceType);
        const keyField = mapping.KEY;
        
        const idValue = updated.id;
        const locValue = updated[keyField]; 

        for (const key in updated) {
            if (updated[key] instanceof File) {
                try {
                    const base64 = await convertFileToBase64(updated[key]);
                    
                    const res = await execGas('UPLOAD_DEVICE_PHOTO', [base64, { 
                        [keyField]: locValue,
                        uniqueId: idValue,
                        photoType: key 
                    }]);
                    
                    if (res?.success) {
                        updated[key] = res.url;
                    }
                } catch (err) {
                    console.error(`自動上傳殘留檔案失敗 [${key}]:`, err);
                    throw err; 
                }
            }
        }
        return updated;
        
        // 依賴appConfig，確保配置變更時此函式會跟著更新
    }, [appConfig]);

    const uploadPhotoService = async (file, params) => {
        try {
            const compressedBase64 = await compressImage(file);
            
            return await execGas('UPLOAD_DEVICE_PHOTO', [compressedBase64, params]);
        } catch (error) {
            console.error("File Service Error:", error);
            throw error; // 把錯誤拋出，讓 Manager 去處理 Toast 顯示
        }
    };

    return {
        handleExport,
        handleDownloadTemplate,
        setBusy,
        batchUploadRemainingFiles,
        uploadPhotoService
    }
}