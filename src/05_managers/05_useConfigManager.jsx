export const useConfigManager = () => {
    const { originalDeviceData, setOriginalDeviceData, triggerConfirm, showToast, isDirty, setIsDirty, appConfig, isEditing, setIsEditing, editingDeviceData, setEditingDeviceData, dynamicExcludedKeys, allDeviceList, setAllDeviceList, isLoading, setIsLoading, view, setView, uploadingFields, execGas, setLayout } = useConfig();

    const { withPermission, adminToken } = useAuth();

    const { actions: configActions } = useConfigBridge();
    const { devices: roomDevices, actions: deviceActions } = useDeviceBridge();

    const { validators, checkers, checkSpaceDirty, checkDevicesDirty, checkIsDirty } = useValidation();

    const { batchUploadRemainingFiles } = useFileService();

    const originalDeviceDataRef = useRef(originalDeviceData);
    
    // 每次 originalDeviceData 變更時同步 ref
    useEffect(() => {
        originalDeviceDataRef.current = originalDeviceData;
    }, [originalDeviceData]);

    const getters = useMemo(() => ({
        getRegistry: () => appConfig?.SCHEMA_REGISTRY || {},
        getDeviceInventory: () => appConfig?.DEVICE_INVENTORY || [],
        getTemplateFields: (templateName) => appConfig?.[templateName] || [],
        
        // 甚至可以把複雜的 Mapping 邏輯也包進來
        getMappingForType: (deviceType) => {
            const registry = appConfig?.SCHEMA_REGISTRY || {};
            return registry[deviceType]?.mapping || { KEY: 'locCode' };
        }
    }), [appConfig]);

    // 統一的髒狀態檢查機制
    const revalidate = useCallback((currentSpace, currentDevices) => {
        // 這一行現在包含了一切髒狀態判定的業務規則
        const isDirty = checkIsDirty(
            originalDeviceDataRef.current, 
            currentSpace, 
            currentDevices, 
            dynamicExcludedKeys
        );
        
        setIsDirty(isDirty);
    }, [dynamicExcludedKeys, checkIsDirty, setIsDirty]);

    // 修改後的 Manager 邏輯
    const updateFormDataAndCheckDirty = useCallback((newFormData, newDevices = null) => {
        // 1. 先決定最終資料
        const nextSpace = newFormData || editingDeviceData;
        const nextDevices = newDevices !== null ? newDevices : roomDevices;

        // 2. 透過 Bridge 更新狀態
        if (newFormData) configActions.update(nextSpace);
        if (newDevices) deviceActions.update(nextDevices);

        // 3. 重要：直接傳遞「最新的 nextSpace」給 revalidate，不要從 state 抓
        revalidate(nextSpace, nextDevices);
    }, [configActions, deviceActions, revalidate, editingDeviceData, roomDevices]);

    const handleDiscard = useCallback(() => {
        triggerConfirm("確定要還原嗎？", () => {
            configActions.reset();
            deviceActions.reset(originalDeviceData.devices); // 還原
            setIsDirty(false); // 手動重置狀態
            showToast("已還原至原始資料", "info");
        });
    }, [originalDeviceData, triggerConfirm, showToast, setIsDirty, configActions, deviceActions]);

    const saveAction = useCallback(async (payload, type, originalDeviceData) => {
        // 1. 守門員檢核
        const errorMessage = validators[type]?.(payload); // 加個 ?. 安全呼叫
        if (errorMessage) throw new Error(errorMessage);

        // 2. 偵探比對
        const isDirty = checkers[type](originalDeviceData, payload);
        if (!isDirty) return { success: true, message: "無資料變更" };

        // 3. 執行儲存
        return await execGas('SYNC_DATA', [{
            data: payload,
            type: type,
            token: userToken // 把 token 統一放到物件裡帶過去
        }]);
    }, [validators, checkers, execGas]);

    // --- 全自動儲存 (Config Driven Save) ---
    const handleSaveConfirm = useCallback(async (payload, type) => {
        setIsLoading(true);
        try {
            // A. 處理所有殘留檔案 (調用 05_useFileService)
            const dataWithFiles = await batchUploadRemainingFiles(payload);
            
            // B. 進行驗證、比對並執行儲存 (調用 05_useConfigManager)
            const result = await saveAction(dataWithFiles, type, originalDeviceData);
            
            if (result.success) {
                showToast("儲存成功", "success");
                setIsEditing(false);
            }
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setIsLoading(false);
        }
    }, [saveAction, originalDeviceData]);

    const handleDetailSave = useCallback((isSilent = false) => {
        // 1. 防呆：檢查上傳狀態
        if (Object.keys(uploadingFields).length > 0) {
            return showToast("照片還在上傳中，請稍候", "warning");
        }
        
        // 2. 防呆：防止重複點擊
        if (isLoading) return; 

        // 3. 觸發儲存
        isSilent 
            ? handleSaveConfirm() 
            : triggerConfirm("確定儲存變更的資料？", () => handleSaveConfirm());
            
    }, [uploadingFields, handleSaveConfirm, triggerConfirm, showToast, isLoading]);

    const getButtonStyles = useCallback(() => {
        if (!isEditing) return 'bg-[#7c909c] hover:bg-[#6a7f8b] shadow-lg';
        if (isDirty) return 'bg-[#94a38d] hover:bg-[#7f8f78] shadow-[#94a38d]/40 is-glow-morandi-green';
        return 'bg-[#adb5bd] hover:bg-[#99a3ad] shadow-none opacity-80';
    }, [isEditing, isDirty]);

    const handleLayoutChange = useCallback((newLayout) => {
        console.log("Manager: Updating with", newLayout); // 看這裡有沒有收到資料
        
        // 這裡是你原本的寫法：
        const updatedData = { ...editingDeviceData, roomLayout: newLayout }; 
        updateFormDataAndCheckDirty(updatedData); // 這裡往下傳
    }, [editingDeviceData, updateFormDataAndCheckDirty]);

    const handleInputChange = useCallback((e, targetId = null, category = null) => {
        withPermission(() => {
            if (!e?.target) return;
            const { name: key, value } = e.target;
            const finalValue = getCleanValue(value, key);

            if (targetId) {
                // 使用整合後的單一更新
                deviceActions.updateField(targetId, key, finalValue, (nextDevices) => {
                    revalidate(editingDeviceData, nextDevices);
                });
            } else {
                // 更新空間表單，若有需要也可以帶入 Callback
                const nextFormData = { ...editingDeviceData, [key]: finalValue };
                configActions.update(nextFormData);
                revalidate(nextFormData, roomDevices);
            }
        });
    }, [withPermission, editingDeviceData, roomDevices, revalidate, configActions, deviceActions]);

    return {
        actions: { 
            handleDiscard, handleDetailSave, getButtonStyles, updateFormDataAndCheckDirty, handleLayoutChange, handleInputChange, handleSelectSpace, saveAction, revalidate
        },
        getters
    };
};