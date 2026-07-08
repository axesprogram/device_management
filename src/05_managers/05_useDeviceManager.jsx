export const useDeviceManager = () => {
    const { 
        editingDeviceData, setEditingDeviceData, 
        showToast, setToast,
        appConfig, setAppConfig,
        isEditing, setIsEditing,
        originalDeviceData, setOriginalDeviceData,
        view, setView
    } = useConfig();
    const {
        activeTab, 
        activeDeviceId, setActiveDeviceId
    } = useDevice();
    const { 
        adminToken, 
        withPermission,
        pendingAction, setPendingAction, 
        isLoginModalOpen, setLoginModalOpen 
    } = useAuth(); // 包含編輯狀態邏輯

    const { actions: deviceActions, selectors } = useDeviceBridge();
    const { actions: configActions, getters: configGetters } = useConfigBridge();

    const { uploadPhotoService } = useFileService();

    const handleDeleteItem = useCallback((deviceId, triggerConfirm) => {
        withPermission(() => {
            triggerConfirm("確認刪除嗎？", () => {
                deviceActions.removeDevice(deviceId); // 具體執行丟給 Bridge
                showToast("已移除，請按「儲存」同步雲端", "info");
            });
        });
    }, [withPermission, deviceActions]);

    const activeDevice = useMemo(() => selectors.getActiveDevice(activeTab, activeDeviceId), [activeTab, activeDeviceId]);

    const handleToggleEditRequest = useCallback(() => {
        if (adminToken) {
            setIsEditing(!isEditing);
        } else {
            setPendingAction({ type: 'START_EDIT' });
            setLoginModalOpen(true);
        }
    }, [adminToken, isEditing, setIsEditing, setPendingAction, setLoginModalOpen]);

    // 新增裝置
    const handleAddDevice = useCallback((category) => {
        withPermission(() => {
            const newId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const newDevice = { id: newId, asset_tag: '', category: activeTab, status: '正常' };
            deviceActions.add(newDevice);
            setActiveDeviceId(newId);
            showToast(`已新增一筆 ${activeTab} 資料`, 'success');
        });
    }, [withPermission, showToast, activeTab]);

    // 上傳照片
    const handlePhotoUpload = useCallback(async (e, fieldName, category, deviceId, label, title) => {
        withPermission(async () => {
            const file = e.target.files[0];
            if (!file) return;

            showToast(`開始處理 [${label}]...`, "info");

            try {
                // 1. 呼叫服務層
                const result = await uploadPhotoService(file, { 
                    uniqueId: deviceId, 
                    deviceType: title || category, 
                    photoType: label 
                });

                // 2. 透過 Bridge 更新狀態 (不直接 setDevices)
                if (result?.success) {
                    deviceActions.updateField(deviceId, fieldName, result.url);
                    showToast(`[${label}] 上傳成功`, "success");
                }
            } catch (error) {
                showToast(`上傳失敗：${error.message}`, "error");
            }
        });
    }, [withPermission, deviceActions, uploadPhotoService]);

    return useMemo(() => ({
        state: { activeDevice },
        actions: { 
            handleDetailSave: configActions.handleDetailSave,
            handleToggleEditRequest,
            handleDeleteItem,
            handlePhotoUpload,
            getActiveDevice: () => selectors.getActiveDevice(activeTab, activeDeviceId),
            handleAddDevice
        }
    }), [editingDeviceData, activeDeviceId, activeTab]);
};